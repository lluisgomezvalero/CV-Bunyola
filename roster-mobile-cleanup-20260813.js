(function(){
'use strict';

const FLAG='__volleyRosterMobileCleanup20260813';

function normalizeName(value){
  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .trim()
    .toLowerCase();
}

function removeLegacyJuliaRiera(){
  try{
    if(typeof appState==='undefined'||!appState||!Array.isArray(appState.players)) return false;
    const ghosts=appState.players.filter(player=>normalizeName(player?.name)==='julia riera');
    if(!ghosts.length) return false;

    const ghostIds=new Set(ghosts.map(player=>String(player?.id||'')).filter(Boolean));
    const ghostUsers=new Set(ghosts.map(player=>String(player?.username||'')).filter(Boolean));

    appState.players=appState.players.filter(player=>normalizeName(player?.name)!=='julia riera');

    if(Array.isArray(appState.users)){
      appState.users=appState.users.filter(user=>{
        if(normalizeName(user?.name)==='julia riera') return false;
        if(user?.playerId&&ghostIds.has(String(user.playerId))) return false;
        if(user?.username&&ghostUsers.has(String(user.username))) return false;
        return true;
      });
    }

    if(typeof saveAppData==='function') saveAppData(appState);
    console.info('[RosterCleanup] Eliminado registro local antiguo de Julia Riera.');
    return true;
  }catch(error){
    console.warn('[RosterCleanup] No se pudo limpiar Julia Riera',error);
    return false;
  }
}

function injectStyles(){
  if(document.getElementById('roster-mobile-cleanup-20260813-css')) return;
  const style=document.createElement('style');
  style.id='roster-mobile-cleanup-20260813-css';
  style.textContent=`
    /* Las acciones de entrenador viven dentro de la ficha, no encima de la tarjeta. */
    .trading-card-coach-actions{display:none!important}

    @media(max-width:960px){
      /* La navegación global no debe cubrir una ficha modal. */
      body:has(#modal-player-detail.active) #volley-mobile-quick-nav{display:none!important}

      #modal-player-detail.active{padding-bottom:0!important}
      #modal-player-detail .modal-content{
        max-height:calc(100svh - max(12px,env(safe-area-inset-top,0px)))!important;
        max-height:calc(100dvh - max(12px,env(safe-area-inset-top,0px)))!important;
        overflow-y:auto!important;
        overscroll-behavior:contain!important;
        -webkit-overflow-scrolling:touch;
      }
      #modal-player-detail .modal-body{
        padding-bottom:calc(2rem + env(safe-area-inset-bottom,0px))!important;
      }
      #modal-player-detail .passport-coach-tools,
      #modal-player-detail .passport-actions{
        margin-bottom:calc(.75rem + env(safe-area-inset-bottom,0px))!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function install(){
  if(window[FLAG]) return;
  if(typeof appState==='undefined'){
    setTimeout(install,120);
    return;
  }
  window[FLAG]=true;
  injectStyles();
  if(removeLegacyJuliaRiera()){
    try{if(typeof renderRoster==='function') renderRoster();}catch(_){}
  }
}

setTimeout(install,0);
})();
