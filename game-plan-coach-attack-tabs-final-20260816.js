(function(){
'use strict';

const FLAG='__gamePlanCoachAttackTabsFinal20260816';
if(window[FLAG])return;
window[FLAG]=true;

const ORDER=['z4a','z4b','z2','z3a','z3b'];
const META={z4a:'AR1',z4b:'AR2',z2:'OP',z3a:'C1',z3b:'C2'};
const activeByMatch=new Map();

function coachEditing(){
  try{
    const role=String(typeof getCurrentUser==='function'?(getCurrentUser()?.role||''):'').toLowerCase();
    const coachRole=['admin','administrator','coach','entrenador'].some(token=>role.includes(token));
    const coachFn=typeof isCoachUser==='function'&&isCoachUser();
    const preview=typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);
    return Boolean((coachFn||coachRole)&&!preview);
  }catch(_){return false;}
}
function mobile(){return window.matchMedia('(max-width:720px)').matches;}
function matchKey(){
  try{return String((typeof activeScoutingMatchId!=='undefined'&&activeScoutingMatchId)||document.getElementById('scouting-match-select')?.value||'default');}
  catch(_){return 'default';}
}
function section(){return document.querySelector('#scouting-interactive-root .attack-module-section');}
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
function configured(sec,key){
  const checked=[...sec.querySelectorAll(`input[id^="attacker-${key}-"]`)].some(el=>el.type==='checkbox'&&el.checked);
  if(checked)return true;
  try{
    const plan=typeof getActiveScoutingPlan==='function'?getActiveScoutingPlan():null;
    return Array.isArray(plan?.attackers?.[key]?.directions)&&plan.attackers[key].directions.length>0;
  }catch(_){return false;}
}
function ensureTabs(sec,list){
  sec.querySelectorAll('.coach-attack-tabs-final').forEach(el=>el.remove());
  const tabs=document.createElement('div');
  tabs.className='coach-attack-tabs-final';
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label','Seleccionar atacante rival');
  tabs.innerHTML=ORDER.map(key=>{
    const exists=list.some(item=>item.key===key);
    if(!exists)return '';
    const done=configured(sec,key);
    return `<button type="button" role="tab" data-attack-tab="${key}" class="${done?'is-complete':''}"><span>${META[key]}</span><b aria-hidden="true">✓</b></button>`;
  }).join('');
  const old=sec.querySelector('.coach-attack-tabs');
  if(old)old.hidden=true;
  const head=sec.querySelector('.scout-section-head');
  if(head)head.insertAdjacentElement('afterend',tabs); else sec.prepend(tabs);
  return tabs;
}
function applyActive(sec,list,key){
  const available=list.map(item=>item.key);
  const active=available.includes(key)?key:available[0];
  if(!active)return;
  activeByMatch.set(matchKey(),active);
  sec.querySelectorAll('.coach-attack-tabs-final [data-attack-tab]').forEach(btn=>{
    const selected=btn.dataset.attackTab===active;
    btn.classList.toggle('is-active',selected);
    btn.classList.toggle('is-complete',configured(sec,btn.dataset.attackTab));
    btn.setAttribute('aria-selected',selected?'true':'false');
    btn.tabIndex=selected?0:-1;
  });
  list.forEach(({card,key:itemKey})=>{
    card.dataset.coachAttackFinalKey=itemKey;
    card.dataset.coachAttackFinalActive=itemKey===active?'1':'0';
  });
}
function reset(sec,list){
  sec?.classList.remove('coach-attack-final-mobile');
  sec?.querySelectorAll('.coach-attack-tabs-final').forEach(el=>el.remove());
  list.forEach(({card})=>{
    card.removeAttribute('data-coach-attack-final-key');
    card.removeAttribute('data-coach-attack-final-active');
  });
}
function decorate(){
  const sec=section();
  if(!sec)return;
  const list=items(sec);
  if(list.length<2)return;
  if(!coachEditing()||!mobile()){
    reset(sec,list);
    return;
  }
  sec.classList.add('coach-attack-final-mobile');
  const tabs=ensureTabs(sec,list);
  const saved=activeByMatch.get(matchKey());
  applyActive(sec,list,saved||list[0].key);
  tabs.addEventListener('click',event=>{
    const btn=event.target.closest('[data-attack-tab]');
    if(!btn)return;
    applyActive(sec,list,btn.dataset.attackTab);
  });
}
function schedule(){
  requestAnimationFrame(()=>requestAnimationFrame(decorate));
  setTimeout(decorate,80);
}
function wrapRender(){
  const base=window.renderTactics;
  if(typeof base!=='function')return false;
  if(base.__coachAttackTabsFinal20260816)return true;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    schedule();
    return out;
  };
  wrapped.__coachAttackTabsFinal20260816=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-coach-attack-tabs-final-20260816-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-coach-attack-tabs-final-20260816-css';
  style.textContent=`
.coach-attack-tabs-final{display:none}
@media(max-width:720px){
  #view-tactics .coach-attack-final-mobile .coach-attack-tabs{display:none!important}
  #view-tactics .coach-attack-final-mobile .coach-attack-tabs-final{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:.3rem;width:100%;margin:-.1rem 0 .65rem;padding:.28rem;border:1px solid #dbe2ea;border-radius:13px;background:#eef2f6;box-sizing:border-box}
  #view-tactics .coach-attack-tabs-final button{position:relative;display:flex;align-items:center;justify-content:center;gap:.2rem;min-width:0;min-height:40px;padding:.42rem .18rem;border:1px solid transparent;border-radius:9px;background:transparent;color:#64748b;font-size:.72rem;font-weight:900;letter-spacing:.025em;box-shadow:none}
  #view-tactics .coach-attack-tabs-final button b{display:none;width:14px;height:14px;place-items:center;border-radius:999px;background:#dcfce7;color:#15803d;font-size:.58rem;line-height:1}
  #view-tactics .coach-attack-tabs-final button.is-complete b{display:grid}
  #view-tactics .coach-attack-tabs-final button.is-active{border-color:#cbd5e1;background:#fff;color:#0f172a;box-shadow:0 2px 7px rgba(15,23,42,.08)}
  #view-tactics .coach-attack-tabs-final button.is-active::after{content:'';position:absolute;left:26%;right:26%;bottom:3px;height:2px;border-radius:99px;background:#d97706}
  #view-tactics .coach-attack-final-mobile .attack-cards-grid{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow:visible!important;padding:0!important;margin:0!important;scroll-snap-type:none!important}
  #view-tactics .coach-attack-final-mobile .attack-scout-card[data-coach-attack-final-active="0"]{display:none!important}
  #view-tactics .coach-attack-final-mobile .attack-scout-card[data-coach-attack-final-active="1"]{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;flex:0 0 100%!important;margin:0!important}
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
    }else if(tries>120)clearInterval(timer);
  },100);
  window.matchMedia('(max-width:720px)').addEventListener?.('change',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-attack-tab]'))setTimeout(decorate,0);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
