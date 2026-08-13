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
      body.volley-global-context #modal-player-detail.active,
      body.volley-global-context #modal-add-wellness.active{
        top:calc(var(--volley-shell-top-h,58px) + 10px)!important;
        bottom:calc(var(--volley-shell-bottom-h,0px) + 10px)!important;
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
let resizeObserver=null;
function visibleHeight(element,fallback=0){
  if(!element)return fallback;
  const style=getComputedStyle(element);
  if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0')return 0;
  const rect=element.getBoundingClientRect?.();
  if(!rect||rect.height<=0||rect.width<=0)return 0;
  return Math.ceil(rect.height);
}
function measureShell(){
  measureFrame=0;
  if(window.innerWidth>960)return;
  const top=document.querySelector('.volley-mobile-bar');
  const bottom=document.getElementById('volley-mobile-quick-nav');
  const topHeight=visibleHeight(top,58);
  const bottomHeight=visibleHeight(bottom,0);
  document.documentElement.style.setProperty('--volley-shell-top-h',`${Math.max(0,topHeight)}px`);
  document.documentElement.style.setProperty('--volley-shell-bottom-h',`${Math.max(0,bottomHeight)}px`);
}
function scheduleMeasure(){
  if(measureFrame)return;
  measureFrame=requestAnimationFrame(measureShell);
}
function observeBars(){
  if(typeof ResizeObserver!=='function')return;
  resizeObserver?.disconnect?.();
  resizeObserver=new ResizeObserver(scheduleMeasure);
  const top=document.querySelector('.volley-mobile-bar');
  const bottom=document.getElementById('volley-mobile-quick-nav');
  if(top)resizeObserver.observe(top);
  if(bottom)resizeObserver.observe(bottom);
}
window.syncVolleyShellMeasure=scheduleMeasure;

function install(){
  injectStyles();
  scheduleMeasure();
  setTimeout(()=>{observeBars();scheduleMeasure();},100);
  setTimeout(()=>{observeBars();scheduleMeasure();},600);

  window.addEventListener('resize',scheduleMeasure,{passive:true});
  window.addEventListener('orientationchange',scheduleMeasure,{passive:true});
  window.visualViewport?.addEventListener?.('resize',scheduleMeasure,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){observeBars();scheduleMeasure();}});
  window.addEventListener('focus',scheduleMeasure,{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
