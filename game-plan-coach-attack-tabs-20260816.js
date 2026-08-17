(function(){
'use strict';

const FLAG='__gamePlanCoachAttackTabs20260816';
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
let rootBound=false;
let matchBound=false;

function coachEditing(){
  try{
    const role=String(typeof getCurrentUser==='function'?(getCurrentUser()?.role||''):'').toLowerCase();
    const roleIsCoach=['admin','administrator','coach','entrenador'].some(token=>role.includes(token));
    const coachFn=typeof isCoachUser==='function'&&isCoachUser();
    const preview=typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);
    return Boolean((coachFn||roleIsCoach)&&!preview);
  }catch(_){return false;}
}
function mobile(){return window.matchMedia('(max-width:720px)').matches;}
function matchKey(){
  try{return String((typeof activeScoutingMatchId!=='undefined'&&activeScoutingMatchId)||document.getElementById('scouting-match-select')?.value||'default');}
  catch(_){return 'default';}
}
function section(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root)return null;
  return root.querySelector('.attack-module-section')||[...root.querySelectorAll('.scout-section')].find(sec=>sec.querySelectorAll('.attack-scout-card').length>=2)||null;
}
function cardKey(card){
  const input=card?.querySelector('.attack-name-input[id^="attacker-name-"]')||card?.querySelector('[id^="attacker-name-"]');
  const key=String(input?.id||'').replace('attacker-name-','');
  return ORDER.includes(key)?key:null;
}
function items(sec){
  return [...(sec?.querySelectorAll('.attack-scout-card')||[])]
    .map(card=>({card,key:cardKey(card)}))
    .filter(item=>item.key)
    .sort((a,b)=>ORDER.indexOf(a.key)-ORDER.indexOf(b.key));
}
function currentPlan(){try{return typeof getActiveScoutingPlan==='function'?getActiveScoutingPlan():null;}catch(_){return null;}}
function configured(sec,key){
  const checked=[...sec.querySelectorAll(`input[id^="attacker-${key}-"]`)].some(el=>el.type==='checkbox'&&el.checked);
  if(checked)return true;
  const dirs=currentPlan()?.attackers?.[key]?.directions;
  return Array.isArray(dirs)&&dirs.length>0;
}
function setRoleLabels(list){
  list.forEach(({card,key})=>{
    const role=card.querySelector('.attack-role');
    if(role)role.textContent=META[key]?.role||key;
  });
}
function ensureTabs(sec,list){
  sec.querySelectorAll('.coach-attack-tabs').forEach(el=>el.remove());
  let tabs=sec.querySelector('.coach-attack-tabs-final');
  if(!tabs){
    tabs=document.createElement('div');
    tabs.className='coach-attack-tabs-final';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Seleccionar atacante rival');
    const head=sec.querySelector('.scout-section-head');
    if(head)head.insertAdjacentElement('afterend',tabs);else sec.prepend(tabs);
  }
  const expected=list.map(item=>item.key).join(',');
  if(tabs.dataset.keys!==expected){
    tabs.dataset.keys=expected;
    tabs.innerHTML=list.map(({key})=>`<button type="button" role="tab" data-attack-tab="${key}" aria-label="${META[key]?.role||key}"><span>${META[key]?.short||key}</span><b aria-hidden="true">✓</b></button>`).join('');
  }
  return tabs;
}
function applyActive(sec,list,requested){
  const available=list.map(item=>item.key);
  const active=available.includes(requested)?requested:available[0];
  if(!active)return;
  activeByMatch.set(matchKey(),active);
  sec.querySelectorAll('.coach-attack-tabs-final [data-attack-tab]').forEach(btn=>{
    const selected=btn.dataset.attackTab===active;
    btn.classList.toggle('is-active',selected);
    btn.classList.toggle('is-complete',configured(sec,btn.dataset.attackTab));
    btn.setAttribute('aria-selected',selected?'true':'false');
    btn.tabIndex=selected?0:-1;
  });
  list.forEach(({card,key})=>{
    card.dataset.coachAttackTabKey=key;
    card.dataset.coachAttackTabActive=key===active?'1':'0';
  });
}
function reset(sec,list){
  sec?.classList.remove('coach-attack-tabbed-mobile');
  sec?.querySelectorAll('.coach-attack-tabs-final').forEach(el=>el.remove());
  list.forEach(({card})=>{
    card.removeAttribute('data-coach-attack-tab-key');
    card.removeAttribute('data-coach-attack-tab-active');
  });
}
function decorate(){
  const sec=section();
  if(!sec)return false;
  const list=items(sec);
  if(list.length<2)return false;
  setRoleLabels(list);
  if(!coachEditing()||!mobile()){
    reset(sec,list);
    return true;
  }
  sec.classList.add('coach-attack-tabbed-mobile');
  const tabs=ensureTabs(sec,list);
  const saved=activeByMatch.get(matchKey());
  applyActive(sec,list,saved||list[0].key);
  if(tabs.dataset.bound!=='1'){
    tabs.dataset.bound='1';
    tabs.addEventListener('click',event=>{
      const btn=event.target.closest('[data-attack-tab]');
      if(!btn)return;
      applyActive(sec,items(sec),btn.dataset.attackTab);
    });
  }
  return true;
}
function schedule(){
  requestAnimationFrame(()=>requestAnimationFrame(decorate));
  window.setTimeout(decorate,80);
}
window.refreshCoachAttackTabs=schedule;
function bindRoot(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||rootBound)return false;
  rootBound=true;
  const refresh=event=>{
    const id=String(event.target?.id||'');
    if(id.startsWith('attacker-'))requestAnimationFrame(decorate);
  };
  root.addEventListener('change',refresh);
  root.addEventListener('input',refresh);
  return true;
}
function bindMatch(){
  if(matchBound)return;
  const select=document.getElementById('scouting-match-select');
  if(!select)return;
  matchBound=true;
  select.addEventListener('change',()=>window.setTimeout(decorate,0));
}
function wrapRender(){
  const base=window.renderTactics;
  if(typeof base!=='function')return false;
  if(base.__coachAttackTabs20260816)return true;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    schedule();
    return out;
  };
  wrapped.__coachAttackTabs20260816=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-coach-attack-tabs-20260816-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-coach-attack-tabs-20260816-css';
  style.textContent=`
.coach-attack-tabs-final{display:none}
@media(max-width:720px){
  #view-tactics .coach-attack-tabbed-mobile .coach-attack-tabs-final{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:.3rem;width:100%;margin:-.1rem 0 .65rem;padding:.28rem;border:1px solid #dbe2ea;border-radius:13px;background:#eef2f6;box-sizing:border-box}
  #view-tactics .coach-attack-tabs-final button{position:relative;display:flex;align-items:center;justify-content:center;gap:.2rem;min-width:0;min-height:40px;padding:.42rem .18rem;border:1px solid transparent;border-radius:9px;background:transparent;color:#64748b;font-size:.72rem;font-weight:900;letter-spacing:.025em;box-shadow:none}
  #view-tactics .coach-attack-tabs-final button b{display:none;width:14px;height:14px;place-items:center;border-radius:999px;background:#dcfce7;color:#15803d;font-size:.58rem;line-height:1}
  #view-tactics .coach-attack-tabs-final button.is-complete b{display:grid}
  #view-tactics .coach-attack-tabs-final button.is-active{border-color:#cbd5e1;background:#fff;color:#0f172a;box-shadow:0 2px 7px rgba(15,23,42,.08)}
  #view-tactics .coach-attack-tabs-final button.is-active::after{content:'';position:absolute;left:26%;right:26%;bottom:3px;height:2px;border-radius:99px;background:#d97706}
  #view-tactics .coach-attack-tabbed-mobile .attack-cards-grid{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow:visible!important;padding:0!important;margin:0!important;scroll-snap-type:none!important}
  #view-tactics .coach-attack-tabbed-mobile .attack-scout-card[data-coach-attack-tab-active="0"]{display:none!important}
  #view-tactics .coach-attack-tabbed-mobile .attack-scout-card[data-coach-attack-tab-active="1"]{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;flex:0 0 100%!important;margin:0!important}
}`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();
  let tries=0;
  const timer=window.setInterval(()=>{
    tries++;
    const wrapped=wrapRender();
    bindRoot();
    bindMatch();
    const ready=decorate();
    if(wrapped&&ready){
      window.clearInterval(timer);
      schedule();
    }else if(tries>=120){
      window.clearInterval(timer);
    }
  },100);
  window.matchMedia('(max-width:720px)').addEventListener?.('change',schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
