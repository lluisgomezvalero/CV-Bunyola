(function(){
'use strict';

/**
 * ACWR-1 · Motor de carga interna
 * Fuente de verdad: Supabase (events + rpe_entries + attendance + players).
 * No modifica ningún dashboard ni persiste resultados derivados.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ACUTE_WINDOW_MS = 7 * DAY_MS;      // últimas 168 h
const CHRONIC_START_MS = 35 * DAY_MS;    // desde hace 35 días
const CHRONIC_END_MS = 7 * DAY_MS;       // hasta justo antes de la ventana aguda
const MIN_CHRONIC_WEEKS_WITH_LOAD = 2;   // evita ACWR con una única semana histórica aislada

const db = () => window.VolleySupabase?.getClient?.() || null;

function numberOrNull(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeReferenceDate(value){
  const d = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) throw new Error('Fecha de referencia no válida.');
  return d;
}

function sessionDurationMinutes(event){
  if (!event) return null;
  const start = event.starts_at ? new Date(event.starts_at) : null;
  const end = event.ends_at ? new Date(event.ends_at) : null;
  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start){
    return Math.round((end - start) / 60000);
  }
  const fallback = numberOrNull(event.payload?.duration);
  return fallback && fallback > 0 ? fallback : null;
}

function classifyAcwr(acwr){
  if (!Number.isFinite(acwr)) return {key:'insufficient', label:'Datos insuficientes'};
  if (acwr < 0.8) return {key:'low', label:'Carga bastante inferior a la habitual'};
  if (acwr <= 1.3) return {key:'similar', label:'Carga similar a la habitual'};
  if (acwr <= 1.5) return {key:'considerable', label:'Incremento considerable de carga'};
  return {key:'high', label:'Incremento elevado de carga'};
}

function makeWeekBins(referenceDate, sessionLoads){
  // Cuatro bloques uncoupled de 7 días: 8-14, 15-21, 22-28 y 29-35 días previos.
  const ref = referenceDate.getTime();
  const bins = [0,0,0,0];
  for (const row of sessionLoads){
    const t = new Date(row.startsAt).getTime();
    const age = ref - t;
    if (age < CHRONIC_END_MS || age >= CHRONIC_START_MS) continue;
    const idx = Math.min(3, Math.floor((age - CHRONIC_END_MS) / (7 * DAY_MS)));
    if (idx >= 0 && idx < 4) bins[idx] += row.sessionLoad;
  }
  return bins;
}

function calculateFromLoads(sessionLoads, referenceDateInput){
  const referenceDate = normalizeReferenceDate(referenceDateInput);
  const ref = referenceDate.getTime();

  const acuteRows = [];
  const chronicRows = [];
  for (const row of sessionLoads || []){
    const t = new Date(row.startsAt).getTime();
    if (!Number.isFinite(t) || t > ref) continue;
    const age = ref - t;
    if (age >= 0 && age < ACUTE_WINDOW_MS) acuteRows.push(row);
    else if (age >= CHRONIC_END_MS && age < CHRONIC_START_MS) chronicRows.push(row);
  }

  const acuteLoad = acuteRows.reduce((sum,row)=>sum + row.sessionLoad,0);
  const chronicTotal28d = chronicRows.reduce((sum,row)=>sum + row.sessionLoad,0);
  const chronicLoad = chronicTotal28d / 4;
  const chronicWeekBins = makeWeekBins(referenceDate, sessionLoads || []);
  const chronicWeeksWithLoad = chronicWeekBins.filter(v=>v>0).length;

  const enoughHistory = chronicLoad > 0 && chronicWeeksWithLoad >= MIN_CHRONIC_WEEKS_WITH_LOAD;
  const acwr = enoughHistory ? acuteLoad / chronicLoad : null;
  const changePct = enoughHistory ? ((acuteLoad - chronicLoad) / chronicLoad) * 100 : null;
  const interpretation = classifyAcwr(acwr);

  return {
    referenceDate: referenceDate.toISOString(),
    acuteLoad: Math.round(acuteLoad),
    chronicLoad: Math.round(chronicLoad),
    chronicTotal28d: Math.round(chronicTotal28d),
    acwr: acwr == null ? null : Math.round(acwr * 100) / 100,
    changePct: changePct == null ? null : Math.round(changePct),
    status: enoughHistory ? 'ready' : 'insufficient',
    interpretation,
    history: {
      chronicWeeksWithLoad,
      requiredWeeksWithLoad: MIN_CHRONIC_WEEKS_WITH_LOAD,
      chronicWeekLoads: chronicWeekBins.map(Math.round),
      acuteSessions: acuteRows.length,
      chronicSessions: chronicRows.length
    }
  };
}

async function fetchDataset(){
  const client = db();
  if (!client) throw new Error('Supabase no está disponible.');

  const [eventsRes, rpeRes, attendanceRes, playersRes] = await Promise.all([
    client.from('events').select('id,event_type,title,starts_at,ends_at,payload').eq('event_type','training'),
    client.from('rpe_entries').select('id,event_id,player_id,score,source,created_at,updated_at').not('player_id','is',null).in('source',['player','coach_for_player']),
    client.from('attendance').select('event_id,player_id,official_status'),
    client.from('players').select('id,legacy_id,profile_id,dorsal,position,active,profiles:profile_id(username,full_name)')
  ]);

  for (const res of [eventsRes,rpeRes,attendanceRes,playersRes]){
    if (res.error) throw res.error;
  }

  return {
    events: eventsRes.data || [],
    rpe: rpeRes.data || [],
    attendance: attendanceRes.data || [],
    players: playersRes.data || []
  };
}

function buildPlayerSessionLoads(playerId, dataset){
  const events = new Map((dataset?.events || []).map(e=>[String(e.id),e]));
  const attendance = new Map(
    (dataset?.attendance || [])
      .filter(a=>String(a.player_id)===String(playerId))
      .map(a=>[String(a.event_id),a.official_status])
  );

  const rows = [];
  for (const rpe of dataset?.rpe || []){
    if (String(rpe.player_id)!==String(playerId)) continue;
    const event = events.get(String(rpe.event_id));
    if (!event) continue;

    // Una ausencia oficialmente justificada/no justificada no genera carga.
    const official = attendance.get(String(event.id));
    if (official === 'justified' || official === 'unjustified') continue;

    const duration = sessionDurationMinutes(event);
    const score = numberOrNull(rpe.score);
    if (!duration || score == null) continue;

    rows.push({
      eventId: event.id,
      title: event.title || 'Entrenamiento',
      startsAt: event.starts_at,
      endsAt: event.ends_at || null,
      durationMinutes: duration,
      rpe: score,
      rpeSource: rpe.source,
      officialAttendance: official || null,
      sessionLoad: Math.round(duration * score)
    });
  }

  return rows.sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
}

async function calculatePlayer(playerId, referenceDate){
  if (!playerId) throw new Error('playerId es obligatorio.');
  const dataset = await fetchDataset();
  const loads = buildPlayerSessionLoads(playerId,dataset);
  const metrics = calculateFromLoads(loads,referenceDate);
  return {playerId, sessionLoads:loads, ...metrics};
}

async function calculateTeam(referenceDate){
  const dataset = await fetchDataset();
  return (dataset.players || []).filter(p=>p.active!==false).map(player=>{
    const loads = buildPlayerSessionLoads(player.id,dataset);
    return {
      playerId:player.id,
      legacyId:player.legacy_id || null,
      username:player.profiles?.username || null,
      name:player.profiles?.full_name || player.profiles?.username || player.legacy_id || 'Jugadora',
      dorsal:player.dorsal,
      position:player.position,
      sessionLoads:loads,
      ...calculateFromLoads(loads,referenceDate)
    };
  });
}

async function selfTest(){
  // Caso matemático conocido, sin tocar Supabase.
  const ref = new Date('2026-08-09T20:00:00Z');
  const make=(daysAgo,load)=>({startsAt:new Date(ref.getTime()-daysAgo*DAY_MS).toISOString(),sessionLoad:load});
  const loads=[
    make(1,500),make(3,600),make(5,400),               // acute = 1500
    make(9,400),make(12,400),                          // semana crónica 1 = 800
    make(16,500),make(20,500),                         // semana crónica 2 = 1000
    make(24,600),                                      // semana crónica 3 = 600
    make(31,800)                                       // semana crónica 4 = 800
  ];
  const result=calculateFromLoads(loads,ref);
  const expected={acuteLoad:1500,chronicLoad:800,acwr:1.88,changePct:88};
  const pass=result.acuteLoad===expected.acuteLoad && result.chronicLoad===expected.chronicLoad && result.acwr===expected.acwr && result.changePct===expected.changePct;
  return {pass,expected,result};
}

window.TrainingLoadEngine = Object.freeze({
  sessionDurationMinutes,
  classifyAcwr,
  calculateFromLoads,
  fetchDataset,
  buildPlayerSessionLoads,
  calculatePlayer,
  calculateTeam,
  selfTest,
  config:Object.freeze({
    acuteWindowDays:7,
    chronicWindowDays:[8,35],
    chronicDivisorWeeks:4,
    minChronicWeeksWithLoad:MIN_CHRONIC_WEEKS_WITH_LOAD
  })
});

console.info('[TrainingLoadEngine] ACWR-1 listo. No modifica la interfaz.');
})();
