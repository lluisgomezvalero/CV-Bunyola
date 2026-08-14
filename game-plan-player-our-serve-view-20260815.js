(function(){
'use strict';

const FLAG='__gamePlanPlayerOurServeView20260815';
if(window[FLAG])return;
window[FLAG]=true;

const ZONES=[4,3,2,7,8,9,5,6,1];

function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function plan(){
  const rec=record();
  if(!rec)return null;
  try{
    if(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode)return rec.publishedPlan||rec.draftPlan||null;
  }catch(_){}
  return rec.publishedPlan||null;
}
function playerLike(){
  const root=document.getElementById('scouting-interactive-root');
  return Boolean(root?.querySelector('.player-plan-heading'));
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function stateFor(p,zone){return p?.serveTargets?.[`z${zone}`]||'none';}
function hasZones(p){return ZONES.some(zone=>stateFor(p,zone)!=='none');}
function label(value){return value==='primary'?'Principal':value==='secondary'?'Alternativa':'';}
function section(){return document.querySelector('#scouting-interactive-root .serve-target-text-section');}

function renderCourt(p){
  return `<div class="player-our-serve-board">
    <div class="player-our-serve-target"><small>Objetivo de saque</small><strong>${esc(p?.servePlayerTarget||'Sin jugadora indicada')}</strong></div>
    <div class="player-our-serve-court" aria-label="Zonas objetivo de nuestro saque">
      <div class="player-our-serve-net"><span>RED</span></div>
      <div class="player-our-serve-grid">
        ${ZONES.map(zone=>{const state=stateFor(p,zone);return `<div class="is-${state}"><b>Z${zone}</b>${state!=='none'?`<span>${label(state)}</span>`:''}</div>`;}).join('')}
      </div>
    </div>
    <div class="player-our-serve-legend"><span><i class="secondary"></i> Alternativa</span><span><i class="primary"></i> Principal</span></div>
  </div>`;
}

function decorate(){
  const sec=section();
  if(!sec||!playerLike())return;
  const p=plan();
  if(!p||p.hideServeObjectives)return;

  const heading=sec.querySelector('.scout-section-head h3');
  const desc=sec.querySelector('.scout-section-head p');
  if(heading)heading.textContent='Nuestro saque';
  if(desc)desc.textContent=hasZones(p)?'A quién buscamos y qué zonas priorizamos.':'A quién debemos dirigir el saque.';

  const original=sec.querySelector('.serve-player-target');
  let board=sec.querySelector('.player-our-serve-board');
  if(!hasZones(p)){
    board?.remove();
    if(original)original.style.display='';
    return;
  }
  if(original)original.style.display='none';
  if(!board){
    const host=document.createElement('div');
    host.innerHTML=renderCourt(p);
    board=host.firstElementChild;
    sec.appendChild(board);
  }else{
    const host=document.createElement('div');
    host.innerHTML=renderCourt(p);
    board.replaceWith(host.firstElementChild);
  }
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__playerOurServeView20260815)return true;
  const base=window.renderTactics;
  const wrapped=function(){const out=base.apply(this,arguments);requestAnimationFrame(decorate);return out;};
  wrapped.__playerOurServeView20260815=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-player-our-serve-view-20260815-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-player-our-serve-view-20260815-css';
  style.textContent=`
#view-tactics .player-our-serve-board{display:grid;gap:.62rem;margin-top:.15rem}
#view-tactics .player-our-serve-target{display:grid;gap:.08rem;padding:.62rem .68rem;border:1px solid #dbe2ea;border-radius:12px;background:#f8fafc}
#view-tactics .player-our-serve-target small{font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#64748b}
#view-tactics .player-our-serve-target strong{font-size:.88rem;color:#0f172a}
#view-tactics .player-our-serve-court{position:relative;padding-top:26px;border:2px solid #475569;border-radius:11px;overflow:hidden;background:#d7ad70;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
#view-tactics .player-our-serve-net{position:absolute;left:0;right:0;top:0;height:26px;display:grid;place-items:center;background:#0f172a;color:#f8fafc;border-bottom:2px solid rgba(255,255,255,.9);z-index:2}
#view-tactics .player-our-serve-net span{font-size:.55rem;font-weight:900;letter-spacing:.12em}
#view-tactics .player-our-serve-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,68px)}
#view-tactics .player-our-serve-grid>div{position:relative;border-right:1px solid rgba(255,255,255,.9);border-bottom:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.05);color:#1f2937;display:grid;place-items:center;align-content:center;gap:.15rem}
#view-tactics .player-our-serve-grid>div:nth-child(3n){border-right:0}
#view-tactics .player-our-serve-grid>div:nth-last-child(-n+3){border-bottom:0}
#view-tactics .player-our-serve-grid b{font-size:.9rem}
#view-tactics .player-our-serve-grid span{font-size:.55rem;font-weight:850;opacity:.86}
#view-tactics .player-our-serve-grid .is-secondary{background:rgba(59,130,246,.36);color:#1e3a8a}
#view-tactics .player-our-serve-grid .is-primary{background:rgba(220,38,38,.5);color:#7f1d1d;box-shadow:inset 0 0 0 2px rgba(254,202,202,.86)}
#view-tactics .player-our-serve-grid .is-primary b:before{content:'★ ';font-size:.68rem;color:#fef08a;text-shadow:0 1px 2px rgba(0,0,0,.2)}
#view-tactics .player-our-serve-legend{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;color:#64748b;font-size:.6rem;font-weight:760}
#view-tactics .player-our-serve-legend>span{display:inline-flex;align-items:center;gap:.25rem}
#view-tactics .player-our-serve-legend i{display:inline-block;width:9px;height:9px;border-radius:3px}
#view-tactics .player-our-serve-legend i.secondary{background:#3b82f6}
#view-tactics .player-our-serve-legend i.primary{background:#dc2626}
`;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(wrapRender()){
      clearInterval(timer);
      setTimeout(decorate,0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
