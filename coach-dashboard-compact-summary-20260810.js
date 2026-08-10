(function(){
'use strict';
const FLAG='__coachDashboardCompactSummary20260810';

function isCoach(){
  try { return typeof isCoachUser==='function' && isCoachUser(); }
  catch(_) { return false; }
}

function wellnessCounts(){
  try {
    const value=typeof getWellnessStatusCounts==='function'?getWellnessStatusCounts():null;
    return value||{green:0,yellow:0,red:0};
  } catch(_) { return {green:0,yellow:0,red:0}; }
}

function teamAttendance(){
  try {
    const players=Array.isArray(appState?.players)?appState.players:[];
    if(!players.length||typeof calculatePlayerAttendanceAndAchievements!=='function') return 0;
    const values=players.map(player=>Number(calculatePlayerAttendanceAndAchievements(player.id)?.ratio||0));
    return Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
  } catch(_) { return 0; }
}

function compactHomeSummary(){
  if(!isCoach()) return;
  const root=document.getElementById('home-dashboard');
  const grid=root?.querySelector('.dashboard-summary-grid');
  if(!grid) return;
  const wellness=wellnessCounts();
  grid.className='coach-wellness-compact-wrap';
  grid.innerHTML=`
    <button type="button" class="coach-wellness-compact-card" onclick="openModule('wellness')">
      <span class="coach-wellness-compact-title"><i data-lucide="heart-pulse"></i><span><small>Estado de jugadoras</small><strong>Carga y bienestar</strong></span></span>
      <span class="coach-wellness-compact-metrics">
        <span class="tone-low"><b>${wellness.green||0}</b><small>Fatiga baja</small></span>
        <span class="tone-medium"><b>${wellness.yellow||0}</b><small>Fatiga moderada</small></span>
        <span class="tone-high"><b>${wellness.red||0}</b><small>Fatiga alta</small></span>
      </span>
      <span class="coach-wellness-compact-link">Ver detalle <i data-lucide="chevron-right"></i></span>
    </button>`;
  try { window.lucide?.createIcons?.(); } catch(_){}
}

function addAttendanceToTrainingControl(){
  if(!isCoach()) return;
  const container=document.getElementById('coach-attendance-list');
  if(!container) return;
  const old=container.querySelector('.coach-training-attendance-summary');
  if(old) old.remove();
  const firstSection=container.querySelector('.coach-control-section');
  if(!firstSection) return;
  const summary=document.createElement('div');
  summary.className='coach-training-attendance-summary';
  summary.innerHTML=`<span><i data-lucide="clipboard-check"></i> Asistencia media del equipo</span><strong>${teamAttendance()}%</strong>`;
  container.insertBefore(summary,firstSection);
  try { window.lucide?.createIcons?.(); } catch(_){}
}

function injectCss(){
  if(document.getElementById('coach-dashboard-compact-summary-css')) return;
  const style=document.createElement('style');
  style.id='coach-dashboard-compact-summary-css';
  style.textContent=`
.coach-wellness-compact-wrap{margin:1rem 0}
.coach-wellness-compact-card{width:100%;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.92);border-radius:18px;padding:.9rem 1rem;display:grid;grid-template-columns:minmax(150px,1fr) auto auto;gap:1rem;align-items:center;text-align:left;box-shadow:0 8px 24px rgba(15,23,42,.06);cursor:pointer;color:inherit}
.coach-wellness-compact-title{display:flex;align-items:center;gap:.7rem}.coach-wellness-compact-title>i{width:22px;height:22px;color:#10b981}.coach-wellness-compact-title span{display:flex;flex-direction:column}.coach-wellness-compact-title small{font-size:.72rem;color:#64748b;font-weight:700}.coach-wellness-compact-title strong{font-size:.95rem;color:#0f172a}
.coach-wellness-compact-metrics{display:flex;gap:.55rem;align-items:center}.coach-wellness-compact-metrics>span{min-width:92px;padding:.45rem .65rem;border-radius:12px;display:flex;align-items:baseline;gap:.35rem}.coach-wellness-compact-metrics b{font-size:1.05rem}.coach-wellness-compact-metrics small{font-size:.7rem;font-weight:700;white-space:nowrap}.coach-wellness-compact-metrics .tone-low{background:#ecfdf5;color:#047857}.coach-wellness-compact-metrics .tone-medium{background:#fffbeb;color:#b45309}.coach-wellness-compact-metrics .tone-high{background:#fef2f2;color:#b91c1c}
.coach-wellness-compact-link{display:flex;align-items:center;gap:.2rem;color:#475569;font-size:.78rem;font-weight:800;white-space:nowrap}.coach-wellness-compact-link i{width:16px;height:16px}
.coach-training-attendance-summary{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem .85rem;margin:0 0 .75rem;border-radius:12px;background:rgba(248,250,252,.9);border:1px solid #e2e8f0}.coach-training-attendance-summary span{display:flex;align-items:center;gap:.45rem;color:#475569;font-size:.8rem;font-weight:700}.coach-training-attendance-summary span i{width:17px;height:17px}.coach-training-attendance-summary strong{font-size:1rem;color:#0f172a}
@media(max-width:700px){.coach-wellness-compact-card{grid-template-columns:1fr;gap:.7rem}.coach-wellness-compact-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem}.coach-wellness-compact-metrics>span{min-width:0;display:flex;flex-direction:column;gap:.05rem}.coach-wellness-compact-metrics small{white-space:normal}.coach-wellness-compact-link{justify-self:end}}
`;
  document.head.appendChild(style);
}

function install(){
  if(window[FLAG]) return;
  const homeBase=window.renderHomeDashboard;
  const attendanceBase=window.renderCoachAttendanceList;
  if(typeof homeBase!=='function'||typeof attendanceBase!=='function'){
    setTimeout(install,120);
    return;
  }
  window[FLAG]=true;
  injectCss();

  const homeWrapped=function(){
    const result=homeBase.apply(this,arguments);
    compactHomeSummary();
    return result;
  };
  const attendanceWrapped=function(){
    const result=attendanceBase.apply(this,arguments);
    addAttendanceToTrainingControl();
    return result;
  };
  window.renderHomeDashboard=homeWrapped;
  window.renderCoachAttendanceList=attendanceWrapped;
  try { homeWrapped(); } catch(_){}
  try { attendanceWrapped(); } catch(_){}
}

setTimeout(install,0);
})();
