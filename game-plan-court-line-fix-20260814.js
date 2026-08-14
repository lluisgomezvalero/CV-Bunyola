(function(){
'use strict';

const FLAG='__gamePlanCourtLineFix20260814';
if(window[FLAG])return;
window[FLAG]=true;

function injectStyles(){
  if(document.getElementById('game-plan-court-line-fix-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-court-line-fix-20260814-css';
  style.textContent=`
/* Una sola fuente para las líneas de pista: elementos .attack-line explícitos. */
#view-tactics .attack-card-court::before,
#view-tactics .attack-card-court::after{
  content:none!important;
  display:none!important;
}
#view-tactics .attack-card-court>.attack-line-3m{
  display:block!important;
  top:33.333%!important;
}
#view-tactics .attack-card-court>.attack-line-end{
  display:block!important;
  bottom:0!important;
}
`;
  document.head.appendChild(style);
}

function normalizeCourt(court){
  if(!court)return;

  const threeMeter=[...court.querySelectorAll(':scope > .attack-line-3m')];
  if(threeMeter.length===0){
    const line=document.createElement('div');
    line.className='attack-line attack-line-3m';
    const net=court.querySelector(':scope > .attack-court-net');
    if(net)net.insertAdjacentElement('afterend',line);
    else court.prepend(line);
  }else if(threeMeter.length>1){
    threeMeter.slice(1).forEach(line=>line.remove());
  }

  const endLines=[...court.querySelectorAll(':scope > .attack-line-end')];
  if(endLines.length>1)endLines.slice(1).forEach(line=>line.remove());
}

function normalizeAll(root=document){
  root.querySelectorAll?.('.attack-card-court').forEach(normalizeCourt);
}

function observe(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.__courtLineFixObserver20260814)return;
  root.__courtLineFixObserver20260814=true;
  let frame=0;
  const observer=new MutationObserver(()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>normalizeAll(root));
  });
  observer.observe(root,{childList:true,subtree:true});
  normalizeAll(root);
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__courtLineFix20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(()=>{
      normalizeAll(document.getElementById('scouting-interactive-root')||document);
      observe();
    });
    return out;
  };
  wrapped.__courtLineFix20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=wrapRender();
    observe();
    if(ready){
      clearInterval(timer);
      setTimeout(()=>normalizeAll(document.getElementById('scouting-interactive-root')||document),0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
