(function(){
'use strict';
if(window.__tabletPlayerPassportFit20260820)return;
window.__tabletPlayerPassportFit20260820=true;
function install(){
  if(document.getElementById('tablet-player-passport-fit-20260820-style'))return;
  const style=document.createElement('style');
  style.id='tablet-player-passport-fit-20260820-style';
  style.textContent=`
  @media (min-width:961px) and (max-width:1366px) and (any-pointer:coarse){
    body.volley-nav-ready #modal-player-detail.active{
      left:256px!important;
      right:0!important;
      top:0!important;
      bottom:0!important;
      width:auto!important;
      height:auto!important;
      min-height:0!important;
      padding:12px!important;
      box-sizing:border-box!important;
      align-items:center!important;
      justify-content:center!important;
      overflow:hidden!important;
    }
    body.volley-nav-ready #modal-player-detail.active>.player-passport-modal,
    body.volley-nav-ready #modal-player-detail.active>.modal-content.player-passport-modal{
      width:100%!important;
      max-width:min(100%,1040px)!important;
      height:calc(100svh - 24px)!important;
      max-height:calc(100svh - 24px)!important;
      min-height:0!important;
      margin:0!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
      border-radius:18px!important;
    }
    body.volley-nav-ready #modal-player-detail.active .modal-body{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      overscroll-behavior:contain!important;
    }
    body.volley-nav-ready #modal-player-detail.active .modal-body>*{
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }
    body.volley-nav-ready #modal-player-detail.active .passport-hero,
    body.volley-nav-ready #modal-player-detail.active .passport-identity,
    body.volley-nav-ready #modal-player-detail.active .passport-progress-card,
    body.volley-nav-ready #modal-player-detail.active .passport-metrics-grid,
    body.volley-nav-ready #modal-player-detail.active .passport-status-panel,
    body.volley-nav-ready #modal-player-detail.active .passport-content-grid{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }
    body.volley-nav-ready #modal-player-detail.active .passport-metrics-grid{
      grid-template-columns:repeat(5,minmax(0,1fr))!important;
      gap:.7rem!important;
    }
    body.volley-nav-ready #modal-player-detail.active img{max-width:100%!important}
  }
  `;
  document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
