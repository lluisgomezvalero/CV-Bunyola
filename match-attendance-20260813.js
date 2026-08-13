(function(){
'use strict';

const FLAG='__volleyMatchAttendance20260813';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);
const ATTENDED=new Set(['present','late']);

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function isCoach(){try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}catch(_){return false;}}
function eventById(id){
  const s=state();
  const sid=String(id||'');
  return (s?.events||[]).find(e=>[e.id,e.supabaseId,e.supabase_id,e.legacyId,e.legacy_id].filter(Boolean).map(String).includes(sid))||null;
}
function idsOfEvent(e){return [e?.id,e?.supabaseId,e?.supabase_id,e?.legacyId,e?.legacy_id].filter(Boolean).map(String);}
function idsOfPlayer(p){return [p?.id,p?.supabaseId,p?.supabase_id,p?.legacyId,p?.legacy_id,p?.profile_id].filter(Boolean).map(String);}
function logMatchesEvent(log,e){
  const ids=idsOfEvent(e);
  return [log?.eventId,log?.eventIdLegacy,log?.supabaseEventId].filter(Boolean).map(String).some(x=>ids.includes(x));
}
function logMatchesPlayer(log,p){
  const ids=idsOfPlayer(p);
  return [log?.playerId,log?.playerIdLegacy,log?.supabasePlayerId].filter(Boolean).map(String).some(x=>ids.includes(x));
}
function attendedMatchesForPlayer(playerId){
  const s=state();
  if(!s)return 0;
  const p=(s.players||[]).find(x=>idsOfPlayer(x).includes(String(playerId||'')));
  if(!p)return 0;
  const logs=Array.isArray(s.attendanceData)?s.attendanceData:[];
  return (s.events||[]).filter(e=>MATCH_TYPES.has(e.type)).filter(e=>logs.some(log=>ATTENDED.has(String(log.status||log.official_status||''))&&logMatchesEvent(log,e)&&logMatchesPlayer(log,p))).length;
}

function syncPassportMetric(playerId){
  const modal=document.getElementById('modal-player-detail');
  if(!modal?.classList.contains('active'))return;
  const cards=[...modal.querySelectorAll('.passport-metrics-grid article')];
  const card=cards.find(article=>{
    const label=article.querySelector('span')?.textContent?.trim().toLowerCase()||'';
    return label==='partidos'||label==='partidos registrados'||label==='partidos asistidos';
  });
  if(!card)return;
  const strong=card.querySelector('strong');
  const label=card.querySelector('span');
  if(strong)strong.textContent=String(attendedMatchesForPlayer(playerId));
  if(label)label.textContent='Partidos asistidos';
  card.title='Partidos con asistencia oficial validada como presente o tarde.';
}

function enhanceMatchDetail(eventId){
  if(!isCoach())return;
  const evt=eventById(eventId);
  if(!evt||!MATCH_TYPES.has(evt.type))return;
  const modal=document.getElementById('modal-event-detail');
  const body=document.getElementById('event-detail-body');
  if(!modal?.classList.contains('active')||!body)return;
  if(body.querySelector('[data-match-rollcall]'))return;

  const buttons=[...body.querySelectorAll('button')];
  const edit=buttons.find(b=>String(b.textContent||'').toLowerCase().includes('editar evento'));
  const actions=edit?.parentElement;
  if(!actions)return;

  const btn=document.createElement('button');
  btn.type='button';
  btn.className='btn btn-primary btn-sm';
  btn.dataset.matchRollcall='1';
  btn.style.cssText='background:#10b981;border:none;font-weight:800;';
  btn.innerHTML='<i data-lucide="clipboard-check"></i> Pasar lista del partido';
  btn.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    modal.classList.remove('active');
    setTimeout(()=>{
      if(typeof window.openVerifyAttendanceModal==='function')window.openVerifyAttendanceModal(evt.id);
      else if(typeof window.showToast==='function')window.showToast('La asistencia todavía no está disponible.','error');
    },0);
  });
  actions.insertBefore(btn,edit||actions.firstChild);
  try{window.lucide?.createIcons?.();}catch(_){}
}

function installWrappers(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(typeof window.openEventDetailModal==='function'&&!window.openEventDetailModal.__matchAttendanceWrapped){
      const base=window.openEventDetailModal;
      const wrapped=function(eventId){
        const result=base.apply(this,arguments);
        requestAnimationFrame(()=>enhanceMatchDetail(eventId));
        setTimeout(()=>enhanceMatchDetail(eventId),80);
        return result;
      };
      wrapped.__matchAttendanceWrapped=true;
      window.openEventDetailModal=wrapped;
    }
    if(typeof window.openPlayerDetail==='function'&&!window.openPlayerDetail.__matchAttendanceWrapped){
      const base=window.openPlayerDetail;
      const wrapped=function(playerId){
        const result=base.apply(this,arguments);
        requestAnimationFrame(()=>syncPassportMetric(playerId));
        setTimeout(()=>syncPassportMetric(playerId),120);
        return result;
      };
      wrapped.__matchAttendanceWrapped=true;
      window.openPlayerDetail=wrapped;
    }
    if((window.openEventDetailModal?.__matchAttendanceWrapped&&window.openPlayerDetail?.__matchAttendanceWrapped)||attempts>60)clearInterval(timer);
  },100);
}

function injectStyles(){
  if(document.getElementById('volley-match-attendance-css'))return;
  const style=document.createElement('style');
  style.id='volley-match-attendance-css';
  style.textContent=`
    [data-match-rollcall]{display:inline-flex!important;align-items:center!important;gap:.4rem!important}
    [data-match-rollcall] svg{width:17px!important;height:17px!important}
  `;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  installWrappers();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    const modal=document.getElementById('modal-player-detail');
    if(modal?.classList.contains('active')){
      const playerId=modal.dataset.playerId||modal.querySelector('[data-player-id]')?.dataset.playerId;
      if(playerId)syncPassportMetric(playerId);
    }
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
