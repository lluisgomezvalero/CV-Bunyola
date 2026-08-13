(function(){
'use strict';

const FLAG='__volleyGlobalContextShell20260813';
if(window[FLAG])return;
window[FLAG]=true;

const TITLES={
  'view-home-portal':'Inicio',
  'view-training':'Entrenos',
  'view-calendar':'Calendario',
  'view-roster':'Plantilla',
  'view-wellness':'Bienestar y Carga',
  'view-tactics':'Plan de juego',
  'view-competition':'Competición',
  'view-goals':'Objetivos',
  'view-stats':'Estadísticas',
  'view-planning':'Planificación',
  'view-fitness':'Rendimiento',
  'view-users':'Administración'
};

function currentUser(){
  try{return typeof window.getCurrentUser==='function'?window.getCurrentUser():null;}
  catch(_){return null;}
}
function isCoach(){
  try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}
  catch(_){return false;}
}
function isPlayer(){
  const user=currentUser();
  return Boolean(user&&user.role==='player'&&!isCoach());
}

function injectStyles(){
  if(document.getElementById('volley-global-context-shell-css'))return;
  const style=document.createElement('style');
  style.id='volley-global-context-shell-css';
  style.textContent=`
    @media(max-width:960px){
      body.volley-global-context .volley-mobile-bar{
        left:0!important;right:0!important;top:0!important;width:auto!important;
        height:calc(58px + env(safe-area-inset-top,0px))!important;
        padding:env(safe-area-inset-top,0px) 10px 0!important;
        display:grid!important;grid-template-columns:44px minmax(0,1fr) 44px!important;align-items:center!important;gap:.35rem!important;
        border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0 0 16px 16px!important;
        background:#fff!important;box-shadow:0 7px 20px rgba(15,23,42,.08)!important;
        backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:hidden!important;
      }
      body.volley-global-context .volley-mobile-bar>.volley-mobile-menu{
        width:44px!important;height:44px!important;border:0!important;border-radius:12px!important;
        background:transparent!important;color:#0f172a!important;box-shadow:none!important;display:grid!important;place-items:center!important;padding:0!important;
      }
      body.volley-global-context .volley-mobile-bar>strong{
        display:block!important;min-width:0!important;margin:0!important;color:#0f172a!important;
        font-family:var(--font-heading)!important;font-size:1.04rem!important;font-weight:850!important;text-align:left!important;
        white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
      }
      body.volley-global-context .volley-mobile-bar>.volley-mobile-profile{display:none!important}
      body.volley-global-context .app-portal-wrapper{
        padding-top:calc(70px + env(safe-area-inset-top,0px))!important;
        padding-bottom:calc(94px + env(safe-area-inset-bottom,0px))!important;
      }

      /* Las ventanas emergentes ocupan solo el espacio útil entre ambas barras. */
      body.volley-global-context .modal-backdrop.active{
        top:calc(58px + env(safe-area-inset-top,0px))!important;
        bottom:calc(68px + env(safe-area-inset-bottom,0px))!important;
        left:0!important;right:0!important;width:auto!important;height:auto!important;min-height:0!important;
        padding:.55rem!important;align-items:center!important;justify-content:center!important;
        overflow:hidden!important;z-index:8200!important;
      }
      body.volley-global-context .modal-backdrop.active>.modal-content,
      body.volley-global-context .modal-backdrop.active .modal-content{
        width:100%!important;max-height:100%!important;min-height:0!important;margin:0!important;
        border-radius:18px!important;overflow:hidden!important;
      }
      body.volley-global-context .modal-backdrop.active .modal-body{
        min-height:0!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;
      }
      body.volley-global-context #modal-player-detail.active .player-passport-modal{
        width:min(100%,1120px)!important;height:100%!important;min-height:0!important;max-height:100%!important;border-radius:18px!important;
      }
      body.volley-global-context #modal-player-detail.active .modal-body{padding-bottom:0!important}
      body.volley-global-context #modal-add-wellness.active{
        padding:.55rem!important;align-items:center!important;z-index:8200!important;
      }
      body.volley-global-context #modal-add-wellness.active .modal-content{
        max-height:100%!important;border-radius:18px!important;padding-bottom:0!important;
      }
      body.volley-global-context #modal-add-event.active .modal-content{max-height:100%!important;margin:0!important}
      body.volley-global-context #modal-add-event.active .modal-body{padding-bottom:1rem!important}
      body.volley-global-context #modal-add-event.active form>div:last-child{
        bottom:0!important;margin-bottom:0!important;padding:.7rem 0!important;
      }

      /* La navegación inferior sigue visible también dentro de fichas/modales. */
      body.volley-global-context:has(#modal-player-detail.active) #volley-mobile-quick-nav{display:grid!important}
      body.volley-global-context:has(.modal-backdrop.active) .roster-mobile-add{visibility:hidden!important;pointer-events:none!important}

      /* La posición es información de cuerpo técnico por ahora. */
      body.volley-player-positions-hidden #view-roster .roster-position-pill{display:none!important}
      body.volley-player-positions-hidden #modal-player-detail .passport-identity p>span:first-of-type{display:none!important}
    }
  `;
  document.head.appendChild(style);
}

function activeView(){
  return document.querySelector('.app-portal-wrapper>.page-view.active');
}
function syncHeader(){
  const user=currentUser();
  document.body.classList.toggle('volley-global-context',Boolean(user));
  document.body.classList.toggle('volley-player-positions-hidden',isPlayer());
  if(!user)return;
  const view=activeView();
  const title=document.getElementById('volley-mobile-title');
  if(title&&view?.id&&TITLES[view.id])title.textContent=TITLES[view.id];
}

function install(){
  injectStyles();
  syncHeader();

  const wrapper=document.querySelector('.app-portal-wrapper');
  if(wrapper){
    new MutationObserver(records=>{
      if(records.some(r=>r.target?.classList?.contains('page-view')))requestAnimationFrame(syncHeader);
    }).observe(wrapper,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  const bodyObserver=new MutationObserver(records=>{
    if(records.some(r=>r.target?.classList?.contains('modal-backdrop')))requestAnimationFrame(syncHeader);
  });
  bodyObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});

  let attempts=0;
  const timer=setInterval(()=>{
    syncHeader();
    attempts+=1;
    if((currentUser()&&document.getElementById('volley-mobile-title'))||attempts>40)clearInterval(timer);
  },150);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncHeader();});
  window.addEventListener('focus',syncHeader);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
