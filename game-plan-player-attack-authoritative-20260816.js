(function(){
'use strict';

const FLAG='__gamePlanPlayerAttackAuthoritative20260816';
if(window[FLAG])return;
window[FLAG]=true;

const ORDER=['z4a','z4b','z2','z3a','z3b'];
const META={
  z4a:{short:'AR1',role:'Atacante receptora 1'},
  z4b:{short:'AR2',role:'Atacante receptora 2'},
  z2:{short:'OP',role:'Opuesta'},
  z3a:{short:'C1',role:'Central 1'},
  z3b:{short:'C2',role:'Central 2'}
};
const DIR={line:'Línea',long:'Diagonal larga',medium:'Diagonal media',short:'Diagonal corta',tip:'Finta',attack5:'Ataque a Z5',attack1:'Ataque a Z1'};
const activeByMatch=new Map();
const courtCacheByMatch=new Map();

function coach(){
  try{
    const role=String(typeof getCurrentUser==='function'?(getCurrentUser()?.role||''):'').toLowerCase();
    return Boolean((typeof isCoachUser==='function'&&isCoachUser())||['admin','coach','entrenador'].some(x=>role.includes(x)));
  }catch(_){return false;}
}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function playerLike(){return !coach()||preview();}
function matchKey(){
  try{return String((typeof activeScoutingMatchId!=='undefined'&&activeScoutingMatchId)||document.getElementById('scouting-match-select')?.value||'default');}
  catch(_){return 'default';}
}
function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function plan(){
  const rec=record();
  if(!rec)return null;
  if(preview())return rec.publishedPlan||rec.draftPlan||null;
  if(!coach())return rec.status==='published'?(rec.publishedPlan||null):null;
  return null;
}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function configured(p,key){
  const a=p?.attackers?.[key];
  return Boolean(a?.visibleToPlayers)&&Array.isArray(a?.directions)&&a.directions.length>0;
}
function configuredKeys(p){return ORDER.filter(key=>configured(p,key));}
function section(){return document.querySelector('#scouting-interactive-root .attack-module-section');}
function directionLabel(dir,a){return dir==='tip'?`Finta · Z${Number(a?.tipZone||8)}`:(DIR[dir]||String(dir||''));}

function captureCourts(sec,p){
  const keys=configuredKeys(p);
  const cards=[...sec.querySelectorAll('.attack-cards-grid .attack-scout-card')];
  const previous=new Map(courtCacheByMatch.get(matchKey())||[]);
  if(!keys.length||!cards.length)return previous;
  cards.slice(0,keys.length).forEach((card,index)=>{
    const court=card.querySelector('.attack-card-court')||card.querySelector('.attack-court')||card.querySelector('[class*="attack-court"]');
    if(court)previous.set(keys[index],court.outerHTML);
  });
  courtCacheByMatch.set(matchKey(),previous);
  return previous;
}

function renderPanel(host,p,key,courts){
  const a=p?.attackers?.[key]||{};
  const meta=META[key];
  const has=configured(p,key);
  const name=String(a.name||'').trim();
  const title=name||meta.role;
  const dirs=Array.isArray(a.directions)?a.directions:[];
  const chips=dirs.map(d=>`<span>${esc(directionLabel(d,a))}</span>`).join('');
  const court=courts.get(key)||'';
  host.innerHTML=`
    <article class="player-attack-modern-card ${has?'is-configured':'is-empty'}">
      <header class="player-attack-modern-head">
        <div><small>${esc(meta.short)}</small><strong>${esc(title)}</strong></div>
        <span class="player-attack-modern-state">${has?'Publicado':'Sin datos'}</span>
      </header>
      ${has?`
        <div class="player-attack-modern-tendencies">
          <small>Tendencia de ataque</small>
          <div>${chips}</div>
        </div>
        <div class="player-attack-modern-court">${court||'<div class="player-attack-court-pending">Pista no disponible. Vuelve a abrir el plan.</div>'}</div>
      `:`
        <div class="player-attack-modern-empty">
          <i data-lucide="eye-off"></i>
          <div><strong>Sin tendencia publicada</strong><span>El entrenador todavía no ha publicado indicaciones para ${esc(meta.short)}.</span></div>
        </div>
      `}
    </article>`;
  try{window.lucide?.createIcons?.();}catch(_){}
}

function build(sec,p,courts){
  const keys=configuredKeys(p);
  if(!keys.length)return;
  sec.hidden=false;
  sec.classList.remove('game-plan-player-section-hidden');
  sec.dataset.playerRelevance='visible';
  sec.classList.add('player-attack-authoritative');
  sec.dataset.playerAttackRenderer='20260816j';

  const heading=sec.querySelector('.scout-section-head h3');
  const desc=sec.querySelector('.scout-section-head p');
  if(heading)heading.textContent='Preferencias de ataque rival';
  if(desc)desc.textContent='Cambia de atacante para consultar las tendencias publicadas.';

  sec.querySelector('.game-plan-swipe-hint')?.remove();
  sec.querySelector('.player-attack-tabs')?.remove();
  sec.querySelector('.attack-cards-grid')?.remove();
  sec.querySelector('.player-plan-empty')?.remove();
  sec.querySelector('.player-attack-modern')?.remove();

  const shell=document.createElement('div');
  shell.className='player-attack-modern';
  shell.innerHTML=`
    <div class="player-attack-modern-tabs" role="tablist" aria-label="Atacantes rivales">
      ${ORDER.map(key=>`<button type="button" role="tab" data-player-attack-modern-tab="${key}" class="${configured(p,key)?'has-data':'is-empty'}">${META[key].short}${configured(p,key)?'<b>✓</b>':''}</button>`).join('')}
    </div>
    <div class="player-attack-modern-panel"></div>`;
  sec.appendChild(shell);

  const panel=shell.querySelector('.player-attack-modern-panel');
  let active=activeByMatch.get(matchKey());
  if(!ORDER.includes(active))active=keys[0]||ORDER[0];
  const activate=key=>{
    activeByMatch.set(matchKey(),key);
    shell.querySelectorAll('[data-player-attack-modern-tab]').forEach(btn=>{
      const selected=btn.dataset.playerAttackModernTab===key;
      btn.classList.toggle('is-active',selected);
      btn.setAttribute('aria-selected',selected?'true':'false');
      btn.tabIndex=selected?0:-1;
    });
    renderPanel(panel,p,key,courts);
  };
  shell.querySelector('.player-attack-modern-tabs').addEventListener('click',event=>{
    const btn=event.target.closest('[data-player-attack-modern-tab]');
    if(btn)activate(btn.dataset.playerAttackModernTab);
  });
  activate(active);
}

function apply(){
  const sec=section();
  if(!sec||!playerLike())return;
  const p=plan();
  if(!p||!configuredKeys(p).length)return;

  // Si la capa moderna ya es la única visible, no tocar el DOM.
  if(sec.querySelector('.player-attack-modern')&&!sec.querySelector('.attack-cards-grid'))return;

  const courts=captureCourts(sec,p);
  build(sec,p,courts);
}
function schedule(){requestAnimationFrame(()=>requestAnimationFrame(apply));setTimeout(apply,90);setTimeout(apply,260);}
function wrapRender(){
  const base=window.renderTactics;
  if(typeof base!=='function')return false;
  if(base.__playerAttackAuthoritative20260816)return true;
  const wrapped=function(){const out=base.apply(this,arguments);schedule();return out;};
  wrapped.__playerAttackAuthoritative20260816=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-player-attack-authoritative-20260816-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-player-attack-authoritative-20260816-css';
  style.textContent=`
#view-tactics .player-attack-authoritative .player-attack-modern{display:grid;gap:.7rem;width:100%;min-width:0}
#view-tactics .player-attack-authoritative .attack-cards-grid{display:none!important}
#view-tactics .player-attack-modern-tabs{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:.32rem;width:100%;padding:.3rem;border:1px solid #dbe2ea;border-radius:13px;background:#eef2f6;box-sizing:border-box}
#view-tactics .player-attack-modern-tabs button{position:relative;display:flex;align-items:center;justify-content:center;gap:.2rem;min-width:0;min-height:42px;padding:.42rem .2rem;border:1px solid transparent;border-radius:9px;background:transparent;color:#94a3b8;font-size:.72rem;font-weight:900;box-shadow:none}
#view-tactics .player-attack-modern-tabs button.has-data{color:#334155}
#view-tactics .player-attack-modern-tabs button b{display:grid;place-items:center;width:14px;height:14px;border-radius:50%;background:#dcfce7;color:#15803d;font-size:.56rem}
#view-tactics .player-attack-modern-tabs button.is-active{border-color:#cbd5e1;background:#fff;color:#0f172a;box-shadow:0 2px 7px rgba(15,23,42,.08)}
#view-tactics .player-attack-modern-tabs button.is-active:after{content:'';position:absolute;left:27%;right:27%;bottom:3px;height:2px;border-radius:99px;background:#d97706}
#view-tactics .player-attack-modern-card{overflow:hidden;border:1px solid #dbe3ee;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.06)}
#view-tactics .player-attack-modern-head{display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.78rem .85rem;background:#0f172a;color:#fff}
#view-tactics .player-attack-modern-head>div{display:grid;gap:.08rem;min-width:0}
#view-tactics .player-attack-modern-head small{color:#fbbf24;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
#view-tactics .player-attack-modern-head strong{overflow:hidden;color:#fff;font-size:1rem;font-weight:900;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}
#view-tactics .player-attack-modern-state{flex:0 0 auto;padding:.28rem .45rem;border-radius:999px;background:rgba(255,255,255,.12);font-size:.6rem;font-weight:850;color:#e2e8f0}
#view-tactics .player-attack-modern-tendencies{display:grid;gap:.4rem;margin:.7rem .72rem 0;padding:.6rem .65rem;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff}
#view-tactics .player-attack-modern-tendencies>small{color:#2563eb;font-size:.61rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
#view-tactics .player-attack-modern-tendencies>div{display:flex;flex-wrap:wrap;gap:.36rem}
#view-tactics .player-attack-modern-tendencies span{display:inline-flex;align-items:center;min-height:26px;padding:.27rem .48rem;border-radius:999px;background:#eaf2ff;color:#1e3a8a;font-size:.68rem;font-weight:850}
#view-tactics .player-attack-modern-court{padding:.7rem;min-width:0;overflow:hidden}
#view-tactics .player-attack-modern-court>*{max-width:100%!important;box-sizing:border-box!important;margin-left:auto!important;margin-right:auto!important}
#view-tactics .player-attack-modern-empty{display:flex;align-items:center;gap:.65rem;padding:1.1rem .9rem;color:#64748b;background:#f8fafc}
#view-tactics .player-attack-modern-empty svg{width:20px;height:20px;flex:0 0 auto;color:#94a3b8}
#view-tactics .player-attack-modern-empty>div{display:grid;gap:.08rem}
#view-tactics .player-attack-modern-empty strong{font-size:.78rem;color:#334155}
#view-tactics .player-attack-modern-empty span{font-size:.69rem;line-height:1.35}
#view-tactics .player-attack-court-pending{padding:1rem;border-radius:12px;background:#f8fafc;color:#64748b;text-align:center;font-size:.72rem;font-weight:700}
@media(max-width:720px){
  #view-tactics .player-attack-modern-tabs{gap:.25rem;padding:.26rem}
  #view-tactics .player-attack-modern-tabs button{min-height:40px;font-size:.69rem;padding:.38rem .12rem}
  #view-tactics .player-attack-modern-tabs button b{width:12px;height:12px;font-size:.5rem}
  #view-tactics .player-attack-modern-head{padding:.72rem .76rem}
  #view-tactics .player-attack-modern-court{padding:.62rem}
}
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
      schedule();
    }else if(tries>160)clearInterval(timer);
  },100);


  window.addEventListener('pageshow',schedule);
  window.addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
