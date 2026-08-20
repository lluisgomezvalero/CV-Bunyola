(function(){
'use strict';
if(window.__calendarAddButtonPolish20260820)return;
window.__calendarAddButtonPolish20260820=true;
function install(){
  if(document.getElementById('calendar-add-button-polish-20260820-style'))return;
  const style=document.createElement('style');
  style.id='calendar-add-button-polish-20260820-style';
  style.textContent=`
    @media(max-width:760px){
      #view-calendar #btn-add-event{
        width:38px!important;
        height:38px!important;
        min-width:38px!important;
        max-width:38px!important;
        min-height:38px!important;
        max-height:38px!important;
        border-radius:50%!important;
        background:#fffaf0!important;
        color:#c97912!important;
        border:1px solid #f0d6a7!important;
        box-shadow:0 2px 8px rgba(113,76,17,.06)!important;
      }
      #view-calendar #btn-add-event:hover,
      #view-calendar #btn-add-event:focus-visible{
        background:#fff5df!important;
        border-color:#e9c27a!important;
      }
      #view-calendar #btn-add-event svg{
        width:17px!important;
        height:17px!important;
        stroke-width:2.2!important;
      }
    }
  `;
  document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
