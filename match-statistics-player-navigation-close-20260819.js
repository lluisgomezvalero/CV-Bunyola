(function(){
'use strict';

const FLAG='__matchStatisticsPlayerNavigationClose20260819';
if(window[FLAG])return;
window[FLAG]=true;

function playerStatsModal(){
  return document.getElementById('modal-player-match-stats');
}

function closePlayerStats(){
  const modal=playerStatsModal();
  if(!modal||!modal.classList.contains('active'))return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden','true');
}

function isNavigationClick(target){
  if(!(target instanceof Element))return false;
  return Boolean(target.closest(
    '#mobile-bottom-nav .nav-item,'+
    '#mobile-bottom-nav button,'+
    '#desktop-quick-nav .desktop-nav-item,'+
    '#module-header-nav [data-target],'+
    '#module-back-btn,'+
    '#volley-navigation-shell [data-volley-target],'+
    '[data-module-target]'
  ));
}

function activePortalView(){
  return document.querySelector('.app-portal-wrapper .page-view.active');
}

function syncAfterNavigation(){
  const modal=playerStatsModal();
  if(!modal?.classList.contains('active'))return;
  const view=activePortalView();
  if(view&&view.id!=='view-stats')closePlayerStats();
}

function install(){
  document.addEventListener('click',event=>{
    if(isNavigationClick(event.target))closePlayerStats();
  },true);

  const wrapper=document.querySelector('.app-portal-wrapper');
  if(wrapper){
    new MutationObserver(records=>{
      if(records.some(record=>record.type==='attributes'&&record.attributeName==='class')){
        requestAnimationFrame(syncAfterNavigation);
      }
    }).observe(wrapper,{subtree:true,attributes:true,attributeFilter:['class']});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
