(function(){
'use strict';
const FLAG='__matchStatisticsPlayerModalScrollFix20260819';
if(window[FLAG])return;window[FLAG]=true;
function install(){
  if(document.getElementById('match-statistics-player-modal-scroll-fix-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-player-modal-scroll-fix-style';
  style.textContent=`
    #modal-player-match-stats .modal-content{display:flex!important;flex-direction:column!important;overflow:hidden!important}
    #modal-player-match-stats .modal-header{flex:0 0 auto!important}
    #modal-player-match-stats .modal-body{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding-bottom:1.5rem!important}
    #modal-player-match-stats .player-stat-section:last-child{margin-bottom:1rem!important}
    @media(max-width:560px){
      #modal-player-match-stats{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;padding:0!important;align-items:stretch!important;justify-content:stretch!important;background:#f8fafc!important}
      #modal-player-match-stats .modal-content{width:100%!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}
      #modal-player-match-stats .modal-header{position:relative!important;z-index:3!important;min-height:58px!important;padding:.78rem .9rem!important;background:#fff!important;border-bottom:1px solid #e2e8f0!important;box-shadow:0 1px 0 #e2e8f0!important}
      #modal-player-match-stats .modal-header h3{font-size:1rem!important;line-height:1.2!important;padding-right:.4rem!important}
      #modal-player-match-stats .modal-close{width:36px!important;height:36px!important;min-width:36px!important;display:grid!important;place-items:center!important}
      #modal-player-match-stats .modal-body{
        padding:.8rem .85rem calc(120px + env(safe-area-inset-bottom,0px))!important;
        scroll-padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))!important;
        background:#fbfcfe!important;
      }
      #modal-player-match-stats .player-stat-section:last-child{margin-bottom:1.25rem!important}
      body:has(#modal-player-match-stats.active) #module-header-nav{visibility:hidden!important;pointer-events:none!important}
    }
  `;
  document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
