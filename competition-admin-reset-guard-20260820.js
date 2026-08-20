(function(){
'use strict';

const FLAG='__competitionAdminResetGuard20260820';
if(window[FLAG])return;
window[FLAG]=true;

function isAdmin(){
  try{
    if(typeof isAdministratorUser==='function')return !!isAdministratorUser();
  }catch(_){}
  try{
    const user=typeof getCurrentUser==='function'?getCurrentUser():null;
    return !!user&&['administrator','admin'].includes(String(user.role||'').toLowerCase());
  }catch(_){return false;}
}

function apply(){
  const button=document.getElementById('btn-reset-league-table');
  if(!button)return;
  const allowed=isAdmin();
  button.hidden=!allowed;
  button.style.display=allowed?'':'none';
  button.setAttribute('aria-hidden',allowed?'false':'true');
  button.tabIndex=allowed?0:-1;
}

function wrapRender(){
  const current=window.renderCompetition;
  if(typeof current!=='function'||current.__adminResetGuard20260820)return;
  const wrapped=function(){
    const out=current.apply(this,arguments);
    Promise.resolve(out).finally(()=>requestAnimationFrame(apply));
    return out;
  };
  wrapped.__adminResetGuard20260820=true;
  window.renderCompetition=wrapped;
  try{renderCompetition=wrapped;}catch(_){}
}

function install(){
  wrapRender();
  apply();
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('[data-target="competition"],#btn-reset-league-table');
    if(!target)return;
    if(target.id==='btn-reset-league-table'&&!isAdmin()){
      event.preventDefault();
      event.stopImmediatePropagation();
      apply();
      return;
    }
    requestAnimationFrame(apply);
  },true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
