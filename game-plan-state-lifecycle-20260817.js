(function(){
'use strict';

const FLAG='__gamePlanStateLifecycle20260817';
if(window[FLAG])return;
window[FLAG]=true;

const MODEL_VERSION=1;
let resolverInstalled=false;
let publishInstalled=false;
let bound=false;
let persisting=false;

function coachEditing(){
  try{return typeof isCoachUser==='function'&&isCoachUser()&&!(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode);}
  catch(_){return false;}
}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function activeId(){try{return typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;}catch(_){return null;}}
function clone(value){try{return value==null?value:JSON.parse(JSON.stringify(value));}catch(_){return value;}}
function publicationVersion(record){return record?.publicationVersion||record?.publishedAt||null;}
function normalizePlan(value){
  try{
    if(typeof normalizeScoutingPlan==='function')return normalizeScoutingPlan(value||{});
  }catch(_){}
  return clone(value||{});
}
function stable(value){
  try{return JSON.stringify(value);}catch(_){return String(value);}
}
function equalPlan(a,b){return stable(normalizePlan(a))===stable(normalizePlan(b));}
function meaningful(plan){
  if(!plan||typeof plan!=='object')return false;
  const attackers=plan.attackers||{};
  if(Object.values(attackers).some(a=>String(a?.name||'').trim()||(Array.isArray(a?.directions)&&a.directions.length)||a?.visibleToPlayers))return true;
  if(Object.values(plan.servePct||{}).some(v=>Number(v)>0))return true;
  if(Object.values(plan.serveTargets||{}).some(v=>v&&v!=='none'))return true;
  if(String(plan.servePlayerTarget||'').trim())return true;
  const receivers=Array.isArray(plan.opponentReceivers)?plan.opponentReceivers:[];
  if(receivers.some(r=>String(r?.name||'').trim()))return true;
  return false;
}
function persist(record){
  if(persisting)return;
  const st=state(),mid=activeId();
  if(!st||!mid||!record)return;
  persisting=true;
  try{
    st.matchScouting=st.matchScouting||{};
    st.matchScouting[mid]=record;
    if(typeof saveAppData==='function')saveAppData(st);
  }catch(error){console.warn('[GamePlanLifecycle] persist',error);}
  finally{persisting=false;}
}
function migrate(record){
  if(!record||typeof record!=='object')return false;
  let changed=false;

  if(record.draftPlan){
    const next=normalizePlan(record.draftPlan);
    if(stable(next)!==stable(record.draftPlan)){record.draftPlan=next;changed=true;}
  }
  if(record.publishedPlan){
    const next=normalizePlan(record.publishedPlan);
    if(stable(next)!==stable(record.publishedPlan)){record.publishedPlan=next;changed=true;}
  }

  const pubVersion=publicationVersion(record);
  if(record.publishedPlan){
    if(!record.draftPlan){
      record.draftPlan=clone(record.publishedPlan);
      record.draftDirty=false;
      record.draftBasePublicationVersion=pubVersion;
      changed=true;
    }else if(record.draftDirty===false && record.draftBasePublicationVersion && pubVersion && String(record.draftBasePublicationVersion)!==String(pubVersion)){
      // El borrador no tenía cambios propios: una publicación remota nueva pasa a ser también la base editable.
      record.draftPlan=clone(record.publishedPlan);
      record.draftBasePublicationVersion=pubVersion;
      changed=true;
    }else if(record.draftDirty==null){
      // Registros antiguos: solo reconstruir cuando es seguro.
      if(equalPlan(record.draftPlan,record.publishedPlan)){
        record.draftDirty=false;
        record.draftBasePublicationVersion=pubVersion;
        changed=true;
      }else if(!meaningful(record.draftPlan)&&meaningful(record.publishedPlan)){
        record.draftPlan=clone(record.publishedPlan);
        record.draftDirty=false;
        record.draftBasePublicationVersion=pubVersion;
        changed=true;
      }else{
        // Si un borrador antiguo contiene datos diferentes, se conserva como posible edición no publicada.
        record.draftDirty=true;
        changed=true;
      }
    }else if(record.draftDirty===false&&!record.draftBasePublicationVersion){
      record.draftBasePublicationVersion=pubVersion;
      changed=true;
    }
  }else if(record.draftDirty==null){
    record.draftDirty=meaningful(record.draftPlan);
    changed=true;
  }

  if(record.gamePlanModelVersion!==MODEL_VERSION){
    record.gamePlanModelVersion=MODEL_VERSION;
    changed=true;
  }
  return changed;
}
function markDirty(){
  if(!coachEditing())return;
  let record=null;
  try{record=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){}
  if(!record)return;
  if(record.draftDirty===true)return;
  record.draftDirty=true;
  record.draftUpdatedAt=new Date().toISOString();
  persist(record);
}
function markPublished(){
  let record=null;
  try{record=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){}
  if(!record)return;
  record.draftDirty=false;
  record.draftBasePublicationVersion=publicationVersion(record);
  record.draftUpdatedAt=new Date().toISOString();
  record.gamePlanModelVersion=MODEL_VERSION;
  persist(record);
}
function wrapResolver(){
  if(resolverInstalled)return true;
  let base=null;
  try{base=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord:null;}catch(_){}
  if(typeof base!=='function')return false;
  if(base.__gamePlanLifecycle20260817){resolverInstalled=true;return true;}
  const wrapped=function(){
    const record=base.apply(this,arguments);
    if(migrate(record))persist(record);
    return record;
  };
  wrapped.__gamePlanLifecycle20260817=true;
  window.getActiveScoutingRecord=wrapped;
  try{getActiveScoutingRecord=wrapped;}catch(_){}
  resolverInstalled=true;
  return true;
}
function wrapPublish(){
  if(publishInstalled)return true;
  const base=window.publishScoutingPlan;
  if(typeof base!=='function')return false;
  if(base.__gamePlanLifecycle20260817){publishInstalled=true;return true;}
  const wrapped=function(){
    const out=base.apply(this,arguments);
    setTimeout(markPublished,0);
    return out;
  };
  wrapped.__gamePlanLifecycle20260817=true;
  window.publishScoutingPlan=wrapped;
  try{publishScoutingPlan=wrapped;}catch(_){}
  publishInstalled=true;
  return true;
}
function bind(){
  if(bound)return;
  bound=true;
  const relevant=target=>Boolean(target?.closest?.('#scouting-interactive-root'));
  document.addEventListener('input',event=>{if(relevant(event.target))markDirty();},true);
  document.addEventListener('change',event=>{if(relevant(event.target))markDirty();},true);
  document.addEventListener('click',event=>{
    if(!coachEditing())return;
    const root=event.target?.closest?.('#scouting-interactive-root');
    if(!root)return;
    if(event.target.closest('[data-our-serve-zone],[data-our-serve-target],[data-serve-zone]'))markDirty();
  },true);
}
function migrateNow(){
  try{
    const record=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;
    if(record&&migrate(record))persist(record);
  }catch(error){console.warn('[GamePlanLifecycle] migrate now',error);}
}
function install(){
  bind();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const a=wrapResolver();
    const b=wrapPublish();
    if(a&&b){
      clearInterval(timer);
      setTimeout(migrateNow,0);
    }else if(tries>180)clearInterval(timer);
  },100);
}

window.migrateCurrentGamePlanState=migrateNow;
window.markCurrentGamePlanDraftDirty=markDirty;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
