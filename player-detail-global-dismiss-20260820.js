(function(){
'use strict';
if(window.__playerDetailGlobalDismiss20260820)return;
window.__playerDetailGlobalDismiss20260820=true;

function closePlayerDetail(){
  const modal=document.getElementById('modal-player-detail');
  if(!modal?.classList.contains('active'))return false;
  const close=modal.querySelector('.modal-close,.modal-close-btn,[data-action="close"]');
  if(close){
    try{close.click();return true;}catch(_){}
  }
  modal.classList.remove('active');
  document.body.classList.remove('modal-open','profile-modal-open','player-detail-modal-open','volley-player-detail-open','volley-modal-open-any');
  return true;
}

function wrapOpenModule(){
  const original=window.openModule;
  if(typeof original!=='function'||original.__playerDetailDismissWrapped)return;
  const wrapped=function(){
    closePlayerDetail();
    return original.apply(this,arguments);
  };
  wrapped.__playerDetailDismissWrapped=true;
  window.openModule=wrapped;
}

function install(){
  wrapOpenModule();
  document.addEventListener('click',event=>{
    const modal=document.getElementById('modal-player-detail');
    if(!modal?.classList.contains('active'))return;
    if(event.target.closest('#modal-player-detail .modal-content'))return;
    closePlayerDetail();
  },true);

  let attempts=0;
  const timer=setInterval(()=>{
    wrapOpenModule();
    attempts+=1;
    if((typeof window.openModule==='function'&&window.openModule.__playerDetailDismissWrapped)||attempts>40)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
