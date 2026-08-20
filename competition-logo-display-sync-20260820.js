(function(){
'use strict';

const FLAG='__competitionLogoDisplaySync20260820';
if(window[FLAG])return;
window[FLAG]=true;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function normalized(value){return String(value||'').trim().toLowerCase();}

function teamRows(){return Array.isArray(state()?.leagueTable)?state().leagueTable:[];}

function syncImage(img,src){
  if(!img||!src)return;
  const current=img.getAttribute('src')||'';
  if(current!==src)img.setAttribute('src',src);
}

function syncTeam(team){
  if(!team)return;
  const name=String(team.isOwn?'CV Bunyola':team.name||'').trim();
  const logo=String(team.logo||'assets/default_avatar.svg');
  if(!name)return;

  document.querySelectorAll('#league-table-tbody tr').forEach(row=>{
    const edit=row.querySelector('button[onclick*="openEditTeamModal"]');
    const matchesId=team.id&&edit?.getAttribute('onclick')?.includes(String(team.id));
    const matchesName=normalized(row.textContent).includes(normalized(name));
    if(matchesId||matchesName)syncImage(row.querySelector('img'),logo);
  });

  document.querySelectorAll('#view-competition .competition-mobile-row').forEach(card=>{
    const cardName=card.querySelector('.competition-mobile-team strong')?.textContent||'';
    if(normalized(cardName)===normalized(name))syncImage(card.querySelector('.competition-mobile-team img'),logo);
  });

  if(team.isOwn||/cv\s*bunyola/i.test(name)){
    syncImage(document.querySelector('#view-competition .competition-summary-logo'),logo);
  }
}

function syncAll(){teamRows().forEach(syncTeam);}

function scheduleSync(){
  requestAnimationFrame(()=>requestAnimationFrame(syncAll));
}

function bindForm(){
  const form=document.getElementById('form-edit-team');
  if(!form||form.dataset.logoDisplaySyncBound==='1')return;
  form.dataset.logoDisplaySyncBound='1';
  form.addEventListener('submit',()=>{
    const id=document.getElementById('edit-team-id')?.value;
    setTimeout(()=>{
      const team=teamRows().find(row=>String(row?.id)===String(id));
      if(team)syncTeam(team);else syncAll();
    },0);
    setTimeout(scheduleSync,120);
  });
}

function patchRender(){
  const current=window.renderCompetition;
  if(typeof current!=='function'||current.__competitionLogoDisplaySync20260820)return false;
  const wrapped=function(){
    const out=current.apply(this,arguments);
    Promise.resolve(out).finally(scheduleSync);
    return out;
  };
  wrapped.__competitionLogoDisplaySync20260820=true;
  window.renderCompetition=wrapped;
  try{renderCompetition=wrapped;}catch(_){}
  return true;
}

function install(){
  let tries=0;
  const boot=()=>{
    tries++;
    bindForm();
    const patched=patchRender();
    scheduleSync();
    if((patched&&document.getElementById('form-edit-team'))||tries>=20)return;
    setTimeout(boot,250);
  };
  boot();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
