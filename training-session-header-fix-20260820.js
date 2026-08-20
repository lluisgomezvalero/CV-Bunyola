(function(){
'use strict';
const FLAG='__trainingSessionHeaderFix20260820';
if(window[FLAG])return;
window[FLAG]=true;
function install(){
  if(document.getElementById('training-session-header-fix-20260820-style'))return;
  const style=document.createElement('style');
  style.id='training-session-header-fix-20260820-style';
  style.textContent=`
  @media(max-width:760px){
    #view-training .session-detail-hero{
      display:flex!important;
      flex-wrap:wrap!important;
      align-items:center!important;
      gap:.45rem!important;
      padding:.72rem .8rem .82rem!important;
    }
    #view-training .session-detail-hero>.session-back-button{
      order:1!important;
      margin:0 auto 0 0!important;
      flex:0 0 38px!important;
    }
    #view-training .session-detail-hero>button:not(.session-back-button){
      order:2!important;
      flex:0 0 38px!important;
      margin:0!important;
    }
    #view-training .session-detail-hero>div{
      order:3!important;
      flex:1 0 100%!important;
      width:100%!important;
      min-width:100%!important;
      padding-top:.12rem!important;
    }
    #view-training .session-detail-hero h2{
      white-space:normal!important;
      overflow:visible!important;
      text-overflow:clip!important;
      font-size:1rem!important;
      line-height:1.15!important;
    }
    #view-training .session-detail-hero p{
      max-width:none!important;
      white-space:normal!important;
      overflow-wrap:anywhere!important;
      font-size:.64rem!important;
      line-height:1.4!important;
    }
    #view-training .session-panel textarea.form-control{
      min-height:64px!important;
      height:68px!important;
      resize:vertical!important;
    }
  }
  `;
  document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
