(function(){
'use strict';

const FLAG='__gamePlanTemporalNavigation20260817';
if(window[FLAG])return;
window[FLAG]=true;

const baseGetMatches=()=>{
  try{
    const fn=window.__gamePlanAllMatchesBase;
    if(typeof fn==='function')return fn();
  }catch(_){}
  return (typeof appState!=='undefined'&&Array.isArray(appState.events)?appState.events:[])
    .filter(e=>['Partido','Amistoso'].includes(e.type))
    .sort((a,b)=>eventTime(a)-eventTime(b));
};

let mode='current'; // current | history-list | history-view
let historyId=null;
let openModuleWrapped=false;

function isCoach(){
  try{return typeof isCoachUser==='function'&&isCoachUser();}
  catch(_){return false;}
}
function pad(n){return String(n).padStart(2,'0');}
function localDateKey(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
function eventDateKey(evt){
  const raw=String(evt?.date||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const dt=new Date(evt?.starts_at||evt?.startsAt||evt?.start||evt?.date||0);
  return Number.isFinite(dt.getTime())?localDateKey(dt):'';
}
function eventTime(evt){
  const key=eventDateKey(evt);
  const time=String(evt?.time||'12:00').trim();
  if(key){
    const dt=new Date(`${key}T${/^\d{1,2}:\d{2}/.test(time)?time:'12:00'}`);
    if(Number.isFinite(dt.getTime()))return dt.getTime();
  }
  const fallback=new Date(evt?.starts_at||evt?.startsAt||evt?.start||0);
  return Number.isFinite(fallback.getTime())?fallback.getTime():0;
}
function weekBounds(){
  const now=new Date();
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const diff=(start.getDay()+6)%7;
  start.setDate(start.getDate()-diff);
  const end=new Date(start);end.setDate(start.getDate()+7);
  return {start,end,today:localDateKey(now)};
}
function allMatches(){return baseGetMatches().slice().sort((a,b)=>eventTime(a)-eventTime(b));}
function currentWeekMatch(){
  const {start,end,today}=weekBounds();
  const candidates=allMatches().filter(evt=>{
    const t=eventTime(evt);const key=eventDateKey(evt);
    return t>=start.getTime()&&t<end.getTime()&&key>=today;
  });
  return candidates[0]||null;
}
function pastMatches(){
  const today=weekBounds().today;
  return allMatches().filter(evt=>eventDateKey(evt)<today).sort((a,b)=>eventTime(b)-eventTime(a));
}
function eventById(id){return allMatches().find(evt=>String(evt.id)===String(id))||null;}
function recordFor(evt){
  try{
    const store=appState?.matchScouting||{};
    for(const id of [evt?.id,evt?.legacyId,evt?.legacy_id,evt?.supabaseId,evt?.supabase_id].filter(Boolean)){
      if(store[id])return store[id];
    }
  }catch(_){}
  return null;
}
function hasPlan(evt){
  const r=recordFor(evt);
  return Boolean(r&&(r.publishedPlan||r.draftPlan||r.status));
}
function statusLabel(evt){
  const r=recordFor(evt);
  if(r?.status==='published')return 'Publicado';
  if(r?.status==='archived')return 'Archivado';
  if(r?.draftPlan||r?.status==='draft')return 'Borrador';
  return 'Sin plan';
}
function formatDate(evt){
  const key=eventDateKey(evt);if(!key)return '';
  const [y,m,d]=key.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}).replace('.','');
}
function opponent(evt){
  return String(evt?.opponent||evt?.rawPayload?.opponent||evt?.payload?.opponent||evt?.opponentName||evt?.title||'Partido').trim();
}
function filteredMatches(){
  if(mode==='history-view'&&isCoach()&&historyId){
    const evt=eventById(historyId);return evt?[evt]:[];
  }
  const current=currentWeekMatch();
  return current?[current]:[];
}
function installFilteredGetter(){
  try{
    if(!window.__gamePlanAllMatchesBase&&typeof window.getScoutingMatches==='function')window.__gamePlanAllMatchesBase=window.getScoutingMatches;
    const fn=filteredMatches;
    window.getScoutingMatches=fn;
    try{getScoutingMatches=fn;}catch(_){}
  }catch(_){}
}
function chooseCurrent(){
  mode='current';historyId=null;
  try{scoutingPreviewMode=false;}catch(_){}
  const evt=currentWeekMatch();
  try{activeScoutingMatchId=evt?.id||null;}catch(_){}
  return evt;
}
function refreshRemote(){
  try{window.refreshGamePlanAuthoritative?.();}catch(_){}
}
function esc(value){
  try{return typeof escapeSessionText==='function'?escapeSessionText(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  catch(_){return String(value??'');}
}
function header(){return document.querySelector('#view-tactics .scouting-header');}
function hideNativeSelect(){
  const select=document.getElementById('scouting-match-select');
  if(select){select.hidden=true;select.setAttribute('aria-hidden','true');}
}
function ensureHeaderNav(){
  const h=header();if(!h)return null;
  hideNativeSelect();
  let nav=h.querySelector('.game-plan-temporal-nav');
  if(!nav){nav=document.createElement('div');nav.className='game-plan-temporal-nav';h.appendChild(nav);}
  return nav;
}
function decorateHeader(){
  const h=header(),nav=ensureHeaderNav();if(!h||!nav)return;
  const title=h.querySelector('h3'),desc=h.querySelector('p');
  const coach=isCoach();
  if(mode==='history-list'&&coach){
    if(title)title.textContent='📚 Planes anteriores';
    if(desc)desc.textContent='Consulta los planes de partidos ya disputados.';
    nav.innerHTML='<button type="button" class="btn btn-outline btn-sm" data-game-plan-current><i data-lucide="arrow-left"></i> Volver al plan actual</button>';
    return;
  }
  const evt=mode==='history-view'?eventById(historyId):currentWeekMatch();
  if(mode==='history-view'&&coach){
    if(title)title.textContent='📚 Plan anterior';
    if(desc)desc.textContent='Vista de consulta. Los planes anteriores no se editan desde aquí.';
    nav.innerHTML=`<span class="game-plan-current-chip"><b>${esc(opponent(evt))}</b><small>${esc(formatDate(evt))}</small></span><button type="button" class="btn btn-outline btn-sm" data-game-plan-history><i data-lucide="library"></i> Anteriores</button><button type="button" class="btn btn-outline btn-sm" data-game-plan-current><i data-lucide="arrow-left"></i> Plan actual</button>`;
    return;
  }
  if(title)title.textContent=coach?'📋 Plan de juego · Esta semana':'📋 Plan de juego';
  if(desc)desc.textContent=evt?(coach?'Solo se muestra el próximo partido de esta semana.':'Tu plan disponible para esta semana.'):(coach?'No queda ningún partido esta semana.':'No hay ningún plan disponible esta semana.');
  nav.innerHTML=evt
    ? `<span class="game-plan-current-chip"><b>${esc(opponent(evt))}</b><small>${esc(formatDate(evt))}</small></span>${coach?'<button type="button" class="btn btn-outline btn-sm" data-game-plan-history><i data-lucide="library"></i> Planes anteriores</button>':''}`
    : (coach?'<button type="button" class="btn btn-outline btn-sm" data-game-plan-history><i data-lucide="library"></i> Planes anteriores</button>':'');
}
function renderHistoryList(){
  const root=document.getElementById('scouting-interactive-root');
  const content=document.getElementById('scouting-plan-content');
  const empty=document.getElementById('scouting-no-match');
  if(!root||!content)return;
  if(empty)empty.hidden=true;content.hidden=false;
  const matches=pastMatches().filter(hasPlan);
  root.innerHTML=`<section class="game-plan-history-screen"><div class="game-plan-history-head"><div><span>Archivo</span><h3>Planes anteriores</h3><p>Solo aparecen partidos ya disputados que tienen un plan guardado.</p></div><b>${matches.length}</b></div>${matches.length?`<div class="game-plan-history-list">${matches.map(evt=>`<button type="button" class="game-plan-history-item" data-game-plan-open-history="${esc(evt.id)}"><span class="game-plan-history-date">${esc(formatDate(evt))}</span><span><strong>${esc(opponent(evt))}</strong><small>${esc(evt.title||'Partido')}</small></span><em class="status-${statusLabel(evt).toLowerCase().replace(' ','-')}">${esc(statusLabel(evt))}</em><i data-lucide="chevron-right"></i></button>`).join('')}</div>`:'<div class="game-plan-history-empty"><i data-lucide="archive"></i><strong>Todavía no hay planes anteriores</strong><span>Cuando pase un partido con plan guardado aparecerá aquí.</span></div>'}</section>`;
  try{window.lucide?.createIcons?.();}catch(_){}
}
function emptyCurrentState(){
  const empty=document.getElementById('scouting-no-match');
  if(!empty)return;
  empty.hidden=false;
  empty.innerHTML=isCoach()
    ? '<i data-lucide="calendar-range"></i><h3>No hay próximo partido esta semana</h3><p>Los partidos de semanas siguientes aparecerán aquí cuando llegue su semana.</p>'
    : '<i data-lucide="calendar-range"></i><h3>No hay plan de juego esta semana</h3><p>Cuando haya un partido esta semana y el plan esté disponible, aparecerá aquí.</p>';
  const content=document.getElementById('scouting-plan-content');if(content)content.hidden=true;
  try{window.lucide?.createIcons?.();}catch(_){}
}
function afterRender(){
  decorateHeader();
  if(mode==='current'&&!currentWeekMatch())emptyCurrentState();
  try{window.refreshCoachAttackTabs?.();}catch(_){}
  try{window.lucide?.createIcons?.();}catch(_){}
}
function wrapRender(){
  const base=window.renderTactics;if(typeof base!=='function')return false;if(base.__temporalNavigation20260817)return true;
  const wrapped=function(){
    installFilteredGetter();
    if(mode==='history-list'&&isCoach()){
      renderHistoryList();decorateHeader();return;
    }
    if(mode==='current'){
      const evt=currentWeekMatch();
      try{activeScoutingMatchId=evt?.id||null;}catch(_){}
      try{scoutingPreviewMode=false;}catch(_){}
      if(!evt){afterRender();return;}
    }
    if(mode==='history-view'&&historyId){
      try{activeScoutingMatchId=historyId;scoutingPreviewMode=true;}catch(_){}
    }
    const out=base.apply(this,arguments);
    requestAnimationFrame(afterRender);
    setTimeout(refreshRemote,0);
    return out;
  };
  wrapped.__temporalNavigation20260817=true;
  window.renderTactics=wrapped;try{renderTactics=wrapped;}catch(_){}
  return true;
}
function wrapOpenModule(){
  if(openModuleWrapped)return true;
  const base=window.openModule;if(typeof base!=='function')return false;
  const wrapped=function(moduleName,options={}){
    if(moduleName==='tactics')chooseCurrent();
    const out=base.apply(this,arguments);
    if(moduleName==='tactics')setTimeout(()=>{try{window.renderTactics?.();}catch(_){}refreshRemote();},0);
    return out;
  };
  wrapped.__temporalNavigation20260817=true;
  window.openModule=wrapped;try{openModule=wrapped;}catch(_){}
  openModuleWrapped=true;return true;
}
function bind(){
  if(document.documentElement.dataset.gamePlanTemporalNavBound==='1')return;
  document.documentElement.dataset.gamePlanTemporalNavBound='1';
  document.addEventListener('click',event=>{
    const history=event.target.closest?.('[data-game-plan-history]');
    if(history&&isCoach()){
      event.preventDefault();mode='history-list';historyId=null;try{scoutingPreviewMode=false;}catch(_){};window.renderTactics?.();return;
    }
    const current=event.target.closest?.('[data-game-plan-current]');
    if(current){event.preventDefault();chooseCurrent();window.renderTactics?.();refreshRemote();return;}
    const item=event.target.closest?.('[data-game-plan-open-history]');
    if(item&&isCoach()){
      event.preventDefault();historyId=item.getAttribute('data-game-plan-open-history');mode='history-view';try{activeScoutingMatchId=historyId;scoutingPreviewMode=true;}catch(_){};window.renderTactics?.();refreshRemote();return;
    }
  });
}
function injectStyles(){
  if(document.getElementById('game-plan-navigation-20260817-css'))return;
  const style=document.createElement('style');style.id='game-plan-navigation-20260817-css';style.textContent=`
#view-tactics .scouting-header{align-items:flex-start!important;gap:.75rem!important;flex-wrap:wrap!important}
#view-tactics .game-plan-temporal-nav{margin-left:auto;display:flex;align-items:center;justify-content:flex-end;gap:.45rem;flex-wrap:wrap;min-width:0}
#view-tactics .game-plan-current-chip{display:grid;gap:.08rem;padding:.42rem .62rem;border:1px solid #dbe2ea;border-radius:11px;background:#f8fafc;min-width:0}
#view-tactics .game-plan-current-chip b{font-size:.74rem;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
#view-tactics .game-plan-current-chip small{font-size:.63rem;color:#64748b;text-transform:capitalize}
#view-tactics .game-plan-history-screen{display:grid;gap:.8rem;padding:.15rem}
#view-tactics .game-plan-history-head{display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.8rem;border:1px solid #dbe2ea;border-radius:15px;background:#fff}
#view-tactics .game-plan-history-head>div{display:grid;gap:.12rem}.game-plan-history-head span{font-size:.62rem;font-weight:850;text-transform:uppercase;letter-spacing:.08em;color:#d97706}.game-plan-history-head h3{margin:0;font-size:1rem;color:#0f172a}.game-plan-history-head p{margin:0;font-size:.69rem;color:#64748b}.game-plan-history-head>b{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#0f172a;color:#fbbf24;font-size:.78rem}
#view-tactics .game-plan-history-list{display:grid;gap:.45rem}
#view-tactics .game-plan-history-item{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:.65rem;padding:.7rem .75rem;border:1px solid #dbe2ea;border-radius:13px;background:#fff;text-align:left;color:#0f172a;cursor:pointer}
#view-tactics .game-plan-history-item:hover{border-color:#94a3b8;background:#f8fafc}.game-plan-history-date{min-width:66px;font-size:.66rem;font-weight:850;color:#475569;text-transform:capitalize}.game-plan-history-item>span:nth-child(2){display:grid;gap:.08rem;min-width:0}.game-plan-history-item strong{font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.game-plan-history-item small{font-size:.63rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.game-plan-history-item em{font-style:normal;font-size:.6rem;font-weight:850;padding:.25rem .38rem;border-radius:999px;background:#f1f5f9;color:#475569}.game-plan-history-item em.status-publicado{background:#ecfdf5;color:#047857}.game-plan-history-item em.status-archivado{background:#fff7ed;color:#c2410c}.game-plan-history-item svg{width:16px;height:16px;color:#94a3b8}
#view-tactics .game-plan-history-empty{display:grid;place-items:center;text-align:center;gap:.35rem;padding:1.4rem;border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc;color:#64748b}.game-plan-history-empty svg{width:24px;height:24px}.game-plan-history-empty strong{color:#334155;font-size:.82rem}.game-plan-history-empty span{font-size:.69rem}
@media(max-width:720px){#view-tactics .scouting-header>div:first-child{width:100%}#view-tactics .game-plan-temporal-nav{width:100%;margin-left:0;justify-content:stretch}#view-tactics .game-plan-current-chip{flex:1;min-width:0}#view-tactics .game-plan-current-chip b{max-width:none}#view-tactics .game-plan-temporal-nav .btn{min-height:40px}.game-plan-history-item{grid-template-columns:58px minmax(0,1fr) auto!important;gap:.48rem!important;padding:.65rem!important}.game-plan-history-item em{grid-column:2;justify-self:start}.game-plan-history-item svg{grid-column:3;grid-row:1/3}}
`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();bind();installFilteredGetter();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const a=wrapRender(),b=wrapOpenModule();
    if(a&&b){clearInterval(timer);chooseCurrent();setTimeout(()=>{try{window.renderTactics?.();}catch(_){}refreshRemote();},0);}
    else if(tries>120)clearInterval(timer);
  },100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
