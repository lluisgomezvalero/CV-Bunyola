(function(){
'use strict';

const FLAG='__gamePlanPlayerAttackTabs20260816';
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
const activeByMatch=new Map();

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function playerLike(){return !coach()||preview();}
function mobile(){return window.matchMedia('(max-width:720px)').matches;}
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
function visibleKeys(p){
  return ORDER.filter(key=>{
    const a=p?.attackers?.[key];
    return Boolean(a?.visibleToPlayers)&&Array.isArray(a?.directions)&&a.directions.length>0;
  });
}
function section(){return document.querySelector('#scouting-interactive-root .attack-module-section');}
function clearPlayerState(sec){
  if(!sec)return;
  sec.classList.remove('player-attack-tabbed-mobile');
  sec.querySelector('.player-attack-tabs')?.remove();
  sec.querySelectorAll('.attack-scout-card').forEach(card=>{
    card.removeAttribute('data-player-attack-key');
    card.removeAttribute('data-player-attack-active');
  });
}
function setActive(sec,cards,keys,requested){
  const active=keys.includes(requested)?requested:keys[0];
  if(!active)return;
  activeByMatch.set(matchKey(),active);
  sec.querySelectorAll('[data-player-attack-tab]').forEach(btn=>{
    const selected=btn.dataset.playerAttackTab===active;
    btn.classList.toggle('is-active',selected);
    btn.setAttribute('aria-selected',selected?'true':'false');
    btn.tabIndex=selected?0:-1;
  });
  cards.forEach((card,index)=>{
    const key=keys[index];
    card.dataset.playerAttackKey=key||'';
    card.dataset.playerAttackActive=key===active?'1':'0';
  });
}
function ensureTabs(sec,cards,keys){
  let tabs=sec.querySelector('.player-attack-tabs');
  if(!tabs){
    tabs=document.createElement('div');
    tabs.className='player-attack-tabs';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Atacantes rivales');
    const head=sec.querySelector('.scout-section-head');
    if(head)head.insertAdjacentElement('afterend',tabs);
    else sec.prepend(tabs);
  }
  const signature=keys.join('|');
  if(tabs.dataset.signature!==signature){
    tabs.innerHTML=keys.map(key=>`<button type="button" role="tab" data-player-attack-tab="${key}" aria-label="${META[key].role}">${META[key].short}</button>`).join('');
    tabs.dataset.signature=signature;
  }
  if(tabs.dataset.bound!=='1'){
    tabs.dataset.bound='1';
    tabs.addEventListener('click',event=>{
      const btn=event.target.closest('[data-player-attack-tab]');
      if(!btn)return;
      setActive(sec,cards,keys,btn.dataset.playerAttackTab);
    });
  }
  return tabs;
}
function apply(){
  const sec=section();
  if(!sec)return;
  if(!playerLike()){
    clearPlayerState(sec);
    return;
  }
  const p=plan();
  if(!p)return;
  const keys=visibleKeys(p);
  const cards=[...sec.querySelectorAll('.attack-scout-card')].slice(0,keys.length);
  if(!keys.length||!cards.length){
    clearPlayerState(sec);
    return;
  }

  cards.forEach((card,index)=>{
    const key=keys[index];
    card.dataset.playerAttackKey=key;
    const role=card.querySelector('.attack-role');
    if(role&&META[key])role.textContent=META[key].role;
  });

  const tabs=ensureTabs(sec,cards,keys);
  const enabled=mobile()&&keys.length>1;
  tabs.hidden=!enabled;
  sec.classList.toggle('player-attack-tabbed-mobile',enabled);

  if(!enabled){
    cards.forEach(card=>card.removeAttribute('data-player-attack-active'));
    return;
  }
  const saved=activeByMatch.get(matchKey());
  setActive(sec,cards,keys,saved||keys[0]);
}
function schedule(){
  requestAnimationFrame(()=>requestAnimationFrame(apply));
  setTimeout(apply,130);
}
function wrapRender(){
  const base=window.renderTactics;
  if(typeof base!=='function')return false;
  if(base.__playerAttackTabs20260816)return true;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    schedule();
    return out;
  };
  wrapped.__playerAttackTabs20260816=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-player-attack-tabs-20260816-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-player-attack-tabs-20260816-css';
  style.textContent=`
.player-attack-tabs{display:none}
@media(max-width:720px){
  #view-tactics.game-plan-player .player-attack-tabs:not([hidden]),
  #view-tactics.game-plan-preview-canonical .player-attack-tabs:not([hidden]){
    display:grid!important;
    grid-auto-flow:column;
    grid-auto-columns:minmax(54px,1fr);
    gap:.32rem;
    width:100%;
    margin:-.05rem 0 .65rem;
    padding:.3rem;
    overflow-x:auto;
    scrollbar-width:none;
    border:1px solid #dbe2ea;
    border-radius:13px;
    background:#eef2f6;
    box-sizing:border-box;
  }
  #view-tactics .player-attack-tabs::-webkit-scrollbar{display:none}
  #view-tactics .player-attack-tabs button{
    position:relative;
    min-width:54px;
    min-height:40px;
    padding:.42rem .35rem;
    border:1px solid transparent;
    border-radius:9px;
    background:transparent;
    color:#64748b;
    font-size:.73rem;
    font-weight:900;
    letter-spacing:.025em;
    box-shadow:none;
  }
  #view-tactics .player-attack-tabs button.is-active{
    border-color:#cbd5e1;
    background:#fff;
    color:#0f172a;
    box-shadow:0 2px 7px rgba(15,23,42,.08);
  }
  #view-tactics .player-attack-tabs button.is-active::after{
    content:'';
    position:absolute;
    left:28%;right:28%;bottom:3px;
    height:2px;
    border-radius:99px;
    background:#d97706;
  }
  #view-tactics .player-attack-tabbed-mobile .attack-cards-grid{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    overflow:visible!important;
    padding:0!important;
    margin:0!important;
  }
  #view-tactics .player-attack-tabbed-mobile .attack-scout-card[data-player-attack-active="0"]{display:none!important}
  #view-tactics .player-attack-tabbed-mobile .attack-scout-card[data-player-attack-active="1"]{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    margin:0!important;
  }
  #view-tactics.game-plan-player .attack-scout-card .attack-role,
  #view-tactics.game-plan-preview-canonical .attack-scout-card .attack-role{
    letter-spacing:.055em;
  }
}
`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=wrapRender();
    if(ready){clearInterval(timer);schedule();}
    else if(tries>120)clearInterval(timer);
  },100);
  window.matchMedia('(max-width:720px)').addEventListener?.('change',schedule);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
