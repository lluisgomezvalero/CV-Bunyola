(function(){
'use strict';

const FLAG='__gamePlanPlayerRivalServe20260816';
if(window[FLAG])return;
window[FLAG]=true;

const ZONES=[4,3,2,7,8,9,5,6,1];

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function playerLike(){return !coach()||preview();}
function plan(){try{return typeof getActiveScoutingPlan==='function'?getActiveScoutingPlan():null;}catch(_){return null;}}
function state(value){const n=Math.max(0,Number(value)||0);if(n>=75)return 'primary';if(n>0)return 'frequent';return 'none';}
function label(s){return s==='primary'?'Principal':s==='frequent'?'Frecuente':'';}
function section(){
  const root=document.getElementById('scouting-interactive-root');
  const legacy=root?.querySelector('.serve-heat-volleyball-wrap');
  return legacy?.closest('.scout-section')||null;
}
function html(p){
  const primary=[];const frequent=[];
  ZONES.forEach(z=>{const s=state(p?.servePct?.[`z${z}`]);if(s==='primary')primary.push(`Z${z}`);else if(s==='frequent')frequent.push(`Z${z}`);});
  const summary=[];
  if(primary.length)summary.push(`<span><strong>Principal:</strong> ${primary.join(', ')}</span>`);
  if(frequent.length)summary.push(`<span><strong>Frecuente:</strong> ${frequent.join(', ')}</span>`);
  return `<div class="player-rival-serve-board">
    <div class="player-rival-serve-court" aria-label="Zonas de saque rival">
      <div class="player-rival-serve-net"><span>RED</span></div>
      <div class="player-rival-serve-grid">
        ${ZONES.map(z=>{const s=state(p?.servePct?.[`z${z}`]);return `<div class="is-${s}"><b>Z${z}</b>${s!=='none'?`<span>${label(s)}</span>`:''}</div>`;}).join('')}
      </div>
    </div>
    <div class="player-rival-serve-summary">${summary.join('')||'<span>Sin tendencia publicada</span>'}</div>
    <div class="player-rival-serve-legend"><span><i class="frequent"></i> Frecuente</span><span><i class="primary"></i> Principal</span></div>
  </div>`;
}
function decorate(){
  if(!playerLike())return;
  const p=plan();
  const sec=section();
  if(!p||!sec)return;
  const legacy=sec.querySelector('.serve-heat-volleyball-wrap');
  let board=sec.querySelector('.player-rival-serve-board');
  const heading=sec.querySelector('.scout-section-head h3');
  const desc=sec.querySelector('.scout-section-head p');
  if(heading)heading.textContent='Saque rival';
  if(desc)desc.textContent='Zonas que debemos anticipar con mayor frecuencia.';
  if(legacy)legacy.style.display='none';
  const host=document.createElement('div');host.innerHTML=html(p);const fresh=host.firstElementChild;
  if(board)board.replaceWith(fresh);else sec.appendChild(fresh);
}
function wrapRender(){
  const base=window.renderTactics;
  if(typeof base!=='function')return false;
  if(base.__playerRivalServe20260816)return true;
  const wrapped=function(){const out=base.apply(this,arguments);requestAnimationFrame(decorate);return out;};
  wrapped.__playerRivalServe20260816=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-player-rival-serve-20260816-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-player-rival-serve-20260816-css';
  style.textContent=`
#view-tactics .player-rival-serve-board{display:grid;gap:.62rem;margin-top:.12rem}
#view-tactics .player-rival-serve-court{position:relative;padding-top:26px;border:2px solid #475569;border-radius:12px;overflow:hidden;background:#d7ad70;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
#view-tactics .player-rival-serve-net{position:absolute;left:0;right:0;top:0;height:26px;display:grid;place-items:center;background:#0f172a;color:#f8fafc;border-bottom:2px solid rgba(255,255,255,.92);z-index:2}
#view-tactics .player-rival-serve-net span{font-size:.55rem;font-weight:900;letter-spacing:.12em}
#view-tactics .player-rival-serve-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,68px)}
#view-tactics .player-rival-serve-grid>div{position:relative;border-right:1px solid rgba(255,255,255,.9);border-bottom:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.05);color:#1f2937;display:grid;place-items:center;align-content:center;gap:.15rem}
#view-tactics .player-rival-serve-grid>div:nth-child(3n){border-right:0}
#view-tactics .player-rival-serve-grid>div:nth-last-child(-n+3){border-bottom:0}
#view-tactics .player-rival-serve-grid b{font-size:.9rem}
#view-tactics .player-rival-serve-grid span{font-size:.55rem;font-weight:850;opacity:.9}
#view-tactics .player-rival-serve-grid .is-frequent{background:rgba(59,130,246,.36);color:#1e3a8a}
#view-tactics .player-rival-serve-grid .is-primary{background:rgba(220,38,38,.5);color:#7f1d1d;box-shadow:inset 0 0 0 2px rgba(254,202,202,.86)}
#view-tactics .player-rival-serve-grid .is-primary b:before{content:'★ ';font-size:.68rem;color:#fef08a;text-shadow:0 1px 2px rgba(0,0,0,.2)}
#view-tactics .player-rival-serve-summary{display:flex;flex-wrap:wrap;gap:.35rem .7rem;padding:.48rem .58rem;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#475569;font-size:.65rem;font-weight:720}
#view-tactics .player-rival-serve-summary strong{color:#0f172a;font-weight:900}
#view-tactics .player-rival-serve-legend{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;color:#64748b;font-size:.6rem;font-weight:760}
#view-tactics .player-rival-serve-legend>span{display:inline-flex;align-items:center;gap:.25rem}
#view-tactics .player-rival-serve-legend i{display:inline-block;width:9px;height:9px;border-radius:3px}
#view-tactics .player-rival-serve-legend i.frequent{background:#3b82f6}
#view-tactics .player-rival-serve-legend i.primary{background:#dc2626}
`;
  document.head.appendChild(style);
}
function install(){injectStyles();let tries=0;const timer=setInterval(()=>{tries++;if(wrapRender()){clearInterval(timer);requestAnimationFrame(decorate);}else if(tries>120)clearInterval(timer);},100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
