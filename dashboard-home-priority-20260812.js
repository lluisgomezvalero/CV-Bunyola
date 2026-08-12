(function(){
'use strict';

const FLAG='__dashboardHomePriority20260812';

function isCoach(){
  try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}
  catch(_){return false;}
}

function injectStyles(){
  if(document.getElementById('dashboard-home-priority-css')) return;
  const style=document.createElement('style');
  style.id='dashboard-home-priority-css';
  style.textContent=`
    #home-dashboard.dashboard-home-priority .dashboard-lower-grid{margin-top:1rem}
    #home-dashboard.dashboard-home-priority .weekly-tracking-card{grid-column:1/-1}
    #home-dashboard.dashboard-home-priority .dashboard-home-result-compact{align-self:start}
    #home-dashboard.dashboard-home-priority .dashboard-home-result-compact .dashboard-result-block{margin-top:.7rem}
    #home-dashboard.dashboard-home-priority .coach-pending-card{grid-column:1/-1}
    @media(max-width:760px){
      #home-dashboard.dashboard-home-priority .dashboard-lower-grid{gap:.85rem}
    }
  `;
  document.head.appendChild(style);
}

function organizeCoachDashboard(){
  if(!isCoach()) return;
  const root=document.getElementById('home-dashboard');
  if(!root) return;
  root.classList.add('dashboard-home-priority');

  // El detalle completo de asistencia vive en Entrenos; Inicio solo muestra lo accionable.
  root.querySelector('.coach-attendance-card')?.remove();

  // Si no hay tareas pendientes, no ocupamos una tarjeta grande solo para decir "todo al día".
  root.querySelector('.coach-pending-card.is-clear')?.remove();

  const lower=root.querySelector('.dashboard-lower-grid');
  if(!lower) return;

  const children=[...lower.children];
  const pending=children.find(el=>el.classList?.contains('coach-pending-card'))||null;
  const weekly=children.find(el=>el.classList?.contains('weekly-tracking-card')||String(el.textContent||'').includes('Seguimiento semanal'))||null;
  const result=children.find(el=>String(el.textContent||'').includes('Último resultado'))||null;

  if(result) result.classList.add('dashboard-home-result-compact');

  [pending,weekly,result].filter(Boolean).forEach(el=>lower.appendChild(el));
}

function install(){
  if(window[FLAG]) return;
  const base=window.renderHomeDashboard;
  if(typeof base!=='function'){
    setTimeout(install,120);
    return;
  }
  window[FLAG]=true;
  injectStyles();
  window.renderHomeDashboard=function(){
    const result=base.apply(this,arguments);
    organizeCoachDashboard();
    return result;
  };
  try{window.renderHomeDashboard();}catch(_){}
}

setTimeout(install,0);
})();
