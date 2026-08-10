(function(){
'use strict';
const PATCH_FLAG='__rpePendingOverviewAuthoritative20260810';

function installStyle(){
  if(document.getElementById('rpe-pending-overview-authoritative-css')) return;
  const style=document.createElement('style');
  style.id='rpe-pending-overview-authoritative-css';
  style.textContent='#rpe-pending-authoritative{display:none!important}';
  document.head.appendChild(style);
}

function renderAuthoritativePendingOverview(playerId,nextTraining,playerConfirm){
  const pending=[];
  try{
    const daily=typeof getPlayerDailyStatus==='function'?getPlayerDailyStatus(playerId):null;
    if(daily&&!daily.isContestada) pending.push({icon:'heart-pulse',text:'Completar el bienestar de hoy',target:'wellness'});
  }catch(_){}

  let pendingRpe=[];
  try{
    const rows=typeof window.getPendingRpeEvents==='function'?window.getPendingRpeEvents():[];
    pendingRpe=Array.isArray(rows)?rows:[];
  }catch(_){ pendingRpe=[]; }
  if(pendingRpe.length) pending.push({icon:'activity',text:'Enviar el RPE del entrenamiento',target:'training'});

  if(nextTraining&&!playerConfirm) pending.push({icon:'calendar-check',text:'Confirmar asistencia al próximo entrenamiento',target:'training'});

  if(!pending.length){
    return '<article class="player-pending-overview all-done"><i data-lucide="circle-check-big"></i><div><span>Todo al día</span><strong>No tienes nada pendiente por contestar.</strong></div></article>';
  }
  return `<article class="player-pending-overview"><div><span>Te falta por contestar</span><strong>${pending.length===1?'Tienes 1 tarea pendiente':`Tienes ${pending.length} tareas pendientes`}</strong></div><div class="player-pending-actions">${pending.map(x=>`<button onclick="openModule('${x.target}')"><i data-lucide="${x.icon}"></i>${x.text}<i data-lucide="chevron-right"></i></button>`).join('')}</div></article>`;
}

function install(){
  installStyle();
  const existing=document.getElementById('rpe-pending-authoritative');
  if(existing) existing.remove();

  if(typeof window.renderPlayerPendingOverview!=='function'||typeof window.getPendingRpeEvents!=='function'){
    setTimeout(install,100);
    return;
  }
  if(window.renderPlayerPendingOverview[PATCH_FLAG]) return;

  renderAuthoritativePendingOverview[PATCH_FLAG]=true;
  window.renderPlayerPendingOverview=renderAuthoritativePendingOverview;
  try{ if(typeof window.renderHomeDashboard==='function') window.renderHomeDashboard(); }catch(_){}
}

setTimeout(install,0);
})();
