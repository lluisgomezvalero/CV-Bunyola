(function(){
'use strict';

const FLAG='__gamePlanPlayerRelevance20260815';
if(window[FLAG])return;
window[FLAG]=true;

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function playerLike(){return !coach()||preview();}
function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function plan(){
  const rec=record();
  if(!rec)return null;
  if(preview())return rec.publishedPlan||rec.draftPlan||null;
  if(!coach())return rec.status==='published'?(rec.publishedPlan||null):null;
  return rec.draftPlan||null;
}

function hasAttack(p){
  return Object.values(p?.attackers||{}).some(a=>Boolean(a?.visibleToPlayers)&&Array.isArray(a?.directions)&&a.directions.length>0);
}
function hasRivalServe(p){
  return Object.values(p?.servePct||{}).some(value=>(Number(value)||0)>0);
}
function hasOurServe(p){
  if(!p||p.hideServeObjectives)return false;
  const target=String(p.servePlayerTarget||'').trim();
  const zones=Object.values(p.serveTargets||{}).some(value=>value&&value!=='none');
  return Boolean(target||zones);
}
function labelsFor(section){
  if(section.classList.contains('attack-module-section'))return {short:'Ataque rival',title:'Cómo nos atacan'};
  if(section.classList.contains('serve-target-text-section'))return {short:'Nuestro saque',title:'Nuestro saque'};
  return {short:'Saque rival',title:'Dónde nos sacan'};
}
function directSections(root){return [...root.querySelectorAll(':scope > .scout-section')];}
function identify(root){
  const sections=directSections(root);
  const attack=sections.find(s=>s.classList.contains('attack-module-section'))||null;
  const ours=sections.find(s=>s.classList.contains('serve-target-text-section'))||null;
  const rival=sections.find(s=>s!==attack&&s!==ours&&(
    s.querySelector('.serve-heat-volleyball-wrap,.serve-heat-grid,[id^="serve-pct-z"]')||
    /saque rival|dónde nos sacan/i.test(s.querySelector('.scout-section-head h3')?.textContent||'')
  ))||null;
  return {sections,attack,rival,ours};
}
function removeOwnNav(root){root.querySelector('.game-plan-relevance-nav')?.remove();}
function removeEmpty(root){root.querySelector('.game-plan-player-no-tactics')?.remove();}
function restore(root){
  removeOwnNav(root); removeEmpty(root);
  directSections(root).forEach(section=>{
    section.hidden=false;
    section.classList.remove('game-plan-player-section-hidden');
    section.removeAttribute('data-player-relevance');
  });
}
function ensureEmpty(root){
  removeEmpty(root);
  const empty=document.createElement('div');
  empty.className='game-plan-player-no-tactics';
  empty.innerHTML='<i data-lucide="clipboard-check"></i><div><strong>Plan publicado</strong><span>No hay indicaciones tácticas visibles para este partido.</span></div>';
  const hero=root.querySelector('.game-plan-match-hero');
  if(hero)hero.insertAdjacentElement('afterend',empty);
  else root.prepend(empty);
}
function ensureNav(root,visible){
  removeOwnNav(root);
  root.querySelector('.game-plan-player-nav')?.remove();
  if(visible.length<2)return;
  const nav=document.createElement('nav');
  nav.className='game-plan-player-nav game-plan-relevance-nav';
  nav.setAttribute('aria-label','Ir a una parte del plan');
  nav.innerHTML=visible.map((section,index)=>{
    section.id=`game-plan-player-visible-${index+1}`;
    return `<button type="button" data-relevance-jump="${section.id}">${labelsFor(section).short}</button>`;
  }).join('');
  nav.addEventListener('click',event=>{
    const btn=event.target.closest('[data-relevance-jump]');
    if(!btn)return;
    document.getElementById(btn.dataset.relevanceJump)?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  const hero=root.querySelector('.game-plan-match-hero');
  if(hero)hero.insertAdjacentElement('afterend',nav);
  else visible[0].insertAdjacentElement('beforebegin',nav);
}
function apply(){
  const root=document.getElementById('scouting-interactive-root');
  const view=document.getElementById('view-tactics');
  if(!root||!view)return;
  if(!playerLike()){
    restore(root);
    view.classList.remove('game-plan-player-relevance');
    return;
  }
  const p=plan();
  if(!p)return;
  view.classList.add('game-plan-player-relevance');
  removeEmpty(root);
  const {sections,attack,rival,ours}=identify(root);
  const visibleMap=new Map([
    [attack,hasAttack(p)],
    [rival,hasRivalServe(p)],
    [ours,hasOurServe(p)]
  ]);
  sections.forEach(section=>{
    const known=visibleMap.has(section);
    const show=known?visibleMap.get(section):true;
    section.hidden=!show;
    section.classList.toggle('game-plan-player-section-hidden',!show);
    if(known)section.dataset.playerRelevance=show?'visible':'hidden';
  });
  const visible=sections.filter(section=>!section.hidden);
  visible.forEach((section,index)=>{
    section.id=`game-plan-player-visible-${index+1}`;
    const number=section.querySelector('.scout-section-head>span');
    if(number)number.textContent=String(index+1);
    const heading=section.querySelector('.scout-section-head h3');
    const meta=labelsFor(section);
    if(heading&&meta.title)heading.textContent=meta.title;
  });
  if(!visible.length){
    removeOwnNav(root);
    root.querySelector('.game-plan-player-nav')?.remove();
    ensureEmpty(root);
  }else{
    ensureNav(root,visible);
  }
  try{window.lucide?.createIcons?.();}catch(_){}
}
function schedule(){
  requestAnimationFrame(()=>requestAnimationFrame(apply));
  setTimeout(apply,90);
}
function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__playerRelevance20260815)return true;
  const base=window.renderTactics;
  const wrapped=function(){const out=base.apply(this,arguments);schedule();return out;};
  wrapped.__playerRelevance20260815=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-player-relevance-20260815-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-player-relevance-20260815-css';
  style.textContent=`
#view-tactics.game-plan-player-relevance .game-plan-player-section-hidden{display:none!important}
#view-tactics.game-plan-player-relevance .game-plan-relevance-nav{margin:.05rem 0 .75rem;padding:.05rem 0 .18rem}
#view-tactics .game-plan-player-no-tactics{display:flex;align-items:center;gap:.7rem;margin:.2rem 0 1rem;padding:.8rem .9rem;border:1px solid #dbeafe;border-radius:13px;background:#f8fbff;color:#334155}
#view-tactics .game-plan-player-no-tactics>i,#view-tactics .game-plan-player-no-tactics>svg{width:20px;height:20px;color:#2563eb;flex:0 0 auto}
#view-tactics .game-plan-player-no-tactics>div{display:grid;gap:.08rem}
#view-tactics .game-plan-player-no-tactics strong{font-size:.78rem;color:#0f172a}
#view-tactics .game-plan-player-no-tactics span{font-size:.68rem;line-height:1.35;color:#64748b}
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
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
