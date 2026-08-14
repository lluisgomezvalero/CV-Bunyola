(function(){
'use strict';

const FLAG='__gamePlanReadTrackerCompact20260814';
if(window[FLAG])return;
window[FLAG]=true;

function coachEditing(){
  try{
    const user=typeof getCurrentUser==='function'?getCurrentUser():null;
    const role=String(user?.role||'').toLowerCase();
    const coach=(typeof isCoachUser==='function'&&isCoachUser())||['coach','admin','administrator'].includes(role)||document.getElementById('view-tactics')?.classList.contains('game-plan-coach');
    const preview=typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode;
    return Boolean(coach&&!preview);
  }catch(_){return false;}
}

function compactTracker(){
  const view=document.getElementById('view-tactics');
  const tracker=document.querySelector('#scouting-interactive-root .plan-read-tracker');
  if(!view||!tracker||!coachEditing())return;

  tracker.classList.add('coach-read-line');

  const head=tracker.querySelector('.plan-read-tracker-head');
  const label=head?.querySelector('small');
  const title=head?.querySelector('strong');
  const progress=head?.querySelector('.plan-read-progress');
  const ratio=String(progress?.textContent||'').trim();

  if(label)label.textContent='Seguimiento';
  if(title&&ratio)title.textContent=`${ratio} vistos`;
  if(progress)progress.setAttribute('aria-hidden','true');

  const toggle=tracker.querySelector('[data-plan-read-toggle]');
  if(toggle){
    const expanded=toggle.getAttribute('aria-expanded')==='true';
    const textNode=[...toggle.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
    if(textNode)textNode.nodeValue=expanded?' Ocultar ':' Ver detalle ';
  }
}

function installToggleSync(){
  if(document.documentElement.dataset.gamePlanReadCompactToggle==='1')return;
  document.documentElement.dataset.gamePlanReadCompactToggle='1';
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-plan-read-toggle]');
    if(!button)return;
    setTimeout(compactTracker,0);
  });
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__readTrackerCompact20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(compactTracker);
    return out;
  };
  wrapped.__readTrackerCompact20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function observe(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.dataset.readTrackerCompactObserved==='1')return;
  root.dataset.readTrackerCompactObserved='1';
  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;compactTracker();});
  }).observe(root,{childList:true,subtree:true,characterData:true});
}

function injectStyles(){
  if(document.getElementById('game-plan-read-tracker-compact-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-read-tracker-compact-20260814-css';
  style.textContent=`
@media(max-width:720px){
  #view-tactics .plan-read-tracker.coach-read-line{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    align-items:center!important;
    gap:.38rem .55rem!important;
    padding:.52rem .62rem!important;
    border-radius:12px!important;
    min-height:0!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head{
    grid-column:1!important;
    display:flex!important;
    align-items:center!important;
    gap:.42rem!important;
    min-width:0!important;
    margin:0!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head>div{
    display:flex!important;
    align-items:baseline!important;
    gap:.38rem!important;
    min-width:0!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head small{
    margin:0!important;
    font-size:.6rem!important;
    line-height:1!important;
    letter-spacing:.055em!important;
    white-space:nowrap!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head strong{
    margin:0!important;
    font-size:.78rem!important;
    line-height:1.1!important;
    white-space:nowrap!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-progress{
    display:none!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-summary{
    grid-column:2!important;
    display:block!important;
    margin:0!important;
    padding:0!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-summary>span{
    display:none!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-summary button{
    margin:0!important;
    padding:.28rem .1rem!important;
    font-size:.65rem!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-summary button svg{
    width:13px!important;
    height:13px!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-progress-bar{
    grid-column:1/-1!important;
    height:4px!important;
    margin:0!important;
  }
  #view-tactics .plan-read-tracker.coach-read-line .plan-read-details{
    grid-column:1/-1!important;
    margin-top:.25rem!important;
    padding-top:.55rem!important;
    gap:.65rem!important;
  }
}
`;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  installToggleSync();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    wrapRender();
    observe();
    compactTracker();
    if(tries>120||document.getElementById('scouting-interactive-root')){
      if(tries>8)clearInterval(timer);
    }
  },120);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
