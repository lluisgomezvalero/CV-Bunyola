(function(){
'use strict';

const FLAG='__gamePlanFinalLabelFix20260814';
if(window[FLAG])return;
window[FLAG]=true;

const ROLE_LABELS={z4a:'Receptora 1',z4b:'Receptora 2',z2:'Opuesta',z3a:'Central 1',z3b:'Central 2'};

function normalize(value){
  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/[·.\-–—]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function isGeneratedName(value){
  const text=normalize(value);
  if(!text)return true;
  return /^(?:atacante|receptora|opuesta|central)(?:\s+z[234])?(?:\s+[12])?$/.test(text);
}

function cleanInputs(root=document){
  root.querySelectorAll?.('.attack-name-input').forEach(input=>{
    const key=String(input.id||'').replace('attacker-name-','');
    if(isGeneratedName(input.value))input.value='';
    input.placeholder='Nombre o dorsal';
    input.autocomplete='off';
    const role=input.closest('.attack-scout-card')?.querySelector('.attack-role');
    if(role&&ROLE_LABELS[key])role.textContent=ROLE_LABELS[key];
  });
}

function cleanStoredDraftNames(){
  try{
    if(typeof getActiveScoutingRecord!=='function')return;
    const record=getActiveScoutingRecord();
    const attackers=record?.draftPlan?.attackers;
    if(!attackers)return;
    let changed=false;
    Object.keys(attackers).forEach(key=>{
      if(isGeneratedName(attackers[key]?.name)){
        attackers[key].name='';
        changed=true;
      }
    });
    if(changed){
      record.draftPlan.attackers=attackers;
      if(typeof appState!=='undefined'&&typeof activeScoutingMatchId!=='undefined'&&activeScoutingMatchId){
        appState.matchScouting=appState.matchScouting||{};
        appState.matchScouting[activeScoutingMatchId]=record;
        if(typeof saveAppData==='function')saveAppData(appState);
      }
    }
  }catch(error){console.warn('[GamePlan] No se pudieron limpiar nombres automáticos:',error);}
}

function humanizeCentralText(text){
  return String(text||'')
    .replace(/\battack\s*5\b/gi,'Ataque a Z5')
    .replace(/\battack\s*1\b/gi,'Ataque a Z1')
    .replace(/\bzone\s*5\b/gi,'Ataque a Z5')
    .replace(/\bzone\s*1\b/gi,'Ataque a Z1')
    .replace(/Ataque a zona\s*5/gi,'Ataque a Z5')
    .replace(/Ataque a zona\s*1/gi,'Ataque a Z1')
    .replace(/Ataque a\s*5/gi,'Ataque a Z5')
    .replace(/Ataque a\s*1/gi,'Ataque a Z1');
}

function fixRenderedLabels(root=document){
  root.querySelectorAll?.('.player-plan-summary li,.attack-tendency-summary span,.player-attack-legend span').forEach(node=>{
    const next=humanizeCentralText(node.textContent);
    if(next!==node.textContent)node.textContent=next;
  });
}

function installSummaryFormatter(){
  const formatter=function(dir){
    const labels={
      line:'línea',
      long:'diagonal larga',
      medium:'diagonal media',
      short:'diagonal corta',
      tip:'finta',
      attack5:'ataque a Z5',
      attack1:'ataque a Z1',
      zone5:'ataque a Z5',
      zone1:'ataque a Z1'
    };
    return labels[dir]||humanizeCentralText(dir);
  };
  try{getDirectionSummaryLabel=formatter;}catch(_){}
  try{window.getDirectionSummaryLabel=formatter;}catch(_){}
}

function decorate(){
  const root=document.getElementById('scouting-interactive-root')||document;
  cleanInputs(root);
  fixRenderedLabels(root);
}

function wrapSave(){
  if(typeof window.saveScoutingData!=='function')return false;
  if(window.saveScoutingData.__finalLabelFix20260814)return true;
  const base=window.saveScoutingData;
  const wrapped=function(){
    cleanInputs(document.getElementById('scouting-interactive-root')||document);
    const out=base.apply(this,arguments);
    cleanStoredDraftNames();
    requestAnimationFrame(decorate);
    return out;
  };
  wrapped.__finalLabelFix20260814=true;
  window.saveScoutingData=wrapped;
  try{saveScoutingData=wrapped;}catch(_){}
  return true;
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__finalLabelFix20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    installSummaryFormatter();
    const out=base.apply(this,arguments);
    requestAnimationFrame(decorate);
    return out;
  };
  wrapped.__finalLabelFix20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function observe(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.__finalLabelFixObserver20260814)return;
  root.__finalLabelFixObserver20260814=true;
  let frame=0;
  const observer=new MutationObserver(()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(decorate);
  });
  observer.observe(root,{childList:true,subtree:true,characterData:true});
  decorate();
}

function install(){
  installSummaryFormatter();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    installSummaryFormatter();
    const saveReady=wrapSave();
    const renderReady=wrapRender();
    observe();
    if(saveReady&&renderReady){
      clearInterval(timer);
      setTimeout(()=>{installSummaryFormatter();decorate();},0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();