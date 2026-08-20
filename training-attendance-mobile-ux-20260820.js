(function(){
'use strict';
const FLAG='__trainingAttendanceMobileUx20260820';
if(window[FLAG])return;
window[FLAG]=true;
function install(){
  if(document.getElementById('training-attendance-mobile-ux-20260820-style'))return;
  const style=document.createElement('style');
  style.id='training-attendance-mobile-ux-20260820-style';
  style.textContent=`
  @media(max-width:760px), (max-width:1366px) and (any-pointer:coarse){
    #view-training .team-attendance-overview{gap:.72rem!important}
    #view-training .team-attendance-header{display:block!important;margin:0!important}
    #view-training .team-attendance-header>div:first-child{margin-bottom:.55rem!important}
    #view-training .team-attendance-header h2{margin:.08rem 0 0!important;font-size:1.02rem!important;line-height:1.1!important}
    #view-training .team-attendance-kicker{font-size:.5rem!important;letter-spacing:.065em!important}
    #view-training .team-attendance-kicker svg{width:13px!important;height:13px!important}
    #view-training .team-attendance-view-toggle{display:grid!important;grid-template-columns:1fr 1fr!important;width:100%!important;gap:.2rem!important;padding:.2rem!important;border-radius:12px!important;background:#eef1f4!important;overflow:visible!important}
    #view-training .team-attendance-view-toggle button{justify-content:center!important;min-width:0!important;padding:.46rem .5rem!important;border-radius:9px!important;font-size:.62rem!important;white-space:nowrap!important}
    #view-training .team-attendance-view-toggle button svg{width:14px!important;height:14px!important}

    #view-training .team-attendance-summary-grid{display:grid!important;grid-template-columns:1fr!important;gap:.52rem!important}
    #view-training .team-attendance-overall-card{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;align-items:center!important;gap:.72rem!important;padding:.72rem .78rem!important;border-radius:15px!important;border:1px solid #e3e8ee!important;background:rgba(255,255,255,.97)!important;box-shadow:0 4px 14px rgba(15,23,42,.025)!important}
    #view-training .team-attendance-ring.large{width:64px!important;height:64px!important;min-width:64px!important}
    #view-training .team-attendance-ring.large>div strong{font-size:.88rem!important}
    #view-training .team-attendance-ring.large>div small{font-size:.44rem!important}
    #view-training .team-attendance-overall-copy span{font-size:.5rem!important;letter-spacing:.055em!important;color:#9aa4af!important}
    #view-training .team-attendance-overall-copy strong{display:block!important;margin:.1rem 0 0!important;color:#253044!important;font-size:.74rem!important;line-height:1.2!important}
    #view-training .team-attendance-overall-copy p{display:none!important}

    #view-training .team-attendance-status-card{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:.34rem!important;padding:.48rem!important;border-radius:14px!important;border:1px solid #e3e8ee!important;background:rgba(255,255,255,.97)!important;box-shadow:none!important}
    #view-training .team-attendance-status-item{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:.18rem!important;min-width:0!important;padding:.42rem .18rem!important;border-radius:10px!important;background:#f8fafb!important;text-align:center!important}
    #view-training .team-attendance-status-item>svg{width:15px!important;height:15px!important}
    #view-training .team-attendance-status-item span{display:block!important;min-width:0!important}
    #view-training .team-attendance-status-item strong{display:block!important;font-size:.82rem!important;line-height:1!important}
    #view-training .team-attendance-status-item small{display:block!important;margin-top:.08rem!important;font-size:.45rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}

    #view-training .team-attendance-list-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:end!important;gap:.55rem!important;margin:.05rem 0 .2rem!important;padding:.1rem .06rem!important}
    #view-training .team-attendance-list-head>div span{display:block!important;color:#9aa4b0!important;font-size:.48rem!important;text-transform:uppercase!important;letter-spacing:.06em!important}
    #view-training .team-attendance-list-head>div strong{display:block!important;margin-top:.05rem!important;color:#283347!important;font-size:.72rem!important}
    #view-training .team-attendance-list-head label{font-size:0!important}
    #view-training .team-attendance-list-head select{max-width:118px!important;min-height:32px!important;padding:.28rem 1.6rem .28rem .48rem!important;border:1px solid #e0e5ea!important;border-radius:9px!important;background:#fff!important;color:#667384!important;font-size:.56rem!important}

    #view-training .team-attendance-player-list{display:flex!important;flex-direction:column!important;gap:.4rem!important}
    #view-training .team-attendance-player-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto 15px!important;grid-template-areas:'main ring arrow' 'breakdown breakdown breakdown'!important;align-items:center!important;gap:.42rem .5rem!important;width:100%!important;min-height:72px!important;padding:.58rem .62rem!important;border:1px solid #e3e8ee!important;border-radius:14px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 3px 12px rgba(15,23,42,.02)!important;text-align:left!important}
    #view-training .team-attendance-player-main{grid-area:main!important;display:flex!important;align-items:center!important;min-width:0!important;gap:.52rem!important}
    #view-training .team-attendance-avatar{width:38px!important;height:38px!important;min-width:38px!important;border-radius:11px!important;overflow:hidden!important;background:#f2f4f6!important;display:grid!important;place-items:center!important}
    #view-training .team-attendance-avatar img{width:100%!important;height:100%!important;object-fit:cover!important}
    #view-training .team-attendance-avatar b{font-size:.72rem!important;color:#6f7c8c!important}
    #view-training .team-attendance-player-main>span:last-child{min-width:0!important}
    #view-training .team-attendance-player-main strong{display:block!important;color:#253044!important;font-size:.7rem!important;line-height:1.12!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    #view-training .team-attendance-player-main small{display:block!important;margin-top:.12rem!important;color:#97a1ad!important;font-size:.51rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}

    #view-training .team-attendance-breakdown{grid-area:breakdown!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:.28rem!important;margin-left:46px!important}
    #view-training .team-attendance-breakdown>span{display:flex!important;align-items:center!important;justify-content:center!important;gap:.16rem!important;min-width:0!important;padding:.24rem .18rem!important;border-radius:7px!important;background:#f8fafb!important}
    #view-training .team-attendance-breakdown b{font-size:.56rem!important;line-height:1!important}
    #view-training .team-attendance-breakdown small{display:none!important}
    #view-training .team-attendance-breakdown>span::after{font-size:.43rem!important;font-weight:800!important;color:#9aa4af!important}
    #view-training .team-attendance-breakdown>.tone-present::after{content:'P'}
    #view-training .team-attendance-breakdown>.tone-late::after{content:'T'}
    #view-training .team-attendance-breakdown>.tone-justified::after{content:'J'}
    #view-training .team-attendance-breakdown>.tone-unjustified::after{content:'X'}

    #view-training .team-attendance-player-row>.team-attendance-ring.small{grid-area:ring!important;width:44px!important;height:44px!important;min-width:44px!important}
    #view-training .team-attendance-ring.small>div strong{font-size:.63rem!important}
    #view-training .team-attendance-ring.small>div small{display:none!important}
    #view-training .team-attendance-row-arrow{grid-area:arrow!important;width:14px!important;height:14px!important;color:#a8b0ba!important}

    #view-training .team-attendance-legend{gap:.28rem!important;overflow-x:auto!important;flex-wrap:nowrap!important;padding-bottom:.15rem!important;scrollbar-width:none!important}
    #view-training .team-attendance-legend::-webkit-scrollbar{display:none!important}
    #view-training .team-attendance-legend span{flex:0 0 auto!important;font-size:.51rem!important;white-space:nowrap!important}
    #view-training .team-attendance-matrix-scroll{border-radius:13px!important;border:1px solid #e3e8ee!important;background:#fff!important}
    #view-training .team-attendance-matrix-note{font-size:.52rem!important;line-height:1.4!important;color:#98a2ae!important}
  }
  `;
  document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
