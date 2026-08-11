(function(){
'use strict';

/**
 * Motor de carga interna ACWR · versión ACWR-5.
 * Fuente de verdad: Supabase. No persiste métricas derivadas.
 *
 * Carga individual = minutos efectivos realizados × RPE individual.
 * Solo una asistencia oficial "present" o "late" puede generar carga.
 */
const DAY_MS=86400000;
const ACUTE_WINDOW_MS=7*DAY_MS;
const CHRONIC_START_MS=35*DAY_MS;
const CHRONIC_END_MS=7*DAY_MS;
const REQUIRED_HISTORY_DAYS=35;
const db=()=>window.VolleySupabase?.getClient?.()||null;

function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function normalizeReferenceDate(v){const d=v instanceof Date?new Date(v):new Date(v||Date.now());if(Number.isNaN(d.getTime()))throw new Error('Fecha de referencia no válida.');return d;}
function sessionDurationMinutes(event){
 if(!event)return null;
 const start=event.starts_at?new Date(event.starts_at):null,end=event.ends_at?new Date(event.ends_at):null;
 if(start&&end&&!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&end>start)return Math.round((end-start)/60000);
 const fallback=numberOrNull(event.payload?.duration);return fallback&&fallback>0?fallback:null;
}
function sessionEndTime(event){
 if(!event)return null;
 if(event.ends_at){const d=new Date(event.ends_at);if(!Number.isNaN(d.getTime()))return d;}
 const duration=sessionDurationMinutes(event),start=event.starts_at?new Date(event.starts_at):null;
 return duration&&start&&!Number.isNaN(start.getTime())?new Date(start.getTime()+duration*60000):null;
}
function classifyAcwr(acwr){
 if(!Number.isFinite(acwr))return{key:'insufficient',label:'Datos insuficientes'};
 if(acwr<0.8)return{key:'low',label:'Carga bastante inferior a la habitual'};
 if(acwr<=1.3)return{key:'similar',label:'Carga similar a la habitual'};
 if(acwr<=1.5)return{key:'considerable',label:'Incremento considerable de carga'};
 return{key:'high',label:'Incremento elevado de carga'};
}
function rollingWeekLoads(referenceDate,loads){
 const ref=referenceDate.getTime(),bins=[0,0,0,0,0];
 for(const row of loads||[]){
  const t=new Date(row.startsAt).getTime();if(!Number.isFinite(t)||t>ref)continue;
  const age=ref-t;if(age<0||age>=CHRONIC_START_MS)continue;
  const fromNow=Math.floor(age/(7*DAY_MS));if(fromNow<0||fromNow>4)continue;
  const idx=4-fromNow;bins[idx]+=Number(row.sessionLoad)||0;
 }
 return bins.map(Math.round);
}
function calculateFromLoads(loads,referenceDateInput){
 const referenceDate=normalizeReferenceDate(referenceDateInput),ref=referenceDate.getTime(),acuteRows=[],chronicRows=[],validRows=[];
 for(const row of loads||[]){
  const t=new Date(row.startsAt).getTime(),load=numberOrNull(row.sessionLoad);if(!Number.isFinite(t)||t>ref||load==null||load<0)continue;
  const normalized={...row,sessionLoad:load};validRows.push(normalized);
  const age=ref-t;
  if(age>=0&&age<ACUTE_WINDOW_MS)acuteRows.push(normalized);
  else if(age>=CHRONIC_END_MS&&age<CHRONIC_START_MS)chronicRows.push(normalized);
 }
 const acuteLoad=acuteRows.reduce((s,r)=>s+r.sessionLoad,0),chronicTotal28d=chronicRows.reduce((s,r)=>s+r.sessionLoad,0),chronicLoad=chronicTotal28d/4;
 const oldestTime=validRows.length?Math.min(...validRows.map(r=>new Date(r.startsAt).getTime())):null;
 const historyCoverageDays=oldestTime==null?0:Math.max(0,Math.floor((ref-oldestTime)/DAY_MS));
 const enoughHistory=historyCoverageDays>=REQUIRED_HISTORY_DAYS&&chronicLoad>0;
 const acwr=enoughHistory?acuteLoad/chronicLoad:null,changePct=enoughHistory?((acuteLoad-chronicLoad)/chronicLoad)*100:null;
 const recentRpes=acuteRows.map(r=>numberOrNull(r.rpe)).filter(v=>v!=null);
 const recentRpeMean=recentRpes.length?recentRpes.reduce((a,b)=>a+b,0)/recentRpes.length:null;
 const trendWeekLoads=rollingWeekLoads(referenceDate,validRows);
 const previousTrend=trendWeekLoads.slice(0,4),previousMean=previousTrend.reduce((a,b)=>a+b,0)/4,currentTrend=trendWeekLoads[4]||0;
 const trendDirection=previousMean<=0?'insufficient':currentTrend>previousMean*1.05?'up':currentTrend<previousMean*0.95?'down':'stable';
 return{
  referenceDate:referenceDate.toISOString(),
  acuteLoad:Math.round(acuteLoad),
  chronicLoad:Math.round(chronicLoad),
  chronicTotal28d:Math.round(chronicTotal28d),
  acwr:acwr==null?null:Math.round(acwr*100)/100,
  changePct:changePct==null?null:Math.round(changePct),
  recentRpeMean:recentRpeMean==null?null:Math.round(recentRpeMean*10)/10,
  recentSessions:acuteRows.length,
  trendWeekLoads,
  trendDirection,
  status:enoughHistory?'ready':'insufficient',
  interpretation:classifyAcwr(acwr),
  history:{
   coverageDays:historyCoverageDays,
   requiredHistoryDays:REQUIRED_HISTORY_DAYS,
   chronicWeekLoads:trendWeekLoads.slice(0,4),
   acuteSessions:acuteRows.length,
   chronicSessions:chronicRows.length
  }
 };
}
async function fetchDataset(){
 const client=db();if(!client)throw new Error('Supabase no está disponible.');
 const [eventsRes,rpeRes,attendanceRes,playersRes]=await Promise.all([
  client.from('events').select('id,event_type,title,starts_at,ends_at,payload').eq('event_type','training'),
  client.from('rpe_entries').select('id,event_id,player_id,score,source,created_at,updated_at').not('player_id','is',null).in('source',['player','coach_for_player']),
  client.from('attendance').select('event_id,player_id,official_status,effective_minutes'),
  client.from('players').select('id,legacy_id,profile_id,dorsal,position,active,profiles:profile_id(username,full_name)')
 ]);
 for(const res of[eventsRes,rpeRes,attendanceRes,playersRes])if(res.error)throw res.error;
 return{events:eventsRes.data||[],rpe:rpeRes.data||[],attendance:attendanceRes.data||[],players:playersRes.data||[]};
}
function buildPlayerSessionLoads(playerId,dataset,referenceDateInput){
 const referenceDate=normalizeReferenceDate(referenceDateInput),events=new Map((dataset?.events||[]).map(e=>[String(e.id),e]));
 const attendance=new Map((dataset?.attendance||[]).filter(a=>String(a.player_id)===String(playerId)).map(a=>[String(a.event_id),a]));
 // Defensa extra: aunque el índice único de Supabase ya impide duplicados por jugadora/evento,
 // elegimos una sola entrada por evento, priorizando RPE de la propia jugadora y luego la más reciente.
 const chosen=new Map();
 for(const rpe of dataset?.rpe||[]){
  if(String(rpe.player_id)!==String(playerId))continue;
  const key=String(rpe.event_id),prev=chosen.get(key);
  if(!prev||((rpe.source==='player')&&(prev.source!=='player'))||((rpe.source===prev.source)&&new Date(rpe.updated_at||rpe.created_at)>new Date(prev.updated_at||prev.created_at)))chosen.set(key,rpe);
 }
 const rows=[];
 for(const rpe of chosen.values()){
  const event=events.get(String(rpe.event_id));if(!event)continue;
  const end=sessionEndTime(event);if(!end||end>referenceDate)continue; // futuro/en curso/sin duración: no genera carga todavía
  const att=attendance.get(String(event.id));
  const official=att?.official_status||null;
  if(official!=='present'&&official!=='late')continue; // confirmación previa o lista sin validar no generan carga
  const scheduledDuration=sessionDurationMinutes(event),score=numberOrNull(rpe.score);if(!scheduledDuration||scheduledDuration<=0||score==null||score<0||score>10)continue;
  let effectiveDuration=scheduledDuration;
  if(official==='late'){
   const entered=numberOrNull(att?.effective_minutes);
   if(entered==null||entered<=0)continue; // nunca inventamos minutos de una llegada tarde
   effectiveDuration=Math.min(scheduledDuration,Math.round(entered));
  }
  rows.push({
   eventId:event.id,
   title:event.title||'Entrenamiento',
   startsAt:event.starts_at,
   endsAt:end.toISOString(),
   scheduledDurationMinutes:scheduledDuration,
   durationMinutes:effectiveDuration,
   effectiveMinutes:effectiveDuration,
   rpe:score,
   rpeSource:rpe.source,
   officialAttendance:official,
   sessionLoad:Math.round(effectiveDuration*score)
  });
 }
 return rows.sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
}
async function calculatePlayer(playerId,referenceDate){if(!playerId)throw new Error('playerId es obligatorio.');const dataset=await fetchDataset(),loads=buildPlayerSessionLoads(playerId,dataset,referenceDate);return{playerId,sessionLoads:loads,...calculateFromLoads(loads,referenceDate)};}
async function calculateTeam(referenceDate){const dataset=await fetchDataset();return(dataset.players||[]).filter(p=>p.active!==false).map(player=>{const loads=buildPlayerSessionLoads(player.id,dataset,referenceDate);return{playerId:player.id,legacyId:player.legacy_id||null,username:player.profiles?.username||null,name:player.profiles?.full_name||player.profiles?.username||player.legacy_id||'Jugadora',dorsal:player.dorsal,position:player.position,sessionLoads:loads,...calculateFromLoads(loads,referenceDate)};});}
function selfTest(){
 const ref=new Date('2026-08-11T12:00:00Z'),make=(daysAgo,load,rpe)=>({startsAt:new Date(ref.getTime()-daysAgo*DAY_MS).toISOString(),sessionLoad:load,rpe});
 const loads=[make(1,500,5),make(3,600,6),make(5,400,4),make(9,400,4),make(12,400,4),make(16,500,5),make(20,500,5),make(24,600,6),make(31,800,8),make(36,300,3)];
 const result=calculateFromLoads(loads,ref),expected={acuteLoad:1500,chronicLoad:800,acwr:1.88,changePct:88,recentRpeMean:5,recentSessions:3};
 const mathPass=result.acuteLoad===expected.acuteLoad&&result.chronicLoad===expected.chronicLoad&&result.acwr===expected.acwr&&result.changePct===expected.changePct&&result.recentRpeMean===expected.recentRpeMean&&result.recentSessions===expected.recentSessions;
 const mkEvent=(id,startMin,duration)=>({id,event_type:'training',title:id,starts_at:new Date(ref.getTime()-(startMin+duration)*60000).toISOString(),ends_at:new Date(ref.getTime()-startMin*60000).toISOString(),payload:{duration}});
 const dataset={
  events:[mkEvent('present',240,90),mkEvent('late',180,90),mkEvent('absent',120,90),mkEvent('unvalidated',60,90),mkEvent('late-no-minutes',30,90)],
  rpe:['present','late','absent','unvalidated','late-no-minutes'].map((id,i)=>({event_id:id,player_id:'p1',score:4,source:'player',created_at:new Date(ref.getTime()-i*60000).toISOString()})),
  attendance:[
   {event_id:'present',player_id:'p1',official_status:'present',effective_minutes:null},
   {event_id:'late',player_id:'p1',official_status:'late',effective_minutes:45},
   {event_id:'absent',player_id:'p1',official_status:'justified',effective_minutes:null},
   {event_id:'unvalidated',player_id:'p1',official_status:null,effective_minutes:null},
   {event_id:'late-no-minutes',player_id:'p1',official_status:'late',effective_minutes:null}
  ]
 };
 const attendanceLoads=buildPlayerSessionLoads('p1',dataset,ref);
 const attendancePass=attendanceLoads.length===2&&attendanceLoads.find(x=>x.eventId==='present')?.sessionLoad===360&&attendanceLoads.find(x=>x.eventId==='late')?.sessionLoad===180;
 return{pass:mathPass&&attendancePass,math:{pass:mathPass,expected,result},attendance:{pass:attendancePass,rows:attendanceLoads}};
}
window.TrainingLoadEngine=Object.freeze({
 sessionDurationMinutes,sessionEndTime,classifyAcwr,calculateFromLoads,fetchDataset,buildPlayerSessionLoads,calculatePlayer,calculateTeam,selfTest,
 config:Object.freeze({acuteWindowDays:7,chronicWindowDays:[8,35],chronicDivisorWeeks:4,requiredHistoryDays:REQUIRED_HISTORY_DAYS,requiresFinishedSession:true,requiresOfficialParticipation:true,lateRequiresEffectiveMinutes:true})
});
console.info('[TrainingLoadEngine] ACWR-5 listo: carga solo con participación oficial y duración efectiva.');
})();
