(function(){
'use strict';

if(document.getElementById('volley-sidebar-viewport-stability-css')) return;

const style=document.createElement('style');
style.id='volley-sidebar-viewport-stability-css';
style.textContent=`
  /* Android/tablet: keep the fixed sidebar independent from browser chrome resizing. */
  .volley-side-nav{
    top:0!important;
    bottom:auto!important;
    height:100vh!important;
    height:100svh!important;
    max-height:100svh!important;
    overflow:hidden!important;
    background:#fff!important;
    backdrop-filter:none!important;
    -webkit-backdrop-filter:none!important;
    isolation:isolate!important;
    will-change:auto!important;
  }
  .volley-side-brand{
    flex:0 0 auto!important;
    position:relative!important;
    z-index:3!important;
    background:#fff!important;
  }
  .volley-side-scroll{
    flex:1 1 auto!important;
    min-height:0!important;
    position:relative!important;
    z-index:1!important;
    overflow-y:auto!important;
    background:#fff!important;
    overscroll-behavior:contain!important;
    -webkit-overflow-scrolling:touch;
  }
  .volley-side-footer{
    flex:0 0 auto!important;
    position:relative!important;
    z-index:4!important;
    background:#f8fafc!important;
    opacity:1!important;
    visibility:visible!important;
    transform:none!important;
    will-change:auto!important;
  }
  .volley-side-footer,.volley-side-footer *{
    backface-visibility:visible!important;
    -webkit-backface-visibility:visible!important;
  }
  @media(max-width:960px){
    .volley-nav-overlay{
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
    }
  }
`;
document.head.appendChild(style);
})();
