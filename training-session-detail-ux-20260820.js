(function(){
'use strict';
const FLAG='__trainingSessionDetailUx20260820';
if(window[FLAG])return;
window[FLAG]=true;
function install(){
  if(document.getElementById('training-session-detail-ux-20260820-style'))return;
  const style=document.createElement('style');
  style.id='training-session-detail-ux-20260820-style';
  style.textContent=`
  @media(max-width:760px){
    #view-training #session-center-detail{margin:0!important}
    #view-training .session-detail-shell{padding:0 0 calc(92px + env(safe-area-inset-bottom))!important}

    #view-training .session-detail-hero{
      display:grid!important;
      grid-template-columns:38px minmax(0,1fr) 38px!important;
      align-items:center!important;
      gap:.58rem!important;
      margin:0 0 .9rem!important;
      padding:.78rem .8rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:17px!important;
      background:rgba(255,255,255,.97)!important;
      color:#1f2a3b!important;
      box-shadow:0 5px 16px rgba(15,23,42,.035)!important;
    }
    #view-training .session-detail-hero>div{min-width:0!important}
    #view-training .session-detail-kicker{
      display:block!important;
      margin-bottom:.12rem!important;
      color:#9a6a1c!important;
      font-size:.52rem!important;
      line-height:1.1!important;
      letter-spacing:.07em!important;
    }
    #view-training .session-detail-hero h2{
      margin:0!important;
      color:#1f2a3b!important;
      font-family:var(--font-heading)!important;
      font-size:1rem!important;
      line-height:1.08!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }
    #view-training .session-detail-hero p{
      margin:.18rem 0 0!important;
      color:#7a8695!important;
      opacity:1!important;
      font-size:.61rem!important;
      line-height:1.35!important;
      white-space:normal!important;
    }
    #view-training .session-back-button,
    #view-training .session-detail-hero>.btn{
      width:38px!important;
      height:38px!important;
      min-width:38px!important;
      margin:0!important;
      padding:0!important;
      display:grid!important;
      place-items:center!important;
      border:1px solid #e0e6ec!important;
      border-radius:50%!important;
      background:#f8fafb!important;
      color:#657283!important;
      box-shadow:none!important;
      font-size:0!important;
    }
    #view-training .session-back-button svg,
    #view-training .session-detail-hero>.btn svg{width:16px!important;height:16px!important;margin:0!important}

    #view-training .session-phase{margin-top:.88rem!important}
    #view-training .session-phase-heading{
      gap:.55rem!important;
      margin:0 0 .48rem!important;
      padding:0 .08rem!important;
    }
    #view-training .session-phase-step{
      width:28px!important;
      height:28px!important;
      border-radius:9px!important;
      background:#fff7e8!important;
      color:#9a6a1c!important;
      font-size:.58rem!important;
    }
    #view-training .session-phase-heading small{
      margin-bottom:.02rem!important;
      color:#98a2ae!important;
      font-size:.5rem!important;
      letter-spacing:.06em!important;
    }
    #view-training .session-phase-heading h3{
      color:#253044!important;
      font-size:.86rem!important;
      line-height:1.08!important;
    }
    #view-training .session-detail-grid{display:block!important}

    #view-training .session-panel{
      margin:0!important;
      padding:.82rem .84rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:16px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 4px 14px rgba(15,23,42,.03)!important;
    }
    #view-training .session-panel+.session-panel{margin-top:.58rem!important}
    #view-training .session-panel-title{
      gap:.56rem!important;
      margin-bottom:.62rem!important;
      align-items:center!important;
    }
    #view-training .session-panel-title>svg{
      width:17px!important;
      height:17px!important;
      color:#8a96a5!important;
    }
    #view-training .session-panel-title span{
      color:#9aa4b0!important;
      font-size:.49rem!important;
      letter-spacing:.065em!important;
    }
    #view-training .session-panel-title h3{
      margin:.04rem 0 0!important;
      color:#263247!important;
      font-size:.82rem!important;
      line-height:1.08!important;
    }
    #view-training .session-rich-text{
      margin:0 0 .62rem!important;
      color:#465365!important;
      font-size:.72rem!important;
      line-height:1.55!important;
    }
    #view-training .session-muted{
      margin:.2rem 0 0!important;
      color:#a0a9b4!important;
      font-size:.61rem!important;
    }
    #view-training .training-file-preview{
      margin:.55rem 0 0!important;
      padding:.52rem .62rem!important;
      border:1px solid #d9e9e1!important;
      border-radius:10px!important;
      background:#f4faf7!important;
      color:#5c7d6d!important;
      font-size:.62rem!important;
      box-shadow:none!important;
    }
    #view-training .training-file-preview svg{width:14px!important;height:14px!important}

    #view-training .session-metric-row{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      gap:.42rem!important;
      margin-bottom:.6rem!important;
    }
    #view-training .session-metric-row div{
      padding:.56rem .3rem!important;
      border:1px solid #edf0f3!important;
      border-radius:11px!important;
      background:#f8fafb!important;
    }
    #view-training .session-metric-row strong{
      color:#273246!important;
      font-size:1rem!important;
      line-height:1!important;
    }
    #view-training .session-metric-row span{
      margin-top:.12rem!important;
      color:#8e99a7!important;
      font-size:.52rem!important;
      line-height:1.1!important;
    }
    #view-training .session-participation-note{
      margin:0 0 .6rem!important;
      color:#8793a1!important;
      font-size:.61rem!important;
      line-height:1.4!important;
    }
    #view-training .session-attendance-state{
      padding:.65rem .7rem!important;
      gap:.55rem!important;
      border-radius:11px!important;
      font-size:.67rem!important;
    }
    #view-training .session-attendance-state>svg{width:17px!important;height:17px!important}
    #view-training .session-rsvp-question{font-size:.7rem!important}
    #view-training .session-rsvp-actions{gap:.42rem!important;margin-top:.52rem!important}
    #view-training .session-rsvp-actions button{padding:.44rem .62rem!important;border-radius:9px!important;font-size:.62rem!important}

    #view-training .session-rpe-compare{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:.45rem!important;
    }
    #view-training .session-rpe-compare>div{
      padding:.62rem!important;
      border:1px solid #edf0f3!important;
      border-radius:12px!important;
      background:#f8fafb!important;
    }
    #view-training .session-rpe-compare span{font-size:.56rem!important}
    #view-training .session-rpe-compare strong{font-size:1.25rem!important}
    #view-training .session-rpe-compare small{margin-top:.2rem!important;font-size:.52rem!important}
    #view-training .session-comparison-message{
      margin:.5rem 0!important;
      padding:.55rem .62rem!important;
      border:1px solid #e2e8f0!important;
      border-radius:10px!important;
      background:#f8fafc!important;
      color:#637083!important;
      font-size:.61rem!important;
      line-height:1.4!important;
      font-weight:700!important;
    }
    #view-training .training-rpe-scale{gap:.3rem!important;margin-top:.58rem!important}
    #view-training .training-rpe-dot{border-radius:8px!important;font-size:.65rem!important}

    #view-training .session-panel .form-label{
      margin:.5rem 0 .28rem!important;
      color:#667384!important;
      font-size:.61rem!important;
      font-weight:800!important;
    }
    #view-training .session-panel textarea.form-control{
      min-height:78px!important;
      margin-bottom:.52rem!important;
      padding:.65rem!important;
      border-radius:11px!important;
      font-size:.72rem!important;
      line-height:1.45!important;
      background:#fbfcfd!important;
    }
    #view-training .session-panel>.btn.btn-primary{
      min-height:38px!important;
      padding:.55rem .75rem!important;
      border-radius:10px!important;
      box-shadow:none!important;
      font-size:.66rem!important;
    }
    #view-training .session-comments-list{gap:.45rem!important}
    #view-training .session-comments-list>div{
      gap:.55rem!important;
      padding:.6rem!important;
      border:1px solid #edf0f3!important;
      border-radius:11px!important;
      background:#fafbfc!important;
    }
    #view-training .session-comments-list img{width:32px!important;height:32px!important}
    #view-training .session-comments-list strong{font-size:.67rem!important}
    #view-training .session-comments-list p{margin:.1rem 0 0!important;font-size:.62rem!important;line-height:1.35!important}
  }
  `;
  document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
