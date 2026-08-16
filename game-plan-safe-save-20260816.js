(function(){
'use strict';

const FLAG='__gamePlanSafeSave20260816';
if(window[FLAG])return;
window[FLAG]=true;

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function activeId(){try{return typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;}catch(_){return null;}}
function currentRecord(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function app(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function dirLabels(key){try{return typeof getScoutDirectionLabels==='function'?getScoutDirectionLabels(key):{};}catch(_){return {};}}

function safeSave(showMessage=true){
  if(!coach()||preview())return;
  const mid=activeId();
  if(!mid){try{showToast('Selecciona un partido.','error');}catch(_){}return;}

  const record=currentRecord();
  const p=record?.draftPlan;
  const st=app();
  if(!record||!p||!st)return;

  // Solo se actualiza un dato si su control existe realmente en este render.
  // Un control ausente NUNCA significa “vacío/desmarcado”.
  const servePlayer=document.getElementById('serve-player-target-input');
  if(servePlayer)p.servePlayerTarget=String(servePlayer.value||'').trim();

  const hideServe=document.getElementById('hide-serve-objectives-input');
  if(hideServe)p.hideServeObjectives=Boolean(hideServe.checked);

  Object.keys(p.attackers||{}).forEach(key=>{
    const attacker=p.attackers[key]||(p.attackers[key]={});

    const nameEl=document.getElementById(`attacker-name-${key}`);
    if(nameEl)attacker.name=String(nameEl.value||'').trim();

    const labels=dirLabels(key);
    const directionKeys=Object.keys(labels);
    const directionEls=directionKeys.map(dir=>document.getElementById(`attacker-${key}-${dir}`));
    if(directionEls.some(Boolean)){
      attacker.directions=directionKeys.filter((dir,index)=>Boolean(directionEls[index]?.checked));
    }

    const visibleEl=document.getElementById(`attacker-visible-${key}`);
    if(visibleEl)attacker.visibleToPlayers=Boolean(visibleEl.checked);

    const tipEl=document.getElementById(`attacker-tip-zone-${key}`);
    if(tipEl){
      const zone=Number(tipEl.value);
      if(Number.isFinite(zone))attacker.tipZone=zone;
    }
  });

  Object.keys(p.servePct||{}).forEach(key=>{
    const el=document.getElementById(`serve-pct-${key}`);
    if(!el)return;
    const value=Number(el.value);
    p.servePct[key]=Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
  });

  record.draftPlan=p;
  st.matchScouting=st.matchScouting||{};
  st.matchScouting[mid]=record;
  try{saveAppData(st);}catch(error){console.warn('[GamePlanSafeSave] local save',error);}
  if(showMessage){try{showToast('Borrador guardado correctamente.');}catch(_){}}
  try{if(typeof renderTactics==='function')renderTactics();}catch(error){console.warn('[GamePlanSafeSave] render',error);}
}

safeSave.__gamePlanSafeSave20260816=true;
window.saveScoutingData=safeSave;
try{saveScoutingData=safeSave;}catch(_){}
console.info('[GamePlanSafeSave] Guardado no destructivo activo.');
})();
