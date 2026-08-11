(function(){
'use strict';
const FLAG='__coachTrainingWindows20260810';
let refreshTimer=null;
let lastWindowKey=null;

function trainingEvent(event){
  try { if(typeof isTrainingEvent==='function') return !!isTrainingEvent(event); } catch(_){}
  const type=String(event?.event_type||event?.eventType||event?.type||event?.payload?.type||'').toLowerCase();
  return type==='training'||type.includes('entrenamiento');
}
function testFixture(event){
  const legacy=String(event?.legacy_id||event?.legacyId||'').toLowerCase();
  const title=String(event?.title||'').toLowerCase();
  return legacy.startsWith('rpe-test-')||title.includes('prueba rpe');
}
function eventStart(event){
  try {
    if(typeof parseEventStart==='function'){
      const d=parseEventStart(event);
      if(d instanceof Date&&!Number.isNaN(d.getTime())) return d;
    }
  } catch(_){}
  const raw=event?.starts_at||event?.startsAt;
  if(raw){ const d=new Date(raw); if(!Number.isNaN(d.getTime())) return d; }
  if(event?.date){
    const d=new Date(`${event.date}T${event.time||event?.payload?.time||'00:00'}:00`);
    if(!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
function eventEnd(event){
  const raw=event?.ends_at||event?.endsAt;
  if(raw){ const d=new Date(raw); if(!Number.isNaN(d.getTime())) return d; }
  const start=eventStart(event);
  const duration=Number(event?.duration||event?.durationMinutes||event?.payload?.duration||event?.payload?.durationMinutes);
  if(start&&Number.isFinite(duration)&&duration>0) return new Date(start.getTime()+duration*60000);
  return start;
}
function eventDayEnd(event){
  if(event?.date){
    const d=new Date(`${event.date}T23:59:59.999`);
    if(!Number.isNaN(d.getTime())) return d;
  }
  const start=eventStart(event);
  if(!start) return null;
  const d=new Date(start);
  d.setHours(23,59,59,999);
  return d;
}
function prepared(event){
  return Boolean(
    String(event?.plan||event?.payload?.plan||'').trim()||
    String(event?.description||event?.payload?.description||'').trim()||
    event?.attachmentId||event?.sessionImage||event?.payload?.sessionImage
  );
}
function validated(event){
  try { if(typeof isAttendanceOfficiallyValidated==='function') return !!isAttendanceOfficiallyValidated(event); } catch(_){}
  if(event?.attendanceValidatedAt||event?.attendanceOfficial||event?.attendanceValidated===true) return true;
  const ids=[event?.id,event?.supabaseId,event?.supabase_id,event?.legacy_id,event?.legacyId].filter(Boolean).map(String);
  try {
    return (appState?.attendanceData||[]).some(row=>{
      if(!row?.status&&!row?.official_status) return false;
      const rowIds=[row.eventId,row.supabaseEventId,row.event_id,row.eventIdLegacy].filter(Boolean).map(String);
      return rowIds.some(id=>ids.includes(id));
    });
  } catch(_) { return false; }
}
function sameLocalDay(a,b){
  return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function attendanceReminderWindow(event,now=new Date()){
  const start=eventStart(event),end=eventDayEnd(event);
  return !!(start&&end&&sameLocalDay(start,now)&&now>=start&&now<=end);
}
function operationalTrainings(){
  try { return (appState?.events||[]).filter(event=>trainingEvent(event)&&!testFixture(event)); }
  catch(_) { return []; }
}
function eventIdentity(event){
  return String(event?.id||event?.supabaseId||event?.supabase_id||event?.legacy_id||event?.legacyId||'');
}
function eventPhase(event,now=new Date()){
  const start=eventStart(event),end=eventEnd(event);
  if(!start)return 'none';
  if(start>now)return 'upcoming';
  if(end&&now<end)return 'active';
  return 'finished';
}

function getUpcomingTrainingEventAuthoritative(nowInput=new Date()){
  const now=nowInput instanceof Date?nowInput:new Date(nowInput);
  const trainings=operationalTrainings();
  const active=trainings
    .filter(event=>eventPhase(event,now)==='active')
    .sort((a,b)=>eventStart(a)-eventStart(b))[0];
  if(active)return active;
  return trainings
    .filter(event=>eventPhase(event,now)==='upcoming')
    .sort((a,b)=>eventStart(a)-eventStart(b))[0]||null;
}

function getCoachPendingOverviewAuthoritative(){
  const now=new Date();
  const trainings=operationalTrainings();
  const sessionPlanPending=trainings.filter(event=>{
    const start=eventStart(event);
    return start&&start>now&&!prepared(event);
  }).length;
  const attendanceValidationPending=trainings.filter(event=>attendanceReminderWindow(event,now)&&!validated(event)).length;
  return {sessionPlanPending,attendanceValidationPending};
}

function patchWeeklyTracking(){
  const base=window.getWeeklyCoachTracking;
  if(typeof base!=='function'||base[FLAG]) return;
  const wrapped=function(){
    const result=base.apply(this,arguments)||{};
    const now=new Date();
    const todayDue=operationalTrainings().filter(event=>attendanceReminderWindow(event,now)&&!validated(event));
    result.validationPending=todayDue.length;
    if(Array.isArray(result.trainings)){
      const validatedCount=result.trainings.filter(event=>validated(event)).length;
      result.validationDone=validatedCount;
      result.validationTotal=result.trainings.length;
    }
    return result;
  };
  wrapped[FLAG]=true;
  window.getWeeklyCoachTracking=wrapped;
}

function dashboardWindowKey(now=new Date()){
  const focus=getUpcomingTrainingEventAuthoritative(now);
  const focusId=eventIdentity(focus);
  const phase=focus?eventPhase(focus,now):'none';
  const pending=getCoachPendingOverviewAuthoritative();
  return `${focusId}|${phase}|${pending.sessionPlanPending}|${pending.attendanceValidationPending}`;
}
function refreshTimeSensitiveDashboard(force=false){
  const key=dashboardWindowKey(new Date());
  if(!force&&key===lastWindowKey)return;
  lastWindowKey=key;
  try { if(typeof renderHomeDashboard==='function') renderHomeDashboard(); } catch(_){}
  try { if(typeof renderHomePortalRSVP==='function') renderHomePortalRSVP(); } catch(_){}
}

function install(){
  window.getUpcomingTrainingEvent=getUpcomingTrainingEventAuthoritative;
  window.getCoachPendingOverview=getCoachPendingOverviewAuthoritative;
  window.isCoachAttendanceReminderWindowOpen=attendanceReminderWindow;
  window.getCoachTrainingEventEnd=eventEnd;
  patchWeeklyTracking();
  refreshTimeSensitiveDashboard(true);
  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>refreshTimeSensitiveDashboard(false),15000);
  console.info('[CoachTrainingWindows] Sesión activa visible hasta su fin; dashboard solo se reconstruye al cambiar de estado.');
}

setTimeout(install,0);
})();
