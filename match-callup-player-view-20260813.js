(function(){
'use strict';

const FLAG='__volleyMatchCallupPlayerView20260813';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function client(){return window.VolleySupabase?.getClient?.()||null;}
function user(){try{return typeof window.getCurrentUser==='function'?window.getCurrentUser():null;}catch(_){return null;}}
function isPlayer(){
  const u=user();
  return Boolean(u&&u.role==='player'&&!(typeof window.isCoachUser==='function'&&window.isCoachUser()));
}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function eventById(id){
  const sid=String(id||'');
  return (state()?.events||[]).find(e=>[e.id,e.supabaseId,e.supabase_id,e.legacyId,e.legacy_id].filter(Boolean).map(String).includes(sid))||null;
}
async function resolveEventUuid(evt){
  if(!evt)return null;
  for(const value of [evt.supabaseId,evt.supabase_id,evt.id]){
    if(UUID_RE.test(String(value||'')))return String(value);
  }
  const legacy=[evt.id,evt.legacyId,evt.legacy_id].find(Boolean);
  const c=client();
  if(!c||!legacy)return null;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  return data?.id||null;
}
async function loadRoster(){
  const local=(state()?.players||[]).filter(p=>p?.active!==false);
  const c=client();
  if(!c)return [];
  const {data,error}=await c.from('players').select('id,legacy_id,dorsal,active').eq('active',true).order('dorsal',{ascending:true});
  if(error)throw error;
  return (data||[]).map(row=>{
    const match=local.find(p=>String(p.supabaseId||p.supabase_id||'')===String(row.id)||String(p.id||p.legacyId||p.legacy_id||'')===String(row.legacy_id||''));
    return {
      id:String(row.id),
      number:row.dorsal??match?.number??match?.dorsal??null,
      name:match?.name||match?.full_name||(row.dorsal!=null?`Jugadora #${row.dorsal}`:'Jugadora')
    };
  });
}
async function ownPlayerId(){
  try{
    const result=await window.VolleySupabase?.getIdentity?.();
    const id=result?.data?.player?.id;
    if(UUID_RE.test(String(id||'')))return String(id);
  }catch(_){}
  const u=user();
  if(UUID_RE.test(String(u?.supabasePlayerId||'')))return String(u.supabasePlayerId);
  return null;
}
async function render(eventId){
  if(!isPlayer())return;
  const evt=eventById(eventId);
  if(!evt||!MATCH_TYPES.has(evt.type))return;
  const modal=document.getElementById('modal-event-detail');
  const body=document.getElementById('event-detail-body');
  if(!modal?.classList.contains('active')||!body)return;

  let section=body.querySelector('[data-match-callup-player-view]');
  if(!section){
    section=document.createElement('section');
    section.dataset.matchCallupPlayerView='1';
    section.className='match-callup-player-view';
    body.appendChild(section);
  }
  section.innerHTML='<div class="match-callup-player-state"><span class="match-callup-player-icon"><i data-lucide="users-round"></i></span><div><small>CONVOCATORIA</small><strong>Cargando…</strong></div></div>';
  try{window.lucide?.createIcons?.();}catch(_){}

  try{
    const eventUuid=await resolveEventUuid(evt);
    if(!eventUuid)throw new Error('Partido no vinculado con Supabase');
    const c=client();
    if(!c)throw new Error('Supabase no disponible');
    const [{data:rows,error:rowsError},roster,ownId]=await Promise.all([
      c.from('match_callups').select('player_id').eq('event_id',eventUuid),
      loadRoster(),
      ownPlayerId()
    ]);
    if(rowsError)throw rowsError;
    const selected=new Set((rows||[]).map(r=>String(r.player_id)));
    const called=roster.filter(p=>selected.has(p.id));
    const published=called.length>0;
    const mine=Boolean(ownId&&selected.has(ownId));

    let icon='clock-3';
    let title='Convocatoria pendiente';
    let cls='pending';
    let help='El cuerpo técnico todavía no ha publicado la convocatoria de este partido.';
    if(published){
      if(mine){
        icon='badge-check';
        title='Estás convocada';
        cls='called';
        help='Formas parte de la convocatoria para este partido.';
      }else{
        icon='circle-minus';
        title='No estás convocada';
        cls='not-called';
        help='No figuras en la convocatoria publicada para este partido.';
      }
    }
    const chips=published?`<div class="match-callup-player-chips">${called.map(p=>`<span>${p.number!=null?`#${esc(p.number)} `:''}${esc(p.name)}</span>`).join('')}</div>`:'';
    section.className=`match-callup-player-view ${cls}`;
    section.innerHTML=`<div class="match-callup-player-state"><span class="match-callup-player-icon"><i data-lucide="${icon}"></i></span><div><small>CONVOCATORIA</small><strong>${esc(title)}</strong><p>${esc(help)}</p></div>${published?`<b>${called.length}</b>`:''}</div>${chips}`;
    try{window.lucide?.createIcons?.();}catch(_){}
  }catch(error){
    console.error('[MatchCallupPlayerView]',error);
    section.className='match-callup-player-view error';
    section.innerHTML='<div class="match-callup-player-state"><span class="match-callup-player-icon"><i data-lucide="circle-alert"></i></span><div><small>CONVOCATORIA</small><strong>No disponible</strong><p>No se ha podido cargar la convocatoria ahora mismo.</p></div></div>';
    try{window.lucide?.createIcons?.();}catch(_){}
  }
}

function removeMatchAttendanceArtifacts(){
  const modal=document.getElementById('modal-event-detail');
  if(!modal?.classList.contains('active'))return;
  [...modal.querySelectorAll('button')].forEach(btn=>{
    const text=String(btn.textContent||'').trim().toLowerCase();
    if(text.includes('asistencia')&&(text.includes('partido')||text.includes('guardar asistencia')))btn.remove();
  });
}

function installWrapper(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const fn=window.openEventDetailModal;
    if(typeof fn==='function'&&!fn.__matchCallupPlayerViewWrapped){
      const base=fn;
      const wrapped=function(eventId){
        const result=base.apply(this,arguments);
        requestAnimationFrame(()=>{removeMatchAttendanceArtifacts();render(eventId);});
        setTimeout(()=>{removeMatchAttendanceArtifacts();render(eventId);},180);
        return result;
      };
      wrapped.__matchCallupPlayerViewWrapped=true;
      window.openEventDetailModal=wrapped;
      clearInterval(timer);
    }else if(attempts>80){clearInterval(timer);}
  },100);
}

function injectStyles(){
  if(document.getElementById('match-callup-player-view-css'))return;
  const style=document.createElement('style');
  style.id='match-callup-player-view-css';
  style.textContent=`
    .match-callup-player-view{margin:1rem 0 0;padding:1rem;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)}
    .match-callup-player-state{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:start;gap:.8rem}
    .match-callup-player-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#f1f5f9;color:#475569}.match-callup-player-icon svg{width:21px;height:21px}
    .match-callup-player-state small{display:block;font-size:.66rem;font-weight:900;letter-spacing:.09em;color:#64748b;margin-bottom:.12rem}
    .match-callup-player-state strong{display:block;color:#0f172a;font-size:1.02rem}.match-callup-player-state p{margin:.3rem 0 0;color:#64748b;font-size:.82rem;line-height:1.35}
    .match-callup-player-state b{min-width:34px;height:34px;padding:0 .5rem;border-radius:999px;display:grid;place-items:center;background:#f1f5f9;color:#334155}
    .match-callup-player-view.called{border-color:#bbf7d0;background:#f0fdf4}.match-callup-player-view.called .match-callup-player-icon{background:#dcfce7;color:#15803d}.match-callup-player-view.called .match-callup-player-state small{color:#15803d}.match-callup-player-view.called .match-callup-player-state b{background:#dcfce7;color:#166534}
    .match-callup-player-view.not-called{border-color:#e2e8f0;background:#f8fafc}.match-callup-player-view.not-called .match-callup-player-icon{background:#e2e8f0;color:#475569}
    .match-callup-player-view.pending{border-color:#fde68a;background:#fffbeb}.match-callup-player-view.pending .match-callup-player-icon{background:#fef3c7;color:#b45309}.match-callup-player-view.pending .match-callup-player-state small{color:#b45309}
    .match-callup-player-view.error{border-color:#fecaca;background:#fef2f2}.match-callup-player-view.error .match-callup-player-icon{background:#fee2e2;color:#b91c1c}
    .match-callup-player-chips{display:flex;flex-wrap:wrap;gap:.38rem;margin-top:.8rem;padding-top:.75rem;border-top:1px solid rgba(148,163,184,.22)}.match-callup-player-chips span{padding:.36rem .56rem;border-radius:999px;background:rgba(255,255,255,.82);border:1px solid rgba(148,163,184,.22);font-size:.74rem;font-weight:750;color:#334155}
    @media(max-width:600px){.match-callup-player-view{padding:.9rem;border-radius:14px}.match-callup-player-state{grid-template-columns:38px minmax(0,1fr) auto;gap:.65rem}.match-callup-player-icon{width:38px;height:38px;border-radius:11px}.match-callup-player-chips{gap:.32rem}.match-callup-player-chips span{font-size:.7rem}}
  `;
  document.head.appendChild(style);
}

function install(){injectStyles();installWrapper();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
