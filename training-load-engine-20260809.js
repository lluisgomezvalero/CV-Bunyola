(function(){
'use strict';

/**
 * Motor de carga interna ACWR · versión ACWR-4.
 * Fuente de verdad: Supabase. No persiste métricas derivadas.
 */
const DAY_MS=86400000;
const ACUTE_WINDOW_MS=7*DAY_MS;
const CHRONIC_START_MS=35*DAY_MS;
const CHRONIC_END_MS=7*DAY_MS;
const MIN_CHRONIC_WEEKS_WITH_LOAD=2;
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
function makeWeekBins(referenceDate,loads){const ref=referenceDate.getTime(),bins=[0,0,0,0];for(const row of loads){const age=ref-new Date(row.startsAt).getTime();if(age<CHRONIC_END_MS||age>=CHRONIC_START_MS)continue;const idx=Math.min(3,Math.floor((age-CHRONIC_END_MS)/(7*DAY_MS)));if(idx>=0&&idx<4)bins[idx]+=row.sessionLoad;}return bins;}
function calculateFromLoads(loads,referenceDateInput){
 const referenceDate=normalizeReferenceDate(referenceDateInput),ref=referenceDate.getTime(),acuteRows=[],chronicRows=[];
 for(const row of loads||[]){const t=new Date(row.startsAt).getTime();if(!Number.isFinite(t)||t>ref)continue;const age=ref-t;if(age>=0&&age<ACUTE_WINDOW_MS)acuteRows.push(row);else if(age>=CHRONIC_END_MS&&age<CHRONIC_START_MS)chronicRows.push(row);}
 const acuteLoad=acuteRows.reduce((s,r)=>s+r.sessionLoad,0),chronicTotal28d=chronicRows.reduce((s,r)=>s+r.sessionLoad,0),chronicLoad=chronicTotal28d/4;
 const bins=makeWeekBins(referenceDate,loads||[]),weeks=bins.filter(v=>v>0).length,enough=chronicLoad>0&&weeks>=MIN_CHRONIC_WEEKS_WITH_LOAD;
 const acwr=enough?acuteLoad/chronicLoad:null,changePct=enough?((acuteLoad-chronicLoad)/chronicLoad)*100:null;
 return{referenceDate:referenceDate.toISOString(),acuteLoad:Math.round(acuteLoad),chronicLoad:Math.round(chronicLoad),chronicTotal28d:Math.round(chronicTotal28d),acwr:acwr==null?null:Math.round(acwr*100)/100,changePct:changePct==null?null:Math.round(changePct),status:enough?'ready':'insufficient',interpretation:classifyAcwr(acwr),history:{chronicWeeksWithLoad:weeks,requiredWeeksWithLoad:MIN_CHRONIC_WEEKS_WITH_LOAD,chronicWeekLoads:bins.map(Math.round),acuteSessions:acuteRows.length,chronicSessions:chronicRows.length}};
}
async function fetchDataset(){
 const client=db();if(!client)throw new Error('Supabase no está disponible.');
 const [eventsRes,rpeRes,attendanceRes,playersRes]=await Promise.all([
  client.from('events').select('id,event_type,title,starts_at,ends_at,payload').eq('event_type','training'),
  client.from('rpe_entries').select('id,event_id,player_id,score,source,created_at,updated_at').not('player_id','is',null).in('source',['player','coach_for_player']),
  client.from('attendance').select('event_id,player_id,official_status'),
  client.from('players').select('id,legacy_id,profile_id,dorsal,position,active,profiles:profile_id(username,full_name)')
 ]);
 for(const res of[eventsRes,rpeRes,attendanceRes,playersRes])if(res.error)throw res.error;
 return{events:eventsRes.data||[],rpe:rpeRes.data||[],attendance:attendanceRes.data||[],players:playersRes.data||[]};
}
function buildPlayerSessionLoads(playerId,dataset,referenceDateInput){
 const referenceDate=normalizeReferenceDate(referenceDateInput),events=new Map((dataset?.events||[]).map(e=>[String(e.id),e]));
 const attendance=new Map((dataset?.attendance||[]).filter(a=>String(a.player_id)===String(playerId)).map(a=>[String(a.event_id),a.official_status]));
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
  const official=attendance.get(String(event.id));if(official==='justified'||official==='unjustified')continue;
  const duration=sessionDurationMinutes(event),score=numberOrNull(rpe.score);if(!duration||duration<=0||score==null||score<0||score>10)continue;
  rows.push({eventId:event.id,title:event.title||'Entrenamiento',startsAt:event.starts_at,endsAt:end.toISOString(),durationMinutes:duration,rpe:score,rpeSource:rpe.source,officialAttendance:official||null,sessionLoad:Math.round(duration*score)});
 }
 return rows.sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
}
async function calculatePlayer(playerId,referenceDate){if(!playerId)throw new Error('playerId es obligatorio.');const dataset=await fetchDataset(),loads=buildPlayerSessionLoads(playerId,dataset,referenceDate);return{playerId,sessionLoads:loads,...calculateFromLoads(loads,referenceDate)};}
async function calculateTeam(referenceDate){const dataset=await fetchDataset();return(dataset.players||[]).filter(p=>p.active!==false).map(player=>{const loads=buildPlayerSessionLoads(player.id,dataset,referenceDate);return{playerId:player.id,legacyId:player.legacy_id||null,username:player.profiles?.username||null,name:player.profiles?.full_name||player.profiles?.username||player.legacy_id||'Jugadora',dorsal:player.dorsal,position:player.position,sessionLoads:loads,...calculateFromLoads(loads,referenceDate)};});}
async function selfTest(){
 const ref=new Date('2026-08-09T20:00:00Z'),make=(daysAgo,load)=>({startsAt:new Date(ref.getTime()-daysAgo*DAY_MS).toISOString(),sessionLoad:load});
 const loads=[make(1,500),make(3,600),make(5,400),make(9,400),make(12,400),make(16,500),make(20,500),make(24,600),make(31,800)];
 const result=calculateFromLoads(loads,ref),expected={acuteLoad:1500,chronicLoad:800,acwr:1.88,changePct:88};
 return{pass:result.acuteLoad===expected.acuteLoad&&result.chronicLoad===expected.chronicLoad&&result.acwr===expected.acwr&&result.changePct===expected.changePct,expected,result};
}
window.TrainingLoadEngine=Object.freeze({sessionDurationMinutes,sessionEndTime,classifyAcwr,calculateFromLoads,fetchDataset,buildPlayerSessionLoads,calculatePlayer,calculateTeam,selfTest,config:Object.freeze({acuteWindowDays:7,chronicWindowDays:[8,35],chronicDivisorWeeks:4,minChronicWeeksWithLoad:MIN_CHRONIC_WEEKS_WITH_LOAD,requiresFinishedSession:true})});
console.info('[TrainingLoadEngine] ACWR-4 listo: solo sesiones finalizadas con RPE individual válido.');
})();