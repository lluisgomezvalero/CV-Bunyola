(function(){
'use strict';

const FLAG='__volleyModalSurfaceClarity20260813';
if(window[FLAG])return;
window[FLAG]=true;

function install(){
  if(document.getElementById('volley-modal-surface-clarity-css'))return;
  const style=document.createElement('style');
  style.id='volley-modal-surface-clarity-css';
  style.textContent=`
    @media(max-width:960px){
      /* Fichas largas: el espacio entre navegación y contenido es una superficie propia,
         no una ventana transparente sobre la pantalla anterior. */
      body.volley-global-context #modal-player-detail.active,
      body.volley-global-context #modal-add-wellness.active{
        background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }
      body.volley-global-context #modal-player-detail.active>.modal-content,
      body.volley-global-context #modal-add-wellness.active>.modal-content{
        background:#fff!important;
        border:1px solid rgba(226,232,240,.96)!important;
      }
      body.volley-global-context #modal-player-detail.active .player-passport-modal{
        background:#fff!important;
      }
    }
  `;
  document.head.appendChild(style);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
