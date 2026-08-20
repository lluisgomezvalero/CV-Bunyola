(function(){
'use strict';
if(window.__wellnessRenderController20260820)return;
window.__wellnessRenderController20260820=true;

let timer=0;
let attempts=0;

function root(){return document.getElementById('view-wellness');}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null;}catch(_){return null;}}
function closePlayerDetail(){
  const modal=document.getElementById('modal-player-detail');
  if(!modal?.classList.contains('active'))return;
  const close=modal.querySelector('.modal-close,.modal-close-btn,[data-action="close"]');
  if(close){try{close.click();return;}catch(_){}}
  modal.classList.remove('active');
  document.body.classList.remove('modal-open','profile-modal-open','player-detail-modal-open','volley-player-detail-open','volley-modal-open-any');
}
function kick(){
  const view=root();
  if(!view?.classList.contains('active'))return false;
  closePlayerDetail();
  const user=currentUser();
  if(!user?.role)return false;
  view.classList.toggle('wellness-unified-role-kick');
  requestAnimationFrame(()=>view.classList.toggle('wellness-unified-role-kick'));
  return true;
}
function fastRetry(){
  clearTimeout(timer);
  attempts=0;
  const run=()=>{
    const view=root();
    if(!view?.classList.contains('active'))return;
    if(document.documentElement.classList.contains('wellness-unified-ready'))return;
    kick();
    attempts+=1;
    if(attempts<60)timer=setTimeout(run,25);
  };
  run();
}
function install(){
  const view=root();
  if(!view)return;
  let active=view.classList.contains('active');
  if(active)fastRetry();
  new MutationObserver(()=>{
    const now=view.classList.contains('active');
    if(now&&!active){
      document.documentElement.classList.remove('wellness-unified-ready');
      closePlayerDetail();
      fastRetry();
    }
    active=now;
  }).observe(view,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view.classList.contains('active'))fastRetry();});
  window.addEventListener('focus',()=>{if(view.classList.contains('active'))fastRetry();},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
