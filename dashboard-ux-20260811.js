(function(){
'use strict';
const FLAG='__dashboardUx20260811';

function isCoach(){
  try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}
}

function makeEmptyTrainingCardInteractive(){
  if(!isCoach()) return;
  const root=document.getElementById('home-dashboard');
  const card=root?.querySelector('.dashboard-card-training');
  if(!card) return;
  const empty=String(card.textContent||'').includes('Sin entrenamiento programado');
  if(!empty){
    card.classList.remove('dashboard-training-empty-interactive');
    card.removeAttribute('role');
    card.removeAttribute('tabindex');
    card.removeAttribute('aria-label');
    card.onclick=null;
    card.onkeydown=null;
    return;
  }
  card.classList.add('dashboard-training-empty-interactive');
  card.setAttribute('role','button');
  card.setAttribute('tabindex','0');
  card.setAttribute('aria-label','Abrir entrenamientos para programar una sesión');
  card.onclick=function(event){
    if(event.target?.closest?.('button,a,input,select,textarea')) return;
    if(typeof openModule==='function') openModule('training',{returnTarget:'home-portal'});
  };
  card.onkeydown=function(event){
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      if(typeof openModule==='function') openModule('training',{returnTarget:'home-portal'});
    }
  };
}

function injectStyles(){
  if(document.getElementById('dashboard-ux-20260811-css')) return;
  const style=document.createElement('style');
  style.id='dashboard-ux-20260811-css';
  style.textContent=`
.dashboard-training-empty-interactive{cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.dashboard-training-empty-interactive:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(15,23,42,.10);border-color:rgba(59,130,246,.30)}
.dashboard-training-empty-interactive:focus-visible{outline:3px solid rgba(59,130,246,.25);outline-offset:3px}
`;
  document.head.appendChild(style);
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
  const wrapped=function(){
    const result=base.apply(this,arguments);
    setTimeout(makeEmptyTrainingCardInteractive,0);
    return result;
  };
  window.renderHomeDashboard=wrapped;
  try{wrapped();}catch(_){}
  const observer=new MutationObserver(()=>makeEmptyTrainingCardInteractive());
  const root=document.getElementById('home-dashboard');
  if(root) observer.observe(root,{childList:true,subtree:true});
}

setTimeout(install,0);
})();