(function(){
'use strict';
if(document.getElementById('roll-call-mobile-ui-css')) return;
const style=document.createElement('style');
style.id='roll-call-mobile-ui-css';
style.textContent=`
/* Pasar lista: encuadre seguro por encima de la navegación inferior */
#modal-verify-attendance.modal-backdrop{
  align-items:center;
  justify-content:center;
  padding:16px;
  padding-bottom:calc(88px + env(safe-area-inset-bottom, 0px));
  box-sizing:border-box;
}
#modal-verify-attendance .modal-content{
  width:min(680px,100%);
  max-height:calc(100dvh - 120px - env(safe-area-inset-bottom, 0px));
  display:flex;
  flex-direction:column;
  overflow:hidden;
  margin:0;
}
#modal-verify-attendance .modal-header{
  flex:0 0 auto;
}
#modal-verify-attendance .modal-body{
  flex:1 1 auto;
  min-height:0;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  padding-bottom:0;
}
#modal-verify-attendance #form-verify-attendance{
  min-height:0;
  height:100%;
  display:flex;
  flex-direction:column;
}
#modal-verify-attendance #verify-attendance-list-container{
  flex:1 1 auto;
  min-height:0;
  max-height:none!important;
  overflow-y:auto!important;
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
  padding-right:.35rem!important;
  padding-bottom:.75rem;
}
#modal-verify-attendance #form-verify-attendance > div:last-child{
  flex:0 0 auto;
  position:sticky;
  bottom:0;
  z-index:8;
  margin-top:0!important;
  padding:12px 0 14px!important;
  background:#fff;
  border-top:1px solid var(--border-subtle,#e2e8f0)!important;
  box-shadow:0 -8px 18px rgba(15,23,42,.08);
  gap:.6rem;
}
@media (max-width:640px){
  #modal-verify-attendance.modal-backdrop{
    align-items:flex-start;
    padding:10px;
    padding-top:max(10px,env(safe-area-inset-top,0px));
    padding-bottom:calc(82px + env(safe-area-inset-bottom,0px));
  }
  #modal-verify-attendance .modal-content{
    width:100%;
    max-width:none!important;
    max-height:calc(100dvh - 104px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
    border-radius:16px;
  }
  #modal-verify-attendance .modal-header{
    padding:.85rem 1rem;
  }
  #modal-verify-attendance .modal-body{
    padding:.75rem .85rem 0;
  }
  #modal-verify-attendance #form-verify-attendance > div:last-child{
    margin-left:-.85rem;
    margin-right:-.85rem;
    padding:10px .85rem calc(10px + env(safe-area-inset-bottom,0px))!important;
  }
  #modal-verify-attendance #form-verify-attendance > div:last-child .btn{
    flex:1 1 0;
    min-width:0;
    white-space:normal;
    line-height:1.15;
    min-height:44px;
  }
}
`;
document.head.appendChild(style);
})();