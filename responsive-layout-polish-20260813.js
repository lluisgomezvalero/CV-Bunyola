(function(){
'use strict';

const FLAG='__volleyResponsiveLayoutPolish20260813';
if(window[FLAG])return;
window[FLAG]=true;

function injectStyles(){
  if(document.getElementById('volley-responsive-layout-polish-css'))return;
  const style=document.createElement('style');
  style.id='volley-responsive-layout-polish-css';
  style.textContent=`
    @media(max-width:960px){
      body.volley-global-context #modal-player-detail.active,
      body.volley-global-context #modal-add-wellness.active{
        top:var(--volley-shell-top-h,58px)!important;
        bottom:var(--volley-shell-bottom-h,68px)!important;
        height:auto!important;
        min-height:0!important;
        padding:10px .55rem!important;
        background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }
      body.volley-global-context #modal-player-detail.active>.modal-content,
      body.volley-global-context #modal-add-wellness.active>.modal-content{
        max-height:100%!important;
        min-height:0!important;
        margin:0!important;
        background:#fff!important;
        border:1px solid rgba(226,232,240,.96)!important;
      }
      body.volley-global-context #modal-player-detail.active .player-passport-modal{
        height:100%!important;
        max-height:100%!important;
        min-height:0!important;
        background:#fff!important;
      }
    }

    @media(min-width:961px){
      body.volley-nav-ready .app-portal-wrapper>.page-view{
        width:100%!important;
        max-width:1600px!important;
      }
      body.volley-nav-ready #modal-player-detail .player-passport-modal{
        width:min(96vw,1280px)!important;
        max-width:1280px!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function syncPassportLabels(){
  document.querySelectorAll('#modal-player-detail .passport-metrics-grid article span').forEach(label=>{
    if(label.textContent.trim()==='Partidos')label.textContent='Partidos registrados';
  });
}

function install(){
  injectStyles();
  syncPassportLabels();
  const modal=document.getElementById('modal-player-detail');
  if(modal){
    new MutationObserver(()=>requestAnimationFrame(syncPassportLabels)).observe(modal,{subtree:true,childList:true});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
