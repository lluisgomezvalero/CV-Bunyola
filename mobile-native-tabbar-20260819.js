(function(){
'use strict';

const FLAG='__mobileNativeTabbar20260819';
if(window[FLAG])return;
window[FLAG]=true;

const MOBILE='(max-width: 768px)';

function ensureStyles(){
  if(document.getElementById('mobile-native-tabbar-style'))return;
  const style=document.createElement('style');
  style.id='mobile-native-tabbar-style';
  style.textContent=`
    :root{
      --vc-tabbar-height:68px;
      --vc-safe-bottom:env(safe-area-inset-bottom,0px);
      --vc-tabbar-total:calc(var(--vc-tabbar-height) + var(--vc-safe-bottom));
    }

    @media(max-width:768px){
      html{min-height:100%;overscroll-behavior-x:none}
      body{
        min-height:100dvh!important;
        padding-bottom:var(--vc-tabbar-total)!important;
        overscroll-behavior-x:none;
        -webkit-tap-highlight-color:transparent;
      }

      .app-portal-wrapper{
        min-height:100dvh!important;
        padding-bottom:calc(var(--vc-tabbar-total) + 24px)!important;
      }

      .page-view.active{
        min-height:calc(100dvh - var(--vc-tabbar-total))!important;
      }

      .mobile-bottom-nav{
        display:flex!important;
        position:fixed!important;
        left:0!important;
        right:0!important;
        bottom:0!important;
        z-index:9200!important;
        height:var(--vc-tabbar-total)!important;
        min-height:var(--vc-tabbar-total)!important;
        padding:6px max(8px,env(safe-area-inset-right,0px)) calc(6px + var(--vc-safe-bottom)) max(8px,env(safe-area-inset-left,0px))!important;
        align-items:flex-start!important;
        justify-content:space-around!important;
        gap:2px!important;
        background:rgba(255,255,255,.965)!important;
        border-top:1px solid rgba(226,232,240,.96)!important;
        box-shadow:0 -10px 28px rgba(15,23,42,.08)!important;
        backdrop-filter:blur(18px)!important;
        -webkit-backdrop-filter:blur(18px)!important;
        transform:translate3d(0,0,0);
        transition:transform .2s ease,opacity .16s ease,visibility .16s ease!important;
        will-change:transform;
      }

      .mobile-bottom-nav .nav-item{
        position:relative!important;
        flex:1 1 0!important;
        width:auto!important;
        min-width:0!important;
        min-height:56px!important;
        margin:0!important;
        padding:5px 3px!important;
        border:0!important;
        border-radius:14px!important;
        background:transparent!important;
        color:#64748b!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:3px!important;
        font-size:.69rem!important;
        font-weight:750!important;
        line-height:1.05!important;
        touch-action:manipulation!important;
        user-select:none!important;
        -webkit-user-select:none!important;
        transition:transform .08s ease,color .16s ease,background .16s ease!important;
      }
      .mobile-bottom-nav .nav-item svg{
        width:23px!important;
        height:23px!important;
        stroke-width:2.15!important;
      }
      .mobile-bottom-nav .nav-item:active{
        transform:scale(.92)!important;
        background:#f8fafc!important;
      }
      .mobile-bottom-nav .nav-item.active{
        color:#b45309!important;
        background:#fff7ed!important;
      }
      .mobile-bottom-nav .nav-item.active::before{
        content:'';
        position:absolute;
        top:2px;
        left:50%;
        width:28px;
        height:3px;
        border-radius:999px;
        background:#d97706;
        transform:translateX(-50%);
      }

      body.vc-native-modal-open{
        overflow:hidden!important;
        padding-bottom:0!important;
      }
      body.vc-native-modal-open .mobile-bottom-nav{
        transform:translate3d(0,115%,0)!important;
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }

      .modal-backdrop.active,
      .centered-notice-modal.active,
      .avatar-crop-modal.active,
      #session-file-viewer.active{
        z-index:12000!important;
      }

      .modal-backdrop.active .modal-body,
      .centered-notice-modal.active,
      .avatar-crop-modal.active,
      #session-file-viewer.active{
        -webkit-overflow-scrolling:touch;
        overscroll-behavior:contain;
      }

      #modal-player-match-stats.active{
        position:fixed!important;
        inset:0!important;
        width:100%!important;
        height:100dvh!important;
        padding:0!important;
        align-items:stretch!important;
        justify-content:stretch!important;
        background:#f8fafc!important;
        overflow:hidden!important;
      }
      #modal-player-match-stats.active .modal-content{
        width:100%!important;
        max-width:none!important;
        height:100dvh!important;
        max-height:100dvh!important;
        margin:0!important;
        border-radius:0!important;
        display:flex!important;
        flex-direction:column!important;
        overflow:hidden!important;
        box-shadow:none!important;
      }
      #modal-player-match-stats.active .modal-header{
        flex:0 0 auto!important;
        position:relative!important;
        z-index:2!important;
        background:#fff!important;
      }
      #modal-player-match-stats.active .modal-body{
        flex:1 1 auto!important;
        min-height:0!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        padding-bottom:calc(32px + var(--vc-safe-bottom))!important;
        scroll-padding-bottom:calc(32px + var(--vc-safe-bottom))!important;
      }

      .page-view.vc-page-enter{
        animation:vcPageEnter .15s ease-out both;
      }
      @keyframes vcPageEnter{
        from{opacity:.72;transform:translate3d(0,4px,0)}
        to{opacity:1;transform:translate3d(0,0,0)}
      }

      @media(prefers-reduced-motion:reduce){
        .mobile-bottom-nav,.mobile-bottom-nav .nav-item,.page-view.vc-page-enter{transition:none!important;animation:none!important}
      }
    }
  `;
  document.head.appendChild(style);
}

function hasOpenOverlay(){
  return Boolean(document.querySelector(
    '.modal-backdrop.active,.centered-notice-modal.active,.avatar-crop-modal.active,#session-file-viewer.active'
  ));
}

function syncModalState(){
  if(!window.matchMedia(MOBILE).matches){
    document.body.classList.remove('vc-native-modal-open');
    return;
  }
  document.body.classList.toggle('vc-native-modal-open',hasOpenOverlay());
}

function animateActivePage(target){
  if(!(target instanceof Element)||!target.classList.contains('page-view')||!target.classList.contains('active'))return;
  target.classList.remove('vc-page-enter');
  void target.offsetWidth;
  target.classList.add('vc-page-enter');
  window.setTimeout(()=>target.classList.remove('vc-page-enter'),180);
}

function install(){
  ensureStyles();
  syncModalState();

  const observer=new MutationObserver(mutations=>{
    let overlayChanged=false;
    for(const mutation of mutations){
      if(mutation.type==='attributes'&&mutation.attributeName==='class'){
        const target=mutation.target;
        if(target instanceof Element){
          if(target.matches('.modal-backdrop,.centered-notice-modal,.avatar-crop-modal,#session-file-viewer'))overlayChanged=true;
          animateActivePage(target);
        }
      }
    }
    if(overlayChanged)syncModalState();
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});

  window.matchMedia(MOBILE).addEventListener?.('change',syncModalState);
  window.addEventListener('pageshow',syncModalState,{passive:true});

  document.addEventListener('click',event=>{
    const item=event.target.closest('.mobile-bottom-nav .nav-item');
    if(!item)return;
    item.classList.add('vc-tab-pressed');
    window.setTimeout(()=>item.classList.remove('vc-tab-pressed'),120);
  },{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
