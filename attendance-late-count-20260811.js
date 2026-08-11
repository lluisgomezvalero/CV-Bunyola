(function(){
'use strict';
const FLAG='__attendanceLateCount20260811';

function install(){
  if(window[FLAG])return;
  if(typeof calculatePlayerAttendanceAndAchievements!=='function'||typeof isTrainingEvent!=='function'||typeof parseEventStart!=='function'){
    setTimeout(install,150);
    return;
  }

  const corrected=function calculatePlayerAttendanceAndAchievementsLateAware(playerId){
    const now=new Date();
    const trainingEvents=(appState.events||[]).filter(event=>isTrainingEvent(event)&&parseEventStart(event)<=now);
    const eventMap=new Map(trainingEvents.map(event=>[event.id,event]));
    const officialByEvent=new Map();

    (appState.attendanceData||[]).forEach(record=>{
      if(record.playerId!==playerId||!eventMap.has(record.eventId))return;
      officialByEvent.set(record.eventId,record);
    });

    const records=[...officialByEvent.values()].sort((a,b)=>parseEventStart(eventMap.get(a.eventId))-parseEventStart(eventMap.get(b.eventId)));
    const isPresent=record=>['present','attended','late'].includes(record.status);
    const isAbsent=record=>['absent','missed','justified','unjustified'].includes(record.status);
    const totalAttended=records.filter(isPresent).length;
    const totalMissed=records.filter(isAbsent).length;
    const total=totalAttended+totalMissed;
    const ratio=total?Math.round(totalAttended*100/total):0;

    let currentStreak=0,maxStreak=0,running=0;
    records.forEach(record=>{
      running=isPresent(record)?running+1:0;
      maxStreak=Math.max(maxStreak,running);
    });
    currentStreak=running;

    const engagement=getPlayerEngagement(playerId);
    const levels=[{name:'Inicio',min:0},{name:'Compromiso',min:50},{name:'Constancia',min:150},{name:'Referente',min:300},{name:'Líder de equipo',min:500}];
    let levelIndex=0;
    levels.forEach((level,index)=>{if(engagement.xp>=level.min)levelIndex=index;});
    const level=levels[levelIndex],nextLevel=levels[levelIndex+1]||null;

    return{
      totalAttended,totalMissed,ratio,currentStreak,maxStreak,points:engagement.xp,level:level.name,
      nextLevel:nextLevel?.name||null,
      pointsToNext:nextLevel?Math.max(0,nextLevel.min-engagement.xp):0,
      levelProgress:nextLevel?Math.min(100,Math.round((engagement.xp-level.min)*100/(nextLevel.min-level.min))):100,
      achievements:engagement.achievements||[]
    };
  };

  window.calculatePlayerAttendanceAndAchievements=corrected;
  try{calculatePlayerAttendanceAndAchievements=corrected;}catch(_){}
  window[FLAG]=true;

  try{if(typeof renderCoachAttendanceList==='function')renderCoachAttendanceList();}catch(_){}
  try{if(typeof renderHomeDashboard==='function')renderHomeDashboard();}catch(_){}
  try{if(typeof renderRoster==='function'&&document.getElementById('view-roster')?.classList.contains('active'))renderRoster();}catch(_){}

  console.info('[AttendanceLateCount] Tarde cuenta como asistencia; justificadas/no justificadas cuentan como ausencia en el porcentaje.');
}

setTimeout(install,0);
})();
