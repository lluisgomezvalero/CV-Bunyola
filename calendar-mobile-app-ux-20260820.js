(function(){
'use strict';

const FLAG='__calendarMobileAppUx20260820';
if(window[FLAG])return;
window[FLAG]=true;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function cleanTitle(value){return String(value||'').replace(/^[\s🏋️🏐🏆🎂]+/u,'').trim();}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function dateObj(value){const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
function typeMeta(evt){
  if(evt?.isBirthday)return {key:'birthday',label:'Cumpleaños',icon:'cake'};
  if(evt?.type==='Torneo')return {key:'tournament',label:'Torneo',icon:'trophy'};
  if(evt?.type==='Amistoso')return {key:'friendly',label:'Amistoso',icon:'shield'};
  if(evt?.type==='Partido')return {key:'league',label:'Liga',icon:'trophy'};
  return {key:'training',label:'Entreno',icon:'dumbbell'};
}
function monthEvents(){
  try{
    if(typeof getCalendarEventsForMonth==='function')return [...getCalendarEventsForMonth(currentCalendarYear,currentCalendarMonth)];
  }catch(_){}
  try{
    return (appState?.events||[]).filter(evt=>{
      const d=dateObj(evt.date);return d&&d.getFullYear()===currentCalendarYear&&d.getMonth()===currentCalendarMonth;
    });
  }catch(_){return [];}
}
function matchLogos(evt){
  try{
    if(typeof getMatchLogosData==='function')return getMatchLogosData(evt);
  }catch(_){}
  return null;
}
function eventVisual(evt,meta){
  if(['league','friendly'].includes(meta.key)){
    const logos=matchLogos(evt);
    if(logos?.team1?.logo&&logos?.team2?.logo){
      return `<div class="cal-app-visual cal-app-match-visual"><img src="${esc(logos.team1.logo)}" alt=""><span>VS</span><img src="${esc(logos.team2.logo)}" alt=""></div>`;
    }
  }
  if(meta.key==='tournament'){
    let logo='assets/club_logo.png';
    try{logo=appState?.teamInfo?.customLogo||logo;}catch(_){}
    return `<div class="cal-app-visual"><img src="${esc(logo)}" alt="CV Bunyola"></div>`;
  }
  return `<div class="cal-app-visual cal-app-icon"><i data-lucide="${meta.icon}"></i></div>`;
}
function renderEvent(evt){
  const meta=typeMeta(evt);
  const card=document.createElement(evt.isBirthday?'div':'button');
  if(!evt.isBirthday)card.type='button';
  card.className=`cal-app-event is-${meta.key}`;
  if(evt.id)card.dataset.eventId=String(evt.id);
  const title=cleanTitle(evt.title)||(meta.key==='training'?'Entrenamiento':meta.label);
  const location=String(evt.location||'').trim();
  const time=evt.isBirthday?'Todo el día':String(evt.time||'').trim();
  const tournamentCount=meta.key==='tournament'&&Array.isArray(evt.tournamentMatches)?`${evt.tournamentMatches.length} partidos`:'';
  card.innerHTML=`
    ${eventVisual(evt,meta)}
    <div class="cal-app-event-copy">
      <div class="cal-app-event-top"><span class="cal-app-kind">${esc(meta.label)}</span>${time?`<span class="cal-app-time">${esc(time)}</span>`:''}</div>
      <strong>${esc(title)}</strong>
      ${tournamentCount?`<small>${esc(tournamentCount)}</small>`:''}
      ${location?`<small><i data-lucide="map-pin"></i>${esc(location)}</small>`:''}
    </div>
    ${evt.isBirthday?'':'<i data-lucide="chevron-right" class="cal-app-arrow"></i>'}`;
  if(!evt.isBirthday){
    card.addEventListener('click',()=>{try{openSeasonEvent(evt.id);}catch(_){}});
  }
  return card;
}
function renderAgenda(){
  const container=document.getElementById('gcal-agenda-view');
  if(!container)return;
  const events=monthEvents().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
  container.classList.add('cal-app-agenda');
  container.innerHTML='';
  if(!events.length){
    container.innerHTML=`<div class="cal-app-empty"><i data-lucide="calendar-days"></i><strong>Sin eventos este mes</strong><span>Los entrenamientos y partidos aparecerán aquí.</span></div>`;
    if(window.lucide)window.lucide.createIcons();
    return;
  }
  const groups=new Map();
  events.forEach(evt=>{const key=String(evt.date||'');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(evt);});
  groups.forEach((items,dateKey)=>{
    const d=dateObj(dateKey);
    const section=document.createElement('section');
    section.className='cal-app-day';
    const weekday=d?new Intl.DateTimeFormat('es-ES',{weekday:'long'}).format(d):'';
    const day=d?d.getDate():'';
    const month=d?new Intl.DateTimeFormat('es-ES',{month:'short'}).format(d).replace('.',''):'';
    section.innerHTML=`<header class="cal-app-day-head"><div class="cal-app-day-number">${esc(day)}</div><div><strong>${esc(weekday)}</strong><span>${esc(month)} · ${items.length} ${items.length===1?'evento':'eventos'}</span></div></header><div class="cal-app-day-events"></div>`;
    const list=section.querySelector('.cal-app-day-events');
    items.forEach(evt=>list.appendChild(renderEvent(evt)));
    container.appendChild(section);
  });
  if(window.lucide)window.lucide.createIcons();
}
function polishToolbar(){
  const add=document.getElementById('btn-add-event');
  if(add){add.setAttribute('aria-label','Añadir evento');add.title='Añadir evento';}
}
function ensureStyles(){
  if(document.getElementById('calendar-mobile-app-ux-20260820-style'))return;
  const style=document.createElement('style');
  style.id='calendar-mobile-app-ux-20260820-style';
  style.textContent=`
    @media(max-width:760px){
      #view-calendar .gcal-toolbar{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:.45rem!important;margin-bottom:.58rem!important;padding:0!important;min-height:0!important}
      #view-calendar .gcal-toolbar-left{display:grid!important;grid-template-columns:auto auto auto minmax(0,1fr)!important;align-items:center!important;gap:.26rem!important;min-width:0!important}
      #view-calendar .gcal-toolbar-right{display:flex!important;align-items:center!important;justify-content:center!important;gap:.25rem!important;align-self:center!important}
      #view-calendar #gcal-select-month{display:none!important}
      #view-calendar #gcal-btn-today{height:34px!important;min-height:34px!important;max-height:34px!important;min-width:48px!important;padding:0 .58rem!important;border-radius:9px!important;font-size:.66rem!important;font-weight:800!important;box-sizing:border-box!important}
      #view-calendar #gcal-btn-prev,#view-calendar #gcal-btn-next{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;max-height:34px!important;padding:0!important;border-radius:9px!important;display:grid!important;place-items:center!important;box-sizing:border-box!important}
      #view-calendar #gcal-month-title{min-width:0!important;margin:0 .08rem!important;font-size:.96rem!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #view-calendar #btn-add-event{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;max-width:34px!important;max-height:34px!important;padding:0!important;margin:0!important;border-radius:10px!important;font-size:0!important;display:grid!important;place-items:center!important;align-self:center!important;box-shadow:none!important;box-sizing:border-box!important;line-height:1!important}
      #view-calendar #btn-add-event svg{width:16px!important;height:16px!important;margin:0!important}
      #view-calendar .gcal-weekdays-header,#view-calendar .gcal-month-grid{display:none!important}
      #view-calendar #gcal-agenda-view.cal-app-agenda{display:flex!important;flex-direction:column!important;gap:.58rem!important;padding:0 0 calc(84px + env(safe-area-inset-bottom))!important}
      #view-calendar .cal-app-day{display:block!important}
      #view-calendar .cal-app-day-head{display:flex!important;align-items:center!important;gap:.48rem!important;margin:0 0 .28rem .12rem!important}
      #view-calendar .cal-app-day-number{display:grid!important;place-items:center!important;width:29px!important;height:29px!important;flex:0 0 29px!important;border-radius:8px!important;background:#f1f5f9!important;color:#172033!important;font-family:var(--font-heading)!important;font-size:.72rem!important;font-weight:850!important}
      #view-calendar .cal-app-day-head>div:last-child{min-width:0!important}
      #view-calendar .cal-app-day-head strong{display:block!important;text-transform:capitalize!important;font-size:.69rem!important;line-height:1!important;color:#293548!important}
      #view-calendar .cal-app-day-head span{display:block!important;margin-top:.06rem!important;font-size:.51rem!important;color:#96a0ae!important;text-transform:uppercase!important;letter-spacing:.03em!important}
      #view-calendar .cal-app-day-events{display:flex!important;flex-direction:column!important;gap:.28rem!important}
      #view-calendar .cal-app-event{appearance:none!important;width:100%!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:.5rem!important;padding:.5rem .58rem!important;min-height:0!important;border:1px solid #e6ebf1!important;border-left-width:3px!important;border-radius:12px!important;background:rgba(255,255,255,.97)!important;text-align:left!important;color:inherit!important;box-shadow:0 2px 9px rgba(15,23,42,.022)!important;font:inherit!important;box-sizing:border-box!important}
      #view-calendar button.cal-app-event{cursor:pointer!important}
      #view-calendar .cal-app-event.is-training{border-left-color:#7aa6c8!important}
      #view-calendar .cal-app-event.is-league{border-left-color:#d7aa4b!important}
      #view-calendar .cal-app-event.is-friendly{border-left-color:#94a3b8!important}
      #view-calendar .cal-app-event.is-tournament{border-left-color:#b58a46!important}
      #view-calendar .cal-app-event.is-birthday{border-left-color:#c59bb9!important}
      #view-calendar .cal-app-visual{width:34px!important;height:34px!important;flex:0 0 34px!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid #edf1f5!important;border-radius:9px!important;background:#fff!important;overflow:hidden!important}
      #view-calendar .cal-app-visual>img{width:29px!important;height:29px!important;object-fit:contain!important}
      #view-calendar .cal-app-icon svg{width:15px!important;height:15px!important;color:#6d7b8d!important}
      #view-calendar .cal-app-match-visual{width:61px!important;gap:2px!important;padding:2px!important}
      #view-calendar .cal-app-match-visual img{width:22px!important;height:22px!important;object-fit:contain!important}
      #view-calendar .cal-app-match-visual span{font-size:.39rem!important;font-weight:850!important;color:#a0a9b5!important}
      #view-calendar .cal-app-event-copy{min-width:0!important}
      #view-calendar .cal-app-event-top{display:flex!important;align-items:center!important;gap:.34rem!important;margin-bottom:.08rem!important}
      #view-calendar .cal-app-kind{display:inline-flex!important;align-items:center!important;min-height:16px!important;padding:.11rem .28rem!important;border-radius:5px!important;background:#f4f6f8!important;color:#6f7b8a!important;font-size:.45rem!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.02em!important}
      #view-calendar .is-league .cal-app-kind{background:#fff7df!important;color:#9a6b13!important}
      #view-calendar .is-training .cal-app-kind{background:#eef6fb!important;color:#527c9a!important}
      #view-calendar .is-friendly .cal-app-kind{background:#f1f5f9!important;color:#64748b!important}
      #view-calendar .is-tournament .cal-app-kind{background:#fbf2df!important;color:#8b672b!important}
      #view-calendar .cal-app-time{font-size:.52rem!important;font-weight:750!important;color:#8a96a5!important;font-variant-numeric:tabular-nums!important}
      #view-calendar .cal-app-event-copy>strong{display:block!important;min-width:0!important;font-family:var(--font-heading)!important;font-size:.72rem!important;line-height:1.08!important;color:#202b3c!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #view-calendar .cal-app-event-copy>small{display:flex!important;align-items:center!important;gap:.18rem!important;min-width:0!important;margin-top:.09rem!important;font-size:.51rem!important;color:#8995a5!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #view-calendar .cal-app-event-copy>small svg{width:9px!important;height:9px!important;flex:0 0 9px!important}
      #view-calendar .cal-app-arrow{width:14px!important;height:14px!important;color:#a5afbb!important}
      #view-calendar .cal-app-empty{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:.3rem!important;min-height:140px!important;padding:1.1rem!important;border:1px dashed #dce3ea!important;border-radius:14px!important;background:rgba(255,255,255,.72)!important;text-align:center!important;color:#8490a0!important}
      #view-calendar .cal-app-empty svg{width:21px!important;height:21px!important}
      #view-calendar .cal-app-empty strong{font-size:.76rem!important;color:#465366!important}
      #view-calendar .cal-app-empty span{font-size:.58rem!important}
    }
  `;
  document.head.appendChild(style);
}
function wrapRender(){
  const current=window.renderGoogleCalendar;
  if(typeof current!=='function'||current.__calendarMobileAppUx20260820)return;
  const wrapped=function(){const out=current.apply(this,arguments);try{renderAgenda();polishToolbar();}catch(error){console.warn('[Calendar UX]',error);}return out;};
  wrapped.__calendarMobileAppUx20260820=true;
  window.renderGoogleCalendar=wrapped;
  try{renderGoogleCalendar=wrapped;}catch(_){}
}
function install(){ensureStyles();wrapRender();polishToolbar();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();