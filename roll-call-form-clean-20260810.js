(function(){
'use strict';
let installed=false;
function install(){
  if(installed)return;
  const form=document.getElementById('form-verify-attendance');
  if(!form||typeof window.saveRollCallAuthoritative!=='function'){
    setTimeout(install,200);
    return;
  }
  const clean=form.cloneNode(true);
  form.replaceWith(clean);
  const btn=clean.querySelector('button[type="submit"], .btn-primary');
  if(btn){
    btn.type='button';
    btn.dataset.rollcallSave='1';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      window.saveRollCallAuthoritative();
    },true);
  }
  installed=true;
  console.info('[RollCallFormClean] Listener antiguo eliminado; guardado autoritativo activo.');
}
window.addEventListener('load',()=>setTimeout(install,500));
setTimeout(install,3000);
})();