(function(){
'use strict';

const FLAG='__playerPassportRemoveCommitment20260813';
if(window[FLAG])return;
window[FLAG]=true;

function compactText(el){
  return String(el?.textContent||'').replace(/\s+/g,' ').trim();
}

function removeCommitmentMetric(){
  const modal=document.getElementById('modal-player-detail');
  if(!modal)return;

  const matches=el=>{
    const text=compactText(el);
    return /Compromiso/i.test(text) && (/\/\s*100\b/.test(text) || /NaN/i.test(text));
  };

  const commonSelector='.passport-kpi,.passport-hero-stat,.passport-summary-item,.passport-metric,.passport-chip,.passport-badge,.passport-stat';
  const direct=[...modal.querySelectorAll(commonSelector)].find(matches);
  if(direct){
    direct.remove();
    return;
  }

  const candidates=[...modal.querySelectorAll('span,strong,small,div,article')]
    .filter(matches)
    .sort((a,b)=>compactText(a).length-compactText(b).length);

  const seed=candidates[0];
  if(!seed)return;

  let target=seed;
  let parent=seed.parentElement;
  for(let i=0;i<3 && parent && parent!==modal;i++,parent=parent.parentElement){
    const text=compactText(parent);
    if(/Compromiso/i.test(text) && (/\/\s*100\b/.test(text) || /NaN/i.test(text)) && text.length<=80){
      target=parent;
    }else{
      break;
    }
  }
  target.remove();
}

function install(){
  const modal=document.getElementById('modal-player-detail');
  if(!modal)return;
  removeCommitmentMetric();
  new MutationObserver(()=>removeCommitmentMetric()).observe(modal,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
