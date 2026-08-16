(function(){
'use strict';

const FLAG='__gamePlanAttackLiveDraft20260816';
if(window[FLAG])return;
window[FLAG]=true;

const KEYS=['z4a','z4b','z2','z3a','z3b'];

function coachEditing(){
  try{
    return typeof isCoachUser==='function'&&isCoachUser()&&!(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode);
  }catch(_){return false;}
}

function currentRecord(){
  try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}
  catch(_){return null;}
}

function directionKeys(key){
  try{return typeof getScoutDirectionLabels==='function'?Object.keys(getScoutDirectionLabels(key)||{}):[];}
  catch(_){return [];}
}

function redrawCourt(key,attacker){
  if(!attacker||typeof window.renderSingleAttackCourt!=='function')return;
  const nameInput=document.getElementById(`attacker-name-${key}`);
  const card=nameInput?.closest('.attack-scout-card');
  const current=card?.querySelector('.attack-card-court');
  if(!card||!current)return;
  try{
    const host=document.createElement('div');
    host.innerHTML=window.renderSingleAttackCourt(key,attacker,KEYS.indexOf(key));
    const fresh=host.firstElementChild;
    if(fresh)current.replaceWith(fresh);
  }catch(error){
    console.warn('[GamePlanAttackLiveDraft] redraw court',error);
  }
}

function syncOne(key,persist=true,redraw=false){
  if(!coachEditing()||!KEYS.includes(key))return false;
  const rec=currentRecord();
  const attacker=rec?.draftPlan?.attackers?.[key];
  if(!rec||!attacker)return false;

  const name=document.getElementById(`attacker-name-${key}`);
  const visible=document.getElementById(`attacker-visible-${key}`);
  const tip=document.getElementById(`attacker-tip-zone-${key}`);
  const dirs=directionKeys(key);

  if(name)attacker.name=String(name.value||'').trim();
  if(visible)attacker.visibleToPlayers=Boolean(visible.checked);
  if(tip)attacker.tipZone=Number(tip.value||attacker.tipZone||8)||8;
  if(dirs.length){
    attacker.directions=dirs.filter(dir=>Boolean(document.getElementById(`attacker-${key}-${dir}`)?.checked));
  }

  try{
    if(typeof appState!=='undefined'&&activeScoutingMatchId){
      appState.matchScouting=appState.matchScouting||{};
      appState.matchScouting[activeScoutingMatchId]=rec;
      if(persist&&typeof saveAppData==='function')saveAppData(appState);
    }
  }catch(error){console.warn('[GamePlanAttackLiveDraft] persist',error);}

  if(redraw)requestAnimationFrame(()=>redrawCourt(key,attacker));
  return true;
}

function syncAll(){
  let changed=false;
  KEYS.forEach(key=>{if(syncOne(key,false,false))changed=true;});
  if(!changed)return;
  try{if(typeof saveAppData==='function'&&typeof appState!=='undefined')saveAppData(appState);}catch(error){console.warn('[GamePlanAttackLiveDraft] save',error);}
}

function keyFromTarget(target){
  const id=String(target?.id||'');
  let m=id.match(/^attacker-name-(z4a|z4b|z2|z3a|z3b)$/);
  if(m)return m[1];
  m=id.match(/^attacker-visible-(z4a|z4b|z2|z3a|z3b)$/);
  if(m)return m[1];
  m=id.match(/^attacker-tip-zone-(z4a|z4b|z2|z3a|z3b)$/);
  if(m)return m[1];
  m=id.match(/^attacker-(z4a|z4b|z2|z3a|z3b)-/);
  return m?m[1]:null;
}

function affectsCourt(target){
  const id=String(target?.id||'');
  return /^attacker-(z4a|z4b|z2|z3a|z3b)-/.test(id)||/^attacker-tip-zone-(z4a|z4b|z2|z3a|z3b)$/.test(id);
}

function bind(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.dataset.attackLiveDraftBound==='1')return false;
  root.dataset.attackLiveDraftBound='1';

  root.addEventListener('change',event=>{
    const key=keyFromTarget(event.target);
    if(key)syncOne(key,true,affectsCourt(event.target));
  });

  root.addEventListener('blur',event=>{
    const key=keyFromTarget(event.target);
    if(key)syncOne(key,true,false);
  },true);

  // Guardar todas las tarjetas antes de que la capa de pestañas cambie la activa.
  root.addEventListener('click',event=>{
    if(event.target.closest('[data-attack-tab]'))syncAll();
  },true);
  return true;
}

function install(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(bind())clearInterval(timer);
    else if(tries>180)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
