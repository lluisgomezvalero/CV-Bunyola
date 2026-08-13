(function(){
'use strict';

const FLAG='__volleyMatchConvocation20260813';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let activeEventId=null;
let saving=false;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function db(){try{return window.VolleySupabase?.getClient?.()||null;}catch(_){return null;}}
function isCoach(){try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}catch(_){return false;}}
function toast(message,type){try{if(typeof window.showToast==='function')window.showToast(message,type);}catch(_){}}
function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function normalize(value){return String(value??'').trim();}
function aliasesOfEvent(e){return [e?.id,e?.supabaseId,e?.supabase_id,e?.legacyId,e?.legacy_id].filter(Boolean).map(normalize);}
function aliasesOfPlayer(p){return [p?.id,p?.supabaseId,p?.supabase_id,p?.legacyId,p?.legacy_id,p?.profile_id].filter(Boolean).map(normalize);}
function eventById(id){const s=state();const sid=normalize(id);return(s?.events||[]).find(e=>aliasesOfEvent(e).includes(sid))||null;}
function stablePlayerKey(p){return normalize(p?.legacyId||p?.legacy_id||p?.id||p?.supabaseId||p?.supabase_id);}
function convocationFromEvent(evt){
  const direct=Array.isArray(evt?.convocationPlayerIds)?evt.convocationPlayerIds:null;
  const raw=Array.isArray(evt?.rawPayload?.convocationPlayerIds)?evt.rawPayload.convocationPlayerIds:null;
  const values=direct||raw||[];
  return [...new Set(values.map(normalize).filter(Boolean))];
}
function hasConvocation(evt){
  if(!evt)return false;
  return Object.prototype.hasOwnProperty.call(evt,'convocationPlayerIds')||Object.prototype.hasOwnProperty.call(evt.rawPayload||{},'convocationPlayerIds');
}
function playerIsSelected(player,selected){
  const set=new Set((selected||[]).map(normalize));
  return aliasesOfPlayer(player).some(id=>set.has(id))||set.has(stablePlayerKey(player));
}
function selectedPlayers(evt){
  const s=state();const selected=convocationFromEvent(evt);
  return(s?.players||[]).filter(p=>playerIsSelected(p,selected));
}
function currentPlayer(){
  const s=state();if(!s)return null;
  let user=null;try{user=typeof window.getCurrentUser==='function'?window.getCurrentUser():null;}catch(_){}
  const ids=[user?.playerId,user?.player_id,user?.supabasePlayerId,user?.profileId,user?.id].filter(Boolean).map(normalize);
  return(s.players||[]).find(p=>aliasesOfPlayer(p).some(id=>ids.includes(id)))||null;
}
async function resolveEventUuid(evt){
  if(!evt)return null;
  const candidates=[evt.id,evt.supabaseId,evt.supabase_id].map(normalize).filter(Boolean);
  const direct=candidates.find(id=>UUID.test(id));
  if(direct)return direct;
  const c=db();if(!c)return null;
  const legacy=normalize(evt.legacyId||evt.legacy_id||evt.id);
  if(!legacy)return null;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',legacy).maybeSingle();
  if(error)throw error;
  return data?.id||null;
}

function ensureModal(){
  let modal=document.getElementById('modal-match-convocation');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='modal-match-convocation';
  modal.className='modal-backdrop match-convocation-modal';
  modal.innerHTML=`<div class="modal-content match-convocation-dialog" role="dialog" aria-modal="true" aria-labelledby="match-convocation-title">
    <div class="modal-header match-convocation-head">
      <div><span class="match-convocation-kicker">Partido</span><h3 id="match-convocation-title"><i data-lucide="users-round"></i> Convocatoria</h3></div>
      <button type="button" class="modal-close" data-convocation-close aria-label="Cerrar">&times;</button>
    </div>
    <div class="modal-body match-convocation-body">
      <div class="match-convocation-meta" id="match-convocation-meta"></div>
      <div class="match-convocation-tools">
        <button type="button" class="btn btn-outline btn-sm" data-convocation-available><i data-lucide="user-check"></i> Seleccionar disponibles</button>
        <button type="button" class="btn btn-outline btn-sm" data-convocation-clear><i data-lucide="eraser"></i> Limpiar</button>
        <span id="match-convocation-count">0 seleccionadas</span>
      </div>
      <div id="match-convocation-list" class="match-convocation-list"></div>
      <div class="match-convocation-actions">
        <button type="button" class="btn btn-outline" data-convocation-close>Cancelar</button>
        <button type="button" class="btn btn-primary" data-convocation-save><i data-lucide="save"></i> Guardar convocatoria</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-convocation-close]'))closeConvocationModal();});
  modal.querySelector('[data-convocation-available]')?.addEventListener('click',()=>{
    modal.querySelectorAll('input[data-convocation-player]').forEach(input=>{
      const player=(state()?.players||[]).find(p=>stablePlayerKey(p)===input.value);
      input.checked=normalize(player?.status).toLowerCase()!=='lesionada';
      input.closest('.match-convocation-player')?.classList.toggle('is-selected',input.checked);
    });
    refreshCount();
  });
  modal.querySelector('[data-convocation-clear]')?.addEventListener('click',()=>{
    modal.querySelectorAll('input[data-convocation-player]').forEach(input=>{input.checked=false;input.closest('.match-convocation-player')?.classList.remove('is-selected');});
    refreshCount();
  });
  modal.querySelector('[data-convocation-save]')?.addEventListener('click',()=>void saveConvocation());
  return modal;
}
function refreshCount(){
  const modal=document.getElementById('modal-match-convocation');if(!modal)return;
  const count=modal.querySelectorAll('input[data-convocation-player]:checked').length;
  const total=modal.querySelectorAll('input[data-convocation-player]').length;
  const label=modal.querySelector('#match-convocation-count');
  if(label)label.textContent=`${count}/${total} seleccionadas`;
}
function openConvocationModal(eventId){
  if(!isCoach())return;
  const evt=eventById(eventId);
  if(!evt||!MATCH_TYPES.has(evt.type))return toast('No se ha encontrado el partido.','error');
  activeEventId=evt.id;
  const modal=ensureModal();
  const players=state()?.players||[];
  const selected=convocationFromEvent(evt);
  const title=modal.querySelector('#match-convocation-title');
  if(title)title.innerHTML=`<i data-lucide="users-round"></i> Convocatoria · ${escapeHtml(evt.title||'Partido')}`;
  const meta=modal.querySelector('#match-convocation-meta');
  if(meta)meta.innerHTML=`<span><i data-lucide="calendar-days"></i>${escapeHtml(evt.date||'Fecha pendiente')}</span><span><i data-lucide="clock-3"></i>${escapeHtml(evt.time||'Hora pendiente')}</span>${evt.location?`<span><i data-lucide="map-pin"></i>${escapeHtml(evt.location)}</span>`:''}`;
  const list=modal.querySelector('#match-convocation-list');
  if(list)list.innerHTML=players.map(player=>{
    const key=stablePlayerKey(player);
    const checked=playerIsSelected(player,selected);
    const injured=normalize(player.status).toLowerCase()==='lesionada';
    return `<label class="match-convocation-player ${checked?'is-selected':''}">
      <input type="checkbox" data-convocation-player value="${escapeHtml(key)}" ${checked?'checked':''}>
      <img src="${escapeHtml(player.photo||player.avatar||'assets/default_avatar.svg')}" alt="">
      <span><strong>#${escapeHtml(player.number??'–')} ${escapeHtml(player.name||'Jugadora')}</strong><small>${escapeHtml(player.position||'')}${injured?' · Lesionada':''}</small></span>
      <i data-lucide="check-circle-2" class="match-convocation-check"></i>
    </label>`;
  }).join('');
  list?.querySelectorAll('input[data-convocation-player]').forEach(input=>input.addEventListener('change',()=>{
    input.closest('.match-convocation-player')?.classList.toggle('is-selected',input.checked);refreshCount();
  }));
  refreshCount();
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  try{window.lucide?.createIcons?.();}catch(_){}
}
function closeConvocationModal(){
  const modal=document.getElementById('modal-match-convocation');
  modal?.classList.remove('active');
  if(!document.querySelector('.modal-backdrop.active'))document.body.classList.remove('modal-open');
  activeEventId=null;
}
async function saveConvocation(){
  if(saving)return;
  const evt=eventById(activeEventId);if(!evt)return toast('No se ha encontrado el partido.','error');
  const modal=document.getElementById('modal-match-convocation');if(!modal)return;
  const selected=[...modal.querySelectorAll('input[data-convocation-player]:checked')].map(input=>normalize(input.value)).filter(Boolean);
  const c=db();if(!c)return toast('Supabase no está disponible. No se ha guardado la convocatoria.','error');
  const button=modal.querySelector('[data-convocation-save]');
  const original=button?.innerHTML;
  saving=true;if(button){button.disabled=true;button.textContent='Guardando…';}
  try{
    const eventUuid=await resolveEventUuid(evt);
    if(!eventUuid)throw new Error('No se encuentra este partido en Supabase.');
    const {data:remote,error:readError}=await c.from('events').select('payload').eq('id',eventUuid).maybeSingle();
    if(readError)throw readError;
    const now=new Date().toISOString();
    const payload={...(remote?.payload||evt.rawPayload||{}),convocationPlayerIds:selected,convocationUpdatedAt:now};
    const {data:updated,error:updateError}=await c.from('events').update({payload}).eq('id',eventUuid).select('id,payload').maybeSingle();
    if(updateError)throw updateError;
    if(!updated?.id)throw new Error('Supabase no confirmó el guardado de la convocatoria.');

    evt.convocationPlayerIds=[...selected];
    evt.convocationUpdatedAt=now;
    evt.rawPayload={...(evt.rawPayload||{}),...payload};
    try{if(typeof saveAppData==='function')saveAppData(state());}catch(_){}
    closeConvocationModal();
    try{if(typeof window.openEventDetailModal==='function')window.openEventDetailModal(evt.id);}catch(_){}
    toast(`Convocatoria guardada · ${selected.length} jugadora${selected.length===1?'':'s'}.`);
  }catch(error){
    console.error('[MatchConvocation] save',error);
    toast(error?.message||'No se pudo guardar la convocatoria.','error');
  }finally{
    saving=false;
    if(button){button.disabled=false;button.innerHTML=original||'<i data-lucide="save"></i> Guardar convocatoria';}
    try{window.lucide?.createIcons?.();}catch(_){}
  }
}

function renderCoachSummary(evt){
  const called=selectedPlayers(evt);
  const published=hasConvocation(evt);
  const names=called.map(p=>escapeHtml(p.name||'Jugadora'));
  return `<section class="match-convocation-card coach" data-match-convocation-card>
    <div class="match-convocation-card-head"><span class="match-convocation-icon"><i data-lucide="users-round"></i></span><div><small>Convocatoria</small><strong>${published?`${called.length} jugadora${called.length===1?'':'s'} convocada${called.length===1?'':'s'}`:'Todavía no creada'}</strong></div></div>
    ${published?`<p>${names.length?names.join(' · '):'No hay jugadoras seleccionadas.'}</p>`:'<p>Selecciona las jugadoras que estarán convocadas para este partido.</p>'}
    <button type="button" class="btn btn-primary btn-sm" data-open-convocation="${escapeHtml(evt.id)}"><i data-lucide="clipboard-list"></i> ${published?'Editar convocatoria':'Crear convocatoria'}</button>
  </section>`;
}
function renderPlayerSummary(evt){
  const published=hasConvocation(evt);
  if(!published)return `<section class="match-convocation-card player pending" data-match-convocation-card><div class="match-convocation-card-head"><span class="match-convocation-icon"><i data-lucide="clock-3"></i></span><div><small>Convocatoria</small><strong>Pendiente de publicar</strong></div></div><p>El cuerpo técnico todavía no ha publicado la convocatoria de este partido.</p></section>`;
  const player=currentPlayer();
  const selected=convocationFromEvent(evt);
  const called=player?playerIsSelected(player,selected):false;
  const names=selectedPlayers(evt).map(p=>escapeHtml(p.name||'Jugadora'));
  return `<section class="match-convocation-card player ${called?'called':'not-called'}" data-match-convocation-card>
    <div class="match-convocation-card-head"><span class="match-convocation-icon"><i data-lucide="${called?'badge-check':'circle-minus'}"></i></span><div><small>Convocatoria</small><strong>${called?'Estás convocada':'No estás convocada'}</strong></div></div>
    <p>${names.length?`Convocadas: ${names.join(' · ')}`:'No hay jugadoras seleccionadas en esta convocatoria.'}</p>
  </section>`;
}
function enhanceMatchDetail(eventId){
  const evt=eventById(eventId);if(!evt||!MATCH_TYPES.has(evt.type))return;
  const modal=document.getElementById('modal-event-detail');
  const body=document.getElementById('event-detail-body');
  if(!modal?.classList.contains('active')||!body)return;
  body.querySelectorAll('[data-match-convocation-card]').forEach(node=>node.remove());
  body.querySelectorAll('[data-match-rollcall]').forEach(node=>node.remove());
  const buttons=[...body.querySelectorAll('button')];
  const edit=buttons.find(b=>String(b.textContent||'').toLowerCase().includes('editar evento'));
  const actions=edit?.parentElement;
  const html=isCoach()?renderCoachSummary(evt):renderPlayerSummary(evt);
  if(actions)actions.insertAdjacentHTML('beforebegin',html);
  else body.insertAdjacentHTML('beforeend',html);
  body.querySelector('[data-open-convocation]')?.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();openConvocationModal(evt.id);
  });
  try{window.lucide?.createIcons?.();}catch(_){}
}

function installWrappers(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(typeof window.openEventDetailModal==='function'&&!window.openEventDetailModal.__matchConvocationWrapped){
      const base=window.openEventDetailModal;
      const wrapped=function(eventId){
        const result=base.apply(this,arguments);
        requestAnimationFrame(()=>enhanceMatchDetail(eventId));
        setTimeout(()=>enhanceMatchDetail(eventId),90);
        return result;
      };
      wrapped.__matchConvocationWrapped=true;
      window.openEventDetailModal=wrapped;
    }
    if(window.openEventDetailModal?.__matchConvocationWrapped||attempts>80)clearInterval(timer);
  },100);
}
function injectStyles(){
  if(document.getElementById('volley-match-convocation-css'))return;
  const style=document.createElement('style');
  style.id='volley-match-convocation-css';
  style.textContent=`
  .match-convocation-card{margin:0 0 1.15rem;padding:1rem 1.05rem;border:1px solid #dbe3ee;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.06)}
  .match-convocation-card-head{display:flex;align-items:center;gap:.8rem}.match-convocation-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#eff6ff;color:#2563eb;flex:0 0 auto}.match-convocation-icon svg{width:20px;height:20px}.match-convocation-card small{display:block;color:#64748b;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.match-convocation-card strong{display:block;color:#0f172a;font-size:1rem}.match-convocation-card p{margin:.75rem 0;color:#475569;font-size:.84rem;line-height:1.5}.match-convocation-card.called{border-color:#bbf7d0;background:#f0fdf4}.match-convocation-card.called .match-convocation-icon{background:#dcfce7;color:#16a34a}.match-convocation-card.not-called{background:#f8fafc}.match-convocation-card.not-called .match-convocation-icon,.match-convocation-card.pending .match-convocation-icon{background:#e2e8f0;color:#64748b}
  .match-convocation-dialog{max-width:620px!important}.match-convocation-head{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff}.match-convocation-head h3{display:flex;align-items:center;gap:.5rem;margin:.12rem 0 0;color:#f8fafc}.match-convocation-head h3 svg{width:20px}.match-convocation-kicker{font-size:.68rem;text-transform:uppercase;letter-spacing:.09em;color:#fbbf24;font-weight:900}.match-convocation-body{display:flex;flex-direction:column;gap:1rem}.match-convocation-meta{display:flex;gap:.55rem;flex-wrap:wrap}.match-convocation-meta span{display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .55rem;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:.76rem;font-weight:700}.match-convocation-meta svg{width:14px;height:14px}.match-convocation-tools{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.match-convocation-tools>span{margin-left:auto;color:#475569;font-size:.78rem;font-weight:900}.match-convocation-list{display:flex;flex-direction:column;gap:.5rem;max-height:min(52vh,430px);overflow-y:auto;padding-right:.2rem}.match-convocation-player{display:grid;grid-template-columns:auto 42px minmax(0,1fr) auto;align-items:center;gap:.7rem;padding:.7rem .75rem;border:1px solid #e2e8f0;border-radius:14px;background:#fff;cursor:pointer;transition:.15s ease}.match-convocation-player:hover{border-color:#bfdbfe}.match-convocation-player.is-selected{border-color:#86efac;background:#f0fdf4}.match-convocation-player input{width:18px;height:18px;accent-color:#16a34a}.match-convocation-player img{width:42px;height:42px;border-radius:50%;object-fit:cover;background:#e2e8f0}.match-convocation-player strong{display:block;color:#0f172a;font-size:.9rem}.match-convocation-player small{display:block;margin-top:.1rem;color:#64748b;font-size:.74rem}.match-convocation-check{width:18px;height:18px;color:#cbd5e1}.match-convocation-player.is-selected .match-convocation-check{color:#16a34a}.match-convocation-actions{display:flex;justify-content:space-between;gap:.75rem;padding-top:.85rem;border-top:1px solid #e2e8f0}
  @media(max-width:640px){.match-convocation-modal.active{align-items:flex-end!important;padding:0!important}.match-convocation-dialog{width:100%!important;max-width:none!important;max-height:92dvh!important;border-radius:22px 22px 0 0!important;overflow:hidden!important}.match-convocation-body{overflow:hidden}.match-convocation-list{max-height:none;flex:1 1 auto;min-height:0}.match-convocation-tools>span{width:100%;margin-left:0}.match-convocation-actions{padding-bottom:max(10px,env(safe-area-inset-bottom))}}
  `;
  document.head.appendChild(style);
}
function install(){
  injectStyles();
  ensureModal();
  installWrappers();
  window.openConvocatoriaModal=openConvocationModal;
  window.openMatchConvocation=openConvocationModal;
  window.closeMatchConvocation=closeConvocationModal;
  console.info('[MatchConvocation] Convocatoria de partidos activa; asistencia de partidos desactivada.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
