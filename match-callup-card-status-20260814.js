(function(){
'use strict';

const FLAG='__volleyMatchCallupCardStatus20260814';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let ownPlayerIdCache=undefined;
let refreshToken=0;

function app(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function db(){try{return window.VolleySupabase?.getClient?.()||null;}catch(_){return null;}}
function currentUser(){try{return typeof window.getCurrentUser==='function'?window.getCurrentUser():null;}catch(_){return null;}}
function isStaff(){try{return Boolean((typeof window.isCoachUser==='function'&&window.isCoachUser())||(typeof window.isAdministratorUser==='function'&&window.isAdministratorUser()));}catch(_){return false;}}
function isPlayer(){return currentUser()?.role==='player'&&!isStaff();}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function eventKey(evt){return String(evt?.supabaseId||evt?.supabase_id||evt?.id||evt?.legacyId||evt?.legacy_id||'');}

function currentMonthMatches(){
  const s=app();
  if(!s)return [];
  let year=null,month=null;
  try{year=typeof currentCalendarYear!=='undefined'?currentCalendarYear:null;month=typeof currentCalendarMonth!=='undefined'?currentCalendarMonth:null;}catch(_){}
  if(year==null||month==null){const now=new Date();year=now.getFullYear();month=now.getMonth();}
  return (s.events||[]).filter(evt=>{
    if(!MATCH_TYPES.has(evt?.type))return false;
    const [y,m]=String(evt.date||'').split('-').map(Number);
    return y===Number(year)&&m-1===Number(month);
  }).sort((a,b)=>{
    if(String(a.date)!==String(b.date))return String(a.date).localeCompare(String(b.date));
    return String(a.time||'').localeCompare(String(b.time||''));
  });
}

async function resolveEventUuid(evt){
  if(!evt)return null;
  for(const value of [evt.supabaseId,evt.supabase_id,evt.id])if(UUID_RE.test(String(value||'')))return String(value);
  const legacy=[evt.id,evt.legacyId,evt.legacy_id].find(Boolean);
  const c=db();
  if(!c||!legacy)return null;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  return data?.id||null;
}

async function ownPlayerId(){
  if(ownPlayerIdCache!==undefined)return ownPlayerIdCache;
  ownPlayerIdCache=null;
  if(!isPlayer())return null;
  try{
    const result=await window.VolleySupabase?.getIdentity?.();
    const id=result?.data?.player?.id;
    if(UUID_RE.test(String(id||''))){ownPlayerIdCache=String(id);return ownPlayerIdCache;}
  }catch(_){}
  const u=currentUser();
  if(UUID_RE.test(String(u?.supabasePlayerId||'')))ownPlayerIdCache=String(u.supabasePlayerId);
  return ownPlayerIdCache;
}

async function loadStatuses(events){
  const c=db();
  const map=new Map();
  if(!c||!events.length)return map;
  const resolved=await Promise.all(events.map(async evt=>({evt,uuid:await resolveEventUuid(evt)})));
  const uuids=[...new Set(resolved.map(x=>x.uuid).filter(Boolean))];
  if(!uuids.length)return map;
  const {data,error}=await c.from('match_callups').select('event_id,player_id').in('event_id',uuids);
  if(error)throw error;
  const rowsByEvent=new Map();
  (data||[]).forEach(row=>{
    const key=String(row.event_id);
    if(!rowsByEvent.has(key))rowsByEvent.set(key,[]);
    rowsByEvent.get(key).push(String(row.player_id));
  });
  const own=await ownPlayerId();
  resolved.forEach(({evt,uuid})=>{
    const rows=uuid?(rowsByEvent.get(String(uuid))||[]):[];
    let status={text:'Convocatoria pendiente',kind:'pending'};
    if(rows.length){
      if(isStaff())status={text:`${rows.length} convocada${rows.length===1?'':'s'}`,kind:'coach'};
      else if(isPlayer())status=own&&rows.includes(String(own))?{text:'✓ Convocada',kind:'called'}:{text:'No convocada',kind:'not-called'};
      else status={text:`${rows.length} convocada${rows.length===1?'':'s'}`,kind:'coach'};
    }
    map.set(eventKey(evt),status);
  });
  return map;
}

function applyMobileCardStatus(card,status){
  if(!card||!status)return;
  const copy=card.querySelector('.agenda-event-copy');
  if(!copy)return;
  let badge=copy.querySelector('[data-calendar-callup-status]');
  if(!badge){
    badge=document.createElement('div');
    badge.dataset.calendarCallupStatus='1';
    badge.className='calendar-callup-status';
    const title=copy.querySelector('.agenda-title');
    if(title?.nextSibling)copy.insertBefore(badge,title.nextSibling);
    else if(title)title.insertAdjacentElement('afterend',badge);
    else copy.prepend(badge);
  }
  badge.className=`calendar-callup-status is-${status.kind}`;
  badge.textContent=status.text;
}

function applyDesktopChipStatus(chip,status){
  if(!chip||!status)return;
  chip.dataset.callupStatus=status.kind;
  chip.title=`${chip.title?chip.title+' · ':''}${status.text}`;
  let dot=chip.querySelector('[data-calendar-callup-dot]');
  if(!dot){
    dot=document.createElement('span');
    dot.dataset.calendarCallupDot='1';
    dot.className='calendar-callup-dot';
    chip.appendChild(dot);
  }
  dot.className=`calendar-callup-dot is-${status.kind}`;
  dot.textContent=status.kind==='called'?'✓':status.kind==='not-called'?'–':status.kind==='pending'?'?':String(status.text.match(/^\d+/)?.[0]||'•');
}

function findDesktopEventForChip(chip,events){
  const parent=chip.closest('.gcal-events-list');
  const date=String(parent?.id||'').replace(/^events-date-/,'');
  const cleanText=String(chip.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  const sameDate=events.filter(evt=>String(evt.date)===date);
  if(sameDate.length===1)return sameDate[0];
  return sameDate.find(evt=>{
    const title=String(evt.title||'').replace(/^[🏋️🏐🏆]\s*/,'').trim().toLowerCase();
    return title&&cleanText.includes(title);
  })||sameDate[0]||null;
}

async function decorateCalendar(){
  const token=++refreshToken;
  const events=currentMonthMatches();
  if(!events.length)return;
  try{
    const statuses=await loadStatuses(events);
    if(token!==refreshToken)return;

    const mobileCards=[...document.querySelectorAll('#gcal-agenda-view .agenda-card.match-card')];
    mobileCards.forEach((card,index)=>{
      const evt=events[index];
      const status=evt&&statuses.get(eventKey(evt));
      if(status)applyMobileCardStatus(card,status);
    });

    const desktopChips=[...document.querySelectorAll('.gcal-event-chip.chip-match')];
    desktopChips.forEach(chip=>{
      const evt=findDesktopEventForChip(chip,events);
      const status=evt&&statuses.get(eventKey(evt));
      if(status)applyDesktopChipStatus(chip,status);
    });
  }catch(error){
    console.warn('[MatchCallupCardStatus] No se pudo cargar el estado de convocatoria.',error);
  }
}

function wrapCalendarRenderer(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(typeof window.renderGoogleCalendar==='function'&&!window.renderGoogleCalendar.__callupCardStatusWrapped){
      const base=window.renderGoogleCalendar;
      const wrapped=function(){
        const result=base.apply(this,arguments);
        requestAnimationFrame(()=>void decorateCalendar());
        setTimeout(()=>void decorateCalendar(),100);
        return result;
      };
      wrapped.__callupCardStatusWrapped=true;
      window.renderGoogleCalendar=wrapped;
      clearInterval(timer);
      setTimeout(()=>void decorateCalendar(),0);
    } else if(attempts>80)clearInterval(timer);
  },100);
}

function injectStyles(){
  if(document.getElementById('volley-callup-card-status-css'))return;
  const style=document.createElement('style');
  style.id='volley-callup-card-status-css';
  style.textContent=`
    .calendar-callup-status{display:inline-flex;align-items:center;width:max-content;max-width:100%;margin-top:.38rem;padding:.28rem .5rem;border-radius:999px;font-size:.7rem;font-weight:850;line-height:1.1;letter-spacing:.01em}
    .calendar-callup-status.is-called{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
    .calendar-callup-status.is-not-called{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
    .calendar-callup-status.is-pending{background:#fffbeb;color:#92400e;border:1px solid #fde68a}
    .calendar-callup-status.is-coach{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
    .calendar-callup-dot{display:inline-grid;place-items:center;flex:0 0 auto;min-width:18px;height:18px;margin-left:auto;padding:0 4px;border-radius:999px;font-size:.58rem;font-weight:950;line-height:1}
    .calendar-callup-dot.is-called{background:#dcfce7;color:#166534}.calendar-callup-dot.is-not-called{background:#e2e8f0;color:#64748b}.calendar-callup-dot.is-pending{background:#fef3c7;color:#92400e}.calendar-callup-dot.is-coach{background:#dbeafe;color:#1d4ed8}
    @media(max-width:960px){.calendar-callup-status{font-size:.72rem;padding:.3rem .55rem;margin-top:.42rem}.agenda-card.match-card .agenda-event-copy{min-width:0}}
  `;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  wrapCalendarRenderer();
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-callup-save]')){
      setTimeout(()=>void decorateCalendar(),500);
      setTimeout(()=>void decorateCalendar(),1400);
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>void decorateCalendar(),100);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
