(function(){
'use strict';

const FLAG='__volleyMatchAttendanceMobileOpponentFix20260813';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}

function installRollCallViewportGuard(){
  const modal=document.getElementById('modal-verify-attendance');
  if(!modal)return;
  const sync=()=>{
    const open=modal.classList.contains('active');
    document.body.classList.toggle('volley-rollcall-open',open);
    requestAnimationFrame(()=>window.syncVolleyShellMeasure?.());
  };
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(modal,{attributes:true,attributeFilter:['class']});
}

function installSaveEventOpponentBridge(){
  const api=window.VolleySupabase;
  if(!api||typeof api.saveEvent!=='function'){
    setTimeout(installSaveEventOpponentBridge,120);
    return;
  }
  if(api.saveEvent.__opponentBridge20260813)return;
  const base=api.saveEvent;
  const wrapped=async function(evt){
    if(evt&&MATCH_TYPES.has(evt.type)){
      const select=document.getElementById('match-opponent-select');
      const selected=String(select?.value||'').trim();
      if(selected&&selected.toLowerCase()!=='rival')evt.opponent=selected;
      else if(evt.opponent==null)evt.opponent='';
    }
    return base.apply(this,arguments);
  };
  wrapped.__opponentBridge20260813=true;
  api.saveEvent=wrapped;
}

function installMatchLogoOpponentSource(){
  if(typeof window.getMatchLogosData!=='function'){
    setTimeout(installMatchLogoOpponentSource,120);
    return;
  }
  if(window.getMatchLogosData.__opponentSource20260813)return;
  const base=window.getMatchLogosData;
  const wrapped=function(evt){
    const data=base.apply(this,arguments);
    const opponent=String(evt?.opponent||'').trim();
    if(!opponent||!data)return data;

    const title=String(evt?.title||'');
    const hasExplicitTitleMatch=/\s+vs\s+/i.test(title);
    const containsFallback=[data?.team1?.name,data?.team2?.name].some(name=>String(name||'').trim().toLowerCase()==='rival');
    if(hasExplicitTitleMatch&&!containsFallback)return data;

    const s=state();
    const league=(s?.leagueTable||[]).find(team=>String(team?.name||'').trim().toLowerCase()===opponent.toLowerCase());
    const logo=(league?.logo&&league.logo!=='assets/default_avatar.svg')?league.logo:'assets/default_avatar.svg';
    const rivalTeam={
      name:opponent,
      logo,
      condition:data.isHome?'✈️ Visitante (Fuera)':'🏠 Local (Casa)'
    };

    if(data.isHome)data.team2=rivalTeam;
    else data.team1=rivalTeam;
    return data;
  };
  wrapped.__opponentSource20260813=true;
  window.getMatchLogosData=wrapped;
}

function injectStyles(){
  if(document.getElementById('match-attendance-mobile-opponent-fix-css'))return;
  const style=document.createElement('style');
  style.id='match-attendance-mobile-opponent-fix-css';
  style.textContent=`
    @media(max-width:960px){
      body.volley-rollcall-open #volley-mobile-quick-nav{display:none!important}

      /* Pasar lista usa todo el espacio real hasta la parte inferior del viewport. */
      #modal-verify-attendance.active{
        top:var(--volley-shell-top-h,58px)!important;
        bottom:0!important;
        left:0!important;
        right:0!important;
        width:auto!important;
        height:auto!important;
        padding:10px!important;
        align-items:stretch!important;
        justify-content:center!important;
        background:rgba(15,23,42,.72)!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        overflow:hidden!important;
      }
      #modal-verify-attendance.active .modal-content{
        width:min(100%,580px)!important;
        height:100%!important;
        max-height:100%!important;
        min-height:0!important;
        margin:0 auto!important;
        border-radius:18px!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        overscroll-behavior:contain!important;
      }
      #modal-verify-attendance.active .modal-header{flex:0 0 auto!important}
      #modal-verify-attendance.active .modal-body{
        flex:1 1 auto!important;
        min-height:0!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        padding:.75rem .85rem 0!important;
      }
      #modal-verify-attendance.active #form-verify-attendance{
        flex:1 1 auto!important;
        min-height:0!important;
        display:flex!important;
        flex-direction:column!important;
        overflow:hidden!important;
      }
      #modal-verify-attendance.active #verify-attendance-list-container{
        flex:1 1 auto!important;
        min-height:0!important;
        max-height:none!important;
        overflow-y:auto!important;
        overscroll-behavior:contain!important;
        -webkit-overflow-scrolling:touch!important;
        padding-right:.35rem!important;
        padding-bottom:.75rem!important;
      }
      /* Los botones ocupan espacio propio y no se superponen sobre la última jugadora. */
      #modal-verify-attendance.active #form-verify-attendance>div:last-child{
        position:static!important;
        flex:0 0 auto!important;
        margin:0 -.85rem!important;
        padding:10px .85rem!important;
        background:#fff!important;
        border-top:1px solid var(--border-subtle,#e2e8f0)!important;
        box-shadow:none!important;
        gap:.6rem!important;
      }
      #modal-verify-attendance.active #form-verify-attendance>div:last-child .btn{
        flex:1 1 0!important;
        min-width:0!important;
        min-height:44px!important;
        white-space:normal!important;
        line-height:1.15!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  installRollCallViewportGuard();
  installSaveEventOpponentBridge();
  installMatchLogoOpponentSource();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
