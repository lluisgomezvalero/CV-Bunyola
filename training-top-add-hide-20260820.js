(function(){
'use strict';
if(window.__trainingTopAddHide20260820)return;
window.__trainingTopAddHide20260820=true;
const style=document.createElement('style');
style.id='training-top-add-hide-20260820-style';
style.textContent=`
@media(max-width:760px){
  #view-training .training-toolbar-row{
    grid-template-columns:minmax(0,1fr)!important;
  }
  #view-training .training-new-session-btn{
    display:none!important;
  }
}
`;
document.head.appendChild(style);
})();
