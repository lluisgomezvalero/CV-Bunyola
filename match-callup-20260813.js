(function(){
'use strict';

const FLAG='__volleyMatchCallup20260813';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let activeEventId=null;
let saveBusy=false;

function app(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function db(){return window.VolleySupabase?.getClient?.()||null;}
function currentUser(){try{return typeof window.getCurrentUser==='function'?window.getCurrentUser():null;}catch(_){return null;}}
function isStaff(){
  try{return Boolean((typeof window.isCoachUser==='function'&&window.isCoachUser())||(typeof window.isAdministratorUser==='function'&&window.isAdministratorUser()));}
  catch(_){return false;}
}
function isPlayer(){return currentUser()?.role==='player'&&!isStaff();}
function toast(msg,type){try{window.showToast?.(msg,type);}catch(_){} }
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function eventById(id){
  const s=app(),sid=String(id||'');
  return (s?.events||[]).find(e=>[e.id,e.supabaseId,e.supabase_id,e.legacyId,e.legacy_id].filter(Boolean).map(String).includes(sid))||null;
}
function playerUuid(p){
  const candidate=[p?.supabaseId,p?.supabase_id,p?.id].find(x=>UUID_RE.test(String(x||'')));
  return candidate?String(candidate):null;
}
async function resolveEventUuid(evt){
  if(!evt)return null;
  for(const x of [evt.supabaseId,evt.supabase_id,evt.id])if(UUID_RE.test(String(x||'')))return String(x);
  const legacy=[evt.id,evt.legacyId,evt.legacy_id].find(Boolean);
  const c=db();
  if(!c||!legacy)return null;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  return data?.id||null;
}
async function roster(){
  const s=app();
  const local=(s?.players||[]).filter(p=>p?.active!==false);
  const c=db();
  if(!c)return local.map(p=>({id:playerUuid(p),legacy:String(p.id||p.legacy_id||''),name:p.name||p.full_name||'Jugadora',number:p.number??p.dorsal??null})).filter(x=>x.id);

  const {data,error}=await c.from('players').select('id,legacy_id,dorsal,active').eq('active',true).order('dorsal',{ascending:true});
  if(error)throw error;
  return (data||[]).map(r=>{
    const l=local.find(p=>String(p.supabaseId||p.supabase_id||'')===String(r.id)||String(p.id||p.legacy_id||p.legacyId||'')===String(r.legacy_id||''));
    return {id:r.id,legacy:r.legacy_id||'',name:l?.name||l?.full_name||(r.dorsal!=null?`Jugadora #${r.dorsal}`:'Jugadora'),number:r.dorsal??l?.number??l?.dorsal??null};
  });
}
async function callupSet(eventUuid){
  const c=db();
  if(!c||!eventUuid)return new Set();
  const {data,error}=await c.from('match_callups').select('player_id').eq('event_id',eventUuid);
  if(error)throw error;
  return new Set((data||[]).map(r=>String(r.player_id)));
}
function ownPlayerUuid(){
  const u=currentUser(),s=app();
  if(UUID_RE.test(String(u?.supabasePlayerId||'')))return String(u.supabasePlayerId);
  const own=(s?.players||[]).find(p=>String(p.username||'').toLowerCase()===String(u?.username||'').toLowerCase()||String(p.id||'')===String(u?.playerId||''));
  return playerUuid(own);
}

function preserveCallupScroll(list,fn){
  if(!list){fn?.();return;}
  const top=list.scrollTop;
  const height=list.scrollHeight;
  fn?.();
  requestAnimationFrame(()=>{
    const max=Math.max(0,list.scrollHeight-list.clientHeight);
    list.scrollTop=Math.min(top,max);
    requestAnimationFrame(()=>{list.scrollTop=Math.min(top,Math.max(0,list.scrollHeight-list.clientHeight));});
  });
}
function stabilizeCallupToggle(input){
  const list=input?.closest('.match-callup-list');
  const top=list?.scrollTop||0;
  try{input.blur();}catch(_){}
  requestAnimationFrame(()=>{
    if(!list)return;
    list.scrollTop=Math.min(top,Math.max(0,list.scrollHeight-list.clientHeight));
  });
}

function removeMatchAttendanceUi(){
  document.querySelectorAll('[data-match-rollcall]').forEach(el=>el.remove());
  const modal=document.getElementById('modal-event-detail');
  if(modal?.classList.contains('active')){
    [...modal.querySelectorAll('button')].forEach(btn=>{
      const t=String(btn.textContent||'').trim().toLowerCase();
      if(t.includes('pasar lista')&&t.includes('partido'))btn.remove();
    });
  }
  if(isPlayer()){
    document.querySelectorAll('#modal-player-detail .passport-metrics-grid article').forEach(card=>{
      const label=String(card.querySelector('span')?.textContent||'').trim().toLowerCase();
      if(['partidos','partidos registrados','partidos asistidos'].includes(label))card.style.display='none';
    });
  }
}

async function renderSummary(eventId){
  removeMatchAttendanceUi();
  const evt=eventById(eventId);
  if(!evt||!MATCH_TYPES.has(evt.type))return;
  const modal=document.getElementById('modal-event-detail');
  const body=document.getElementById('event-detail-body');
  if(!modal?.classList.contains('active')||!body)return;

  const buttons=[...body.querySelectorAll('button')];
  const edit=buttons.find(b=>String(b.textContent||'').toLowerCase().includes('editar evento'));
  const actions=edit?.parentElement;
  if(!actions)return;

  let section=body.querySelector('[data-match-callup-summary]');
  if(!section){
    section=document.createElement('section');
    section.dataset.matchCallupSummary='1';
    section.className='match-callup-summary';
    actions.parentElement?.insertBefore(section,actions);
  }
  section.innerHTML='<div class="match-callup-head"><div><span>CONVOCATORIA</span><strong>Cargando…</strong></div></div>';

  let action=body.querySelector('[data-match-callup-action]');
  if(isStaff()&&!action){
    action=document.createElement('button');
    action.type='button';
    action.className='btn btn-primary btn-sm';
    action.dataset.matchCallupAction='1';
    action.innerHTML='<i data-lucide="users-round"></i> Convocatoria';
    action.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openEditor(eventId);});
    actions.insertBefore(action,edit||actions.firstChild);
  }

  try{
    const eventUuid=await resolveEventUuid(evt);
    if(!eventUuid)throw new Error('No se ha podido identificar el partido en Supabase.');
    const [players,selected]=await Promise.all([roster(),callupSet(eventUuid)]);
    const called=players.filter(p=>selected.has(String(p.id)));
    const count=called.length;
    let status='Convocatoria pendiente';
    if(count)status=`${count} ${count===1?'convocada':'convocadas'}`;
    if(isPlayer()&&count){
      const own=ownPlayerUuid();
      status=own&&selected.has(own)?'✅ Estás convocada':'No estás en esta convocatoria';
    }
    const chips=count?`<div class="match-callup-chips">${called.map(p=>`<span>${p.number!=null?`#${esc(p.number)} `:''}${esc(p.name)}</span>`).join('')}</div>`:'<p class="match-callup-empty">Aún no se ha publicado ninguna convocatoria.</p>';
    section.innerHTML=`<div class="match-callup-head"><div><span>CONVOCATORIA</span><strong>${esc(status)}</strong></div>${count?`<b>${count}</b>`:''}</div>${chips}`;
  }catch(error){
    console.error('[MatchCallup] render',error);
    section.innerHTML='<div class="match-callup-head"><div><span>CONVOCATORIA</span><strong>No disponible</strong></div></div>';
  }
  try{window.lucide?.createIcons?.();}catch(_){}
}

function ensureEditor(){
  let modal=document.getElementById('modal-match-callup');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='modal-match-callup';
  modal.className='modal-backdrop match-callup-modal';
  modal.innerHTML=`<div class="modal-content"><div class="modal-header"><div><small>PARTIDO</small><h3 id="match-callup-title">Convocatoria</h3></div><button type="button" class="modal-close" data-callup-close aria-label="Cerrar">&times;</button></div><div class="modal-body"><p class="match-callup-help">Selecciona las jugadoras convocadas. Esto no cuenta como asistencia.</p><div class="match-callup-tools"><button type="button" class="btn btn-secondary btn-sm" data-callup-all>Seleccionar todas</button><button type="button" class="btn btn-secondary btn-sm" data-callup-none>Limpiar</button></div><div id="match-callup-list" class="match-callup-list"></div><div class="match-callup-savebar"><button type="button" class="btn btn-primary" data-callup-save><i data-lucide="save"></i> Guardar convocatoria</button></div></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-callup-close]').addEventListener('click',()=>closeEditor(true));
  modal.addEventListener('click',e=>{if(e.target===modal)closeEditor(true);});
  modal.querySelector('[data-callup-all]').addEventListener('click',()=>{
    const list=modal.querySelector('#match-callup-list');
    preserveCallupScroll(list,()=>modal.querySelectorAll('input[data-callup-player]').forEach(i=>i.checked=true));
  });
  modal.querySelector('[data-callup-none]').addEventListener('click',()=>{
    const list=modal.querySelector('#match-callup-list');
    preserveCallupScroll(list,()=>modal.querySelectorAll('input[data-callup-player]').forEach(i=>i.checked=false));
  });
  modal.querySelector('#match-callup-list').addEventListener('change',e=>{
    const input=e.target.closest('input[data-callup-player]');
    if(input)stabilizeCallupToggle(input);
  });
  modal.querySelector('[data-callup-save]').addEventListener('click',saveEditor);
  return modal;
}

async function openEditor(eventId){
  if(!isStaff())return;
  const evt=eventById(eventId);
  if(!evt||!MATCH_TYPES.has(evt.type))return;
  activeEventId=eventId;
  const eventModal=document.getElementById('modal-event-detail');
  eventModal?.classList.remove('active');
  const modal=ensureEditor();
  const list=modal.querySelector('#match-callup-list');
  modal.querySelector('#match-callup-title').textContent=evt.title||evt.opponent||'Convocatoria';
  list.innerHTML='<div class="match-callup-loading">Cargando plantilla…</div>';
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  try{
    const eventUuid=await resolveEventUuid(evt);
    const [players,selected]=await Promise.all([roster(),callupSet(eventUuid)]);
    modal.dataset.eventUuid=eventUuid||'';
    list.innerHTML=players.map(p=>`<label class="match-callup-player"><input type="checkbox" data-callup-player value="${esc(p.id)}" ${selected.has(String(p.id))?'checked':''}><span class="match-callup-player-number">${p.number!=null?`#${esc(p.number)}`:'—'}</span><strong>${esc(p.name)}</strong><i data-lucide="check"></i></label>`).join('')||'<div class="match-callup-loading">No hay jugadoras activas.</div>';
    list.scrollTop=0;
    try{window.lucide?.createIcons?.();}catch(_){}
  }catch(error){
    console.error('[MatchCallup] open',error);
    list.innerHTML='<div class="match-callup-error">No se ha podido cargar la convocatoria.</div>';
    toast('No se ha podido cargar la convocatoria.','error');
  }
}

function closeEditor(reopen){
  const modal=document.getElementById('modal-match-callup');
  modal?.classList.remove('active');
  document.body.classList.remove('modal-open');
  const eventId=activeEventId;
  activeEventId=null;
  if(reopen&&eventId&&typeof window.openEventDetailModal==='function')setTimeout(()=>window.openEventDetailModal(eventId),0);
}

async function saveEditor(){
  if(saveBusy||!isStaff())return;
  const modal=document.getElementById('modal-match-callup');
  const eventUuid=String(modal?.dataset.eventUuid||'');
  if(!modal||!UUID_RE.test(eventUuid))return toast('No se ha podido identificar el partido.','error');
  const selected=new Set([...modal.querySelectorAll('input[data-callup-player]:checked')].map(i=>String(i.value)));
  const button=modal.querySelector('[data-callup-save]');
  saveBusy=true;
  if(button){button.disabled=true;button.textContent='Guardando…';}
  try{
    const c=db();
    if(!c)throw new Error('Supabase no está disponible.');
    const current=await callupSet(eventUuid);
    const add=[...selected].filter(id=>!current.has(id));
    const remove=[...current].filter(id=>!selected.has(id));
    if(add.length){
      const {error}=await c.from('match_callups').insert(add.map(player_id=>({event_id:eventUuid,player_id})));
      if(error)throw error;
    }
    if(remove.length){
      const {error}=await c.from('match_callups').delete().eq('event_id',eventUuid).in('player_id',remove);
      if(error)throw error;
    }
    toast('Convocatoria guardada');
    const eventId=activeEventId;
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    activeEventId=null;
    if(eventId&&typeof window.openEventDetailModal==='function')setTimeout(()=>window.openEventDetailModal(eventId),0);
  }catch(error){
    console.error('[MatchCallup] save',error);
    toast(error.message||'No se ha podido guardar la convocatoria.','error');
  }finally{
    saveBusy=false;
    if(button){button.disabled=false;button.innerHTML='<i data-lucide="save"></i> Guardar convocatoria';try{window.lucide?.createIcons?.();}catch(_){} }
  }
}

function wrapDetail(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(typeof window.openEventDetailModal==='function'&&!window.openEventDetailModal.__matchCallupWrapped){
      const base=window.openEventDetailModal;
      const wrapped=function(eventId){
        const result=base.apply(this,arguments);
        requestAnimationFrame(()=>renderSummary(eventId));
        setTimeout(()=>renderSummary(eventId),100);
        return result;
      };
      wrapped.__matchCallupWrapped=true;
      window.openEventDetailModal=wrapped;
    }
    if(typeof window.openPlayerDetail==='function'&&!window.openPlayerDetail.__matchCallupWrapped){
      const base=window.openPlayerDetail;
      const wrapped=function(){
        const result=base.apply(this,arguments);
        requestAnimationFrame(removeMatchAttendanceUi);
        setTimeout(removeMatchAttendanceUi,120);
        return result;
      };
      wrapped.__matchCallupWrapped=true;
      window.openPlayerDetail=wrapped;
    }
    if((window.openEventDetailModal?.__matchCallupWrapped&&window.openPlayerDetail?.__matchCallupWrapped)||attempts>50)clearInterval(timer);
  },100);
}

function injectStyles(){
  if(document.getElementById('volley-match-callup-css'))return;
  const style=document.createElement('style');
  style.id='volley-match-callup-css';
  style.textContent=`
    [data-match-callup-action]{display:inline-flex!important;align-items:center!important;gap:.4rem!important;background:#f59e0b!important;border-color:#f59e0b!important;color:#fff!important;font-weight:850!important}
    [data-match-callup-action] svg{width:17px!important;height:17px!important}
    .match-callup-summary{margin:1rem 0;padding:1rem;border:1px solid #e2e8f0;border-radius:16px;background:#fff}
    .match-callup-head{display:flex;align-items:center;justify-content:space-between;gap:1rem}.match-callup-head>div{display:flex;flex-direction:column;gap:.18rem}.match-callup-head span{font-size:.68rem;font-weight:900;letter-spacing:.08em;color:#b45309}.match-callup-head strong{font-size:1rem;color:#0f172a}.match-callup-head b{min-width:34px;height:34px;padding:0 .55rem;display:grid;place-items:center;border-radius:999px;background:#fff7ed;color:#c2410c}
    .match-callup-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.8rem}.match-callup-chips span{padding:.38rem .58rem;border-radius:999px;background:#f1f5f9;color:#334155;font-size:.76rem;font-weight:750}.match-callup-empty{margin:.7rem 0 0;color:#64748b;font-size:.82rem}
    .match-callup-modal .modal-content{max-width:620px}.match-callup-modal .modal-header small{display:block;color:#b45309;font-size:.66rem;font-weight:900;letter-spacing:.1em;margin-bottom:.12rem}.match-callup-modal .modal-header h3{margin:0}.match-callup-help{margin:0 0 .75rem;color:#64748b;font-size:.86rem;line-height:1.4}.match-callup-tools{display:flex;gap:.45rem;margin-bottom:.75rem}.match-callup-list{display:flex;flex-direction:column;gap:.42rem;max-height:52vh;overflow-y:auto;-webkit-overflow-scrolling:touch;overflow-anchor:none;overscroll-behavior:contain;touch-action:pan-y}.match-callup-player{display:grid;grid-template-columns:48px minmax(0,1fr) 28px;align-items:center;gap:.65rem;min-height:52px;padding:.72rem .8rem;border:1px solid #e2e8f0;border-radius:13px;background:#fff;cursor:pointer;box-sizing:border-box;flex:0 0 auto}.match-callup-player input{position:fixed!important;left:-10000px!important;top:0!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}.match-callup-player-number{font-weight:900;color:#b45309}.match-callup-player strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0f172a}.match-callup-player i{width:24px;height:24px;border-radius:8px;border:2px solid #cbd5e1;color:transparent;padding:3px;box-sizing:border-box}.match-callup-player:has(input:checked){border-color:#f59e0b;background:#fff7ed}.match-callup-player:has(input:checked) i{background:#f59e0b;border-color:#f59e0b;color:#fff}.match-callup-savebar{padding-top:.85rem}.match-callup-savebar .btn{width:100%;justify-content:center}.match-callup-loading,.match-callup-error{padding:1rem;text-align:center;color:#64748b}.match-callup-error{color:#b91c1c}
    @media(max-width:960px){.match-callup-modal.active{top:var(--volley-shell-top-h,58px)!important;bottom:var(--volley-shell-bottom-h,68px)!important;padding:10px .55rem!important;background:#f1f5f9!important;overflow:hidden!important}.match-callup-modal .modal-content{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}.match-callup-modal .modal-header{flex:0 0 auto!important}.match-callup-modal .modal-body{display:flex!important;flex:1 1 auto!important;flex-direction:column!important;min-height:0!important;overflow:hidden!important;padding:1rem!important}.match-callup-help,.match-callup-tools{flex:0 0 auto!important}.match-callup-list{flex:1 1 0!important;max-height:none!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;scrollbar-gutter:stable;contain:layout style}.match-callup-savebar{flex:0 0 auto!important;background:#fff;padding-top:.75rem!important}.match-callup-tools .btn{flex:1;justify-content:center}}
  `;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  removeMatchAttendanceUi();
  wrapDetail();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)removeMatchAttendanceUi();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();