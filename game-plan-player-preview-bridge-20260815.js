(function(){
'use strict';

const FLAG='__gamePlanPlayerPreviewBridge20260815';
if(window[FLAG])return;
window[FLAG]=true;

const ZONES=[4,3,2,7,8,9,5,6,1];
let resolverInstalled=false;
let toggleInstalled=false;

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function playerLike(){return !coach()||preview();}
function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function canonicalPlan(){
  const rec=record();
  if(!rec)return null;
  if(coach()&&preview())return rec.publishedPlan||rec.draftPlan||null;
  if(!coach())return rec.status==='published'?(rec.publishedPlan||null):null;
  return rec.draftPlan||null;
}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function priority(p,zone){return p?.serveTargets?.[`z${zone}`]||'none';}
function label(value){return value==='primary'?'Principal':value==='secondary'?'Alternativa':'';}
function hasServeZones(p){return ZONES.some(zone=>priority(p,zone)!=='none');}

function installResolver(){
  if(resolverInstalled)return true;
  let base=null;
  try{base=typeof getActiveScoutingPlan==='function'?getActiveScoutingPlan:null;}catch(_){}
  if(typeof base!=='function')return false;
  if(base.__playerPreviewBridge20260815){resolverInstalled=true;return true;}
  const wrapped=function(){
    if(playerLike()){
      const p=canonicalPlan();
      if(p)return p;
    }
    return base.apply(this,arguments);
  };
  wrapped.__playerPreviewBridge20260815=true;
  try{window.getActiveScoutingPlan=wrapped;}catch(_){}
  try{getActiveScoutingPlan=wrapped;}catch(_){}
  resolverInstalled=true;
  return true;
}

function playerServeHtml(p){
  const target=String(p?.servePlayerTarget||'').trim();
  return `<div class="player-our-serve-board game-plan-canonical-serve">
    <div class="player-our-serve-target"><small>Objetivo de saque</small><strong>${esc(target||'Sin jugadora concreta')}</strong></div>
    <div class="player-our-serve-court" aria-label="Zonas objetivo de nuestro saque">
      <div class="player-our-serve-net"><span>RED</span></div>
      <div class="player-our-serve-grid">
        ${ZONES.map(zone=>{const state=priority(p,zone);return `<div class="is-${state}"><b>Z${zone}</b>${state!=='none'?`<span>${label(state)}</span>`:''}</div>`;}).join('')}
      </div>
    </div>
    <div class="player-our-serve-legend"><span><i class="secondary"></i> Alternativa</span><span><i class="primary"></i> Principal</span></div>
  </div>`;
}

function ensurePlayerServe(root,p){
  const sec=root?.querySelector('.serve-target-text-section');
  if(!sec||!p||p.hideServeObjectives)return;
  const heading=sec.querySelector('.scout-section-head h3');
  const desc=sec.querySelector('.scout-section-head p');
  if(heading)heading.textContent='Nuestro saque';
  if(desc)desc.textContent=hasServeZones(p)?'A quién buscamos y qué zonas priorizamos.':'A quién debemos dirigir el saque.';
  const original=sec.querySelector('.serve-player-target');
  let board=sec.querySelector('.player-our-serve-board');
  if(!hasServeZones(p)){
    board?.remove();
    if(original)original.style.display='';
    return;
  }
  if(original)original.style.display='none';
  const host=document.createElement('div');
  host.innerHTML=playerServeHtml(p);
  const fresh=host.firstElementChild;
  if(board)board.replaceWith(fresh);
  else sec.appendChild(fresh);
}

function applyMode(){
  const view=document.getElementById('view-tactics');
  const root=document.getElementById('scouting-interactive-root');
  if(!view||!root)return;
  const pl=playerLike();
  if(pl){
    view.classList.add('game-plan-player');
    view.classList.add('game-plan-player-canonical');
    if(preview())view.classList.add('game-plan-preview-canonical');
    ensurePlayerServe(root,canonicalPlan());
  }else{
    view.classList.remove('game-plan-player-canonical','game-plan-preview-canonical');
    if(coach())view.classList.remove('game-plan-player');
  }
  try{window.lucide?.createIcons?.();}catch(_){}
}

function installToggle(){
  if(toggleInstalled)return true;
  const base=window.toggleScoutingPreview;
  if(typeof base!=='function')return false;
  if(base.__playerPreviewBridge20260815){toggleInstalled=true;return true;}
  const wrapped=function(enabled){
    const out=base.apply(this,arguments);
    setTimeout(()=>{
      installResolver();
      try{if(typeof renderTactics==='function')renderTactics();}catch(_){}
      requestAnimationFrame(applyMode);
    },35);
    return out;
  };
  wrapped.__playerPreviewBridge20260815=true;
  window.toggleScoutingPreview=wrapped;
  try{toggleScoutingPreview=wrapped;}catch(_){}
  toggleInstalled=true;
  return true;
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__playerPreviewBridge20260815)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(applyMode);
    return out;
  };
  wrapped.__playerPreviewBridge20260815=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-player-preview-bridge-20260815-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-player-preview-bridge-20260815-css';
  style.textContent=`
#view-tactics.game-plan-preview-canonical .game-plan-workflow-hint{display:none!important}
#view-tactics.game-plan-preview-canonical .scouting-publish-bar{margin-bottom:.8rem}
#view-tactics.game-plan-player-canonical .game-plan-canonical-serve{display:grid!important}
`;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const a=installResolver();
    const b=installToggle();
    const c=wrapRender();
    if(a&&b&&c){
      clearInterval(timer);
      setTimeout(()=>{try{if(typeof renderTactics==='function')renderTactics();}catch(_){}},0);
    }else if(tries>160)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
