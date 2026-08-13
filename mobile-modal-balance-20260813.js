(function(){
'use strict';

const FLAG='__volleyMobileModalBalance20260813';
if(window[FLAG])return;
window[FLAG]=true;

function injectStyles(){
  if(document.getElementById('volley-mobile-modal-balance-css'))return;
  const style=document.createElement('style');
  style.id='volley-mobile-modal-balance-css';
  style.textContent=`
    @media(max-width:960px){
      /* Ficha de jugadora y bienestar: mismo hueco visual respecto a las dos barras. */
      body.volley-global-context #modal-player-detail.active,
      body.volley-global-context #modal-add-wellness.active{
        top:calc(var(--volley-shell-top-h,58px) + 10px)!important;
        bottom:calc(var(--volley-shell-bottom-h,68px) + 10px)!important;
        height:auto!important;
        min-height:0!important;
        padding:0 .55rem!important;
        align-items:center!important;
        justify-content:center!important;
      }
      body.volley-global-context #modal-player-detail.active>.modal-content,
      body.volley-global-context #modal-add-wellness.active>.modal-content{
        max-height:100%!important;
        min-height:0!important;
        margin:0!important;
      }
      body.volley-global-context #modal-player-detail.active .player-passport-modal{
        height:100%!important;
        max-height:100%!important;
        min-height:0!important;
      }

      /* Android: evitar repintados costosos durante el scroll del pasaporte. */
      body.volley-global-context #modal-player-detail .modal-content{
        background:#fff!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        box-shadow:0 12px 28px rgba(15,23,42,.16)!important;
      }
      body.volley-global-context #modal-player-detail .modal-body{
        touch-action:pan-y!important;
        overscroll-behavior:contain!important;
        scrollbar-gutter:auto!important;
        -webkit-overflow-scrolling:touch!important;
      }
      body.volley-global-context #modal-player-detail .passport-identity p span,
      body.volley-global-context #modal-player-detail .passport-identity p strong{
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }
      body.volley-global-context #modal-player-detail .passport-cover-glow{filter:none!important}
      body.volley-global-context #modal-player-detail .passport-progress-card{
        box-shadow:0 8px 22px rgba(15,23,42,.10)!important;
      }
    }
  `;
  document.head.appendChild(style);
}

let measureFrame=0;
function measureShell(){
  measureFrame=0;
  if(window.innerWidth>960)return;
  const top=document.querySelector('.volley-mobile-bar');
  const bottom=document.getElementById('volley-mobile-quick-nav');
  const topHeight=Math.ceil(top?.getBoundingClientRect?.().height||58);
  const bottomHeight=Math.ceil(bottom?.getBoundingClientRect?.().height||68);
  document.documentElement.style.setProperty('--volley-shell-top-h',`${Math.max(1,topHeight)}px`);
  document.documentElement.style.setProperty('--volley-shell-bottom-h',`${Math.max(1,bottomHeight)}px`);
}
function scheduleMeasure(){
  if(measureFrame)return;
  measureFrame=requestAnimationFrame(measureShell);
}

function install(){
  injectStyles();
  scheduleMeasure();
  setTimeout(scheduleMeasure,100);
  setTimeout(scheduleMeasure,500);

  window.addEventListener('resize',scheduleMeasure,{passive:true});
  window.addEventListener('orientationchange',scheduleMeasure,{passive:true});
  window.visualViewport?.addEventListener?.('resize',scheduleMeasure,{passive:true});

  const navShell=document.getElementById('volley-navigation-shell')||document.body;
  new MutationObserver(scheduleMeasure).observe(navShell,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleMeasure();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
