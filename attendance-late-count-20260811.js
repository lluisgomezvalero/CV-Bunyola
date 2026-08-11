(function(){
'use strict';
const FLAG='__attendanceLateCount20260811';

function values(obj,keys){return keys.map(key=>obj?.[key]).filter(value=>value!==undefined&&value!==null&&value!=='').map(String);}
function overlaps(a,b){const set=new Set(a);return b.some(value=>set.has(value));}
function playerIds(player,input){return [...new Set([String(input??''),...values(player,['id','supabaseId','supabase_id','legacy_id','legacyId','profile_id','authId'])].filter(Boolean))];}
function eventIds(event){return [...new Set(values(event,['id','supabaseId','supabase_id','legacy_id','legacyId']))];}
function recordPlayerIds(record){return [...new Set(values(record,['playerId','playerIdLegacy','supabasePlayerId','player_id']))];}
function recordEventIds(record){return [...new Set(values(record,['eventId','eventIdLegacy','supabaseEventId','event_id']))];}

function install(){
  if(window[FLAG])return;
  if(typeof calculatePlayerAttendanceAndAchievements!=='function'||typeof isTrainingEvent!=='function'||typeof parseEventStart!=='function'){
    setTimeout(install,150);
    return;
  }

  const corrected=function calculatePlayerAttendanceAndAchievementsLateAware(playerId){
    const players=appState.players||[];
    const player=players.find(p=>playerIds(p,playerId).includes(String(playerId)))||null;
    const targetPlayerIds=playerIds(player,playerId);
    const trainingEvents=(appState.events||[]).filter(event=>isTrainingEvent(event));
    const officialByEvent=new Map();

    (appState.attendanceData||[]).forEach(record=>{
      if(!overlaps(targetPlayerIds,recordPlayerIds(record)))return;
      const event=trainingEvents.find(candidate=>overlaps(eventIds(candidate),recordEventIds(record)));
      if(!event)return;
      officialByEvent.set(String(event.id),{record,event});
    });

    const rows=[...officialByEvent.values()].sort((a,b)=>parseEventStart(a.event)-parseEventStart(b.event));
    const isPresent=record=>['present','attended','late'].includes(String(record?.status||''));
    const isAbsent=record=>['absent','missed','justified','unjustified'].includes(String(record?.status||''));
    const totalAttended=rows.filter(item=>isPresent(item.record)).length;
    const totalMissed=rows.filter(item=>isAbsent(item.record)).length;
    const total=totalAttended+totalMissed;
    const ratio=total?Math.round(totalAttended*100/total):0;

    let currentStreak=0,maxStreak=0,running=0;
    rows.forEach(item=>{
      running=isPresent(item.record)?running+1:0;
      maxStreak=Math.max(maxStreak,running);
    });
    currentStreak=running;

    const engagement=typeof getPlayerEngagement==='function'?getPlayerEngagement(playerId):{xp:0,achievements:[]};
    const levels=[{name:'Inicio',min:0},{name:'Compromiso',min:50},{name:'Constancia',min:150},{name:'Referente',min:300},{name:'Líder de equipo',min:500}];
    let levelIndex=0;
    levels.forEach((level,index)=>{if((engagement.xp||0)>=level.min)levelIndex=index;});
    const level=levels[levelIndex],nextLevel=levels[levelIndex+1]||null;

    return{
      totalAttended,totalMissed,ratio,currentStreak,maxStreak,points:engagement.xp||0,level:level.name,
      nextLevel:nextLevel?.name||null,
      pointsToNext:nextLevel?Math.max(0,nextLevel.min-(engagement.xp||0)):0,
      levelProgress:nextLevel?Math.min(100,Math.round(((engagement.xp||0)-level.min)*100/(nextLevel.min-level.min))):100,
      achievements:engagement.achievements||[]
    };
  };

  window.calculatePlayerAttendanceAndAchievements=corrected;
  try{calculatePlayerAttendanceAndAchievements=corrected;}catch(_){}
  window[FLAG]=true;

  try{if(typeof renderHomeDashboard==='function')renderHomeDashboard();}catch(_){}
  try{if(typeof renderRoster==='function'&&document.getElementById('view-roster')?.classList.contains('active'))renderRoster();}catch(_){}

  console.info('[AttendanceLateCount] La asistencia oficial validada cuenta de inmediato; Tarde cuenta como asistencia.');
}

setTimeout(install,0);
})();
