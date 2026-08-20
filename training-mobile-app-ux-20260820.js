(function(){
'use strict';
const FLAG='__trainingMobileAppUx20260820';
if(window[FLAG])return;
window[FLAG]=true;

function ensureStyles(){
  if(document.getElementById('training-mobile-app-ux-20260820-style'))return;
  const style=document.createElement('style');
  style.id='training-mobile-app-ux-20260820-style';
  style.textContent=`
  @media(max-width:760px){
    #view-training .training-toolbar-row{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 40px!important;
      align-items:center!important;
      gap:.5rem!important;
      margin:0 0 .8rem!important;
    }
    #view-training .training-tabs{
      display:flex!important;
      width:auto!important;
      min-width:0!important;
      gap:.34rem!important;
      margin:0!important;
      padding:.05rem .05rem .12rem!important;
      border-radius:0!important;
      background:transparent!important;
      overflow-x:auto!important;
      flex-wrap:nowrap!important;
      scrollbar-width:none!important;
      -ms-overflow-style:none!important;
      overscroll-behavior-x:contain!important;
    }
    #view-training .training-tabs::-webkit-scrollbar{display:none!important}
    #view-training .training-tab{
      flex:0 0 auto!important;
      min-height:34px!important;
      padding:.42rem .66rem!important;
      gap:.32rem!important;
      border:1px solid #e2e8ee!important;
      border-radius:999px!important;
      background:rgba(255,255,255,.93)!important;
      color:#6d7888!important;
      box-shadow:none!important;
      font-size:.66rem!important;
      white-space:nowrap!important;
    }
    #view-training .training-tab svg{width:14px!important;height:14px!important}
    #view-training .training-tab.active{
      border-color:#e8d2aa!important;
      background:#fff7e8!important;
      color:#9b6915!important;
      box-shadow:none!important;
    }
    #view-training .training-new-session-btn{
      width:40px!important;
      height:40px!important;
      min-width:40px!important;
      max-width:40px!important;
      padding:0!important;
      justify-self:end!important;
      display:grid!important;
      place-items:center!important;
      border:1px solid #eadfca!important;
      border-radius:50%!important;
      background:#fffaf0!important;
      color:#a76d13!important;
      box-shadow:none!important;
      font-size:0!important;
    }
    #view-training .training-new-session-btn[hidden]{display:none!important}
    #view-training .training-new-session-btn svg{width:17px!important;height:17px!important;margin:0!important}

    #view-training .training-next-shell,
    #view-training .training-history-list{display:flex!important;flex-direction:column!important;gap:.5rem!important}
    #view-training .training-history-intro{
      margin:0 0 .08rem!important;
      padding:.05rem .12rem!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      color:#1f2a3b!important;
      box-shadow:none!important;
    }
    #view-training .training-history-intro .training-eyebrow{
      display:block!important;
      margin-bottom:.12rem!important;
      color:#9a6a1c!important;
      font-size:.52rem!important;
      line-height:1.1!important;
      letter-spacing:.07em!important;
    }
    #view-training .training-history-intro h3{
      margin:0!important;
      color:#1f2a3b!important;
      font-family:var(--font-heading)!important;
      font-size:1rem!important;
      line-height:1.1!important;
    }
    #view-training .training-history-intro p{display:none!important}

    #view-training .training-session-card.next{
      padding:.82rem .85rem!important;
      border:1px solid #dde7e2!important;
      border-left:4px solid #65a987!important;
      border-radius:16px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 5px 16px rgba(15,23,42,.04)!important;
    }
    #view-training .training-session-top{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto!important;
      align-items:center!important;
      gap:.62rem!important;
    }
    #view-training .training-session-top>div:first-child{min-width:0!important}
    #view-training .training-session-top .training-date-chip{
      display:inline-flex!important;
      align-items:center!important;
      gap:.25rem!important;
      color:#5b8d76!important;
      font-size:.54rem!important;
      letter-spacing:.045em!important;
    }
    #view-training .training-session-top .training-date-chip svg{width:13px!important;height:13px!important}
    #view-training .training-session-top h3{
      margin:.26rem 0 .14rem!important;
      color:#1e293b!important;
      font-family:var(--font-heading)!important;
      font-size:.94rem!important;
      line-height:1.1!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    #view-training .training-session-top p{
      display:block!important;
      margin:0!important;
      color:#778394!important;
      font-size:.64rem!important;
      line-height:1.35!important;
      white-space:normal!important;
    }
    #view-training .training-session-top small{
      display:block!important;
      margin-top:.17rem!important;
      color:#9ba5b1!important;
      font-size:.57rem!important;
    }
    #view-training .training-session-open-actions .btn{
      width:36px!important;
      height:36px!important;
      min-width:36px!important;
      padding:0!important;
      display:grid!important;
      place-items:center!important;
      border:1px solid #dfe6ec!important;
      border-radius:50%!important;
      background:#f8fafb!important;
      color:#667384!important;
      box-shadow:none!important;
      font-size:0!important;
    }
    #view-training .training-session-open-actions .btn svg{width:16px!important;height:16px!important;margin:0!important}
    #view-training .training-more-note{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:.6rem!important;
      padding:.18rem .12rem 0!important;
      color:#8b96a5!important;
      text-align:left!important;
      font-size:.61rem!important;
    }
    #view-training .training-more-note .btn{
      flex:0 0 auto!important;
      padding:.32rem .48rem!important;
      border-radius:9px!important;
      font-size:.58rem!important;
    }
    #view-training .training-more-note .btn svg{width:13px!important;height:13px!important}

    #view-training .training-history-list{gap:.42rem!important}
    #view-training .training-history-row.training-completed-row{
      width:100%!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto 18px!important;
      align-items:center!important;
      gap:.62rem!important;
      min-height:62px!important;
      padding:.65rem .72rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:14px!important;
      background:rgba(255,255,255,.96)!important;
      box-shadow:0 3px 12px rgba(15,23,42,.025)!important;
    }
    #view-training .training-history-row.training-completed-row>span:first-child{min-width:0!important}
    #view-training .training-history-row.training-completed-row>span:first-child strong{
      color:#253044!important;
      font-family:var(--font-heading)!important;
      font-size:.76rem!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    #view-training .training-history-row.training-completed-row small{
      margin-top:.1rem!important;
      color:#929dab!important;
      font-size:.55rem!important;
    }
    #view-training .training-history-row.training-completed-row>span:nth-child(2){align-items:flex-end!important}
    #view-training .training-history-row.training-completed-row>span:nth-child(2) small{display:none!important}
    #view-training .training-history-row.training-completed-row>span:nth-child(2) b{
      padding:.2rem .4rem!important;
      border-radius:7px!important;
      background:#f1f5f3!important;
      color:#688071!important;
      font-size:.56rem!important;
      font-weight:850!important;
    }
    #view-training .training-history-row.training-completed-row>svg{width:16px!important;height:16px!important;color:#a7b0ba!important}

    #view-training .team-attendance-overview{gap:.72rem!important}
    #view-training .team-attendance-header{align-items:flex-start!important;gap:.65rem!important}
    #view-training .team-attendance-header p{display:none!important}
    #view-training .team-attendance-header h2{font-size:1.05rem!important}
    #view-training .team-attendance-kicker{font-size:.52rem!important}
    #view-training .team-attendance-view-toggle{width:100%!important;overflow-x:auto!important;padding:.2rem!important}
    #view-training .team-attendance-view-toggle button{flex:1!important;justify-content:center!important;padding:.45rem .55rem!important;font-size:.64rem!important;white-space:nowrap!important}

    #view-training{padding-bottom:calc(88px + env(safe-area-inset-bottom))!important}
  }
  `;
  document.head.appendChild(style);
}

function install(){
  ensureStyles();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
