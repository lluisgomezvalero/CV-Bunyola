(function(){
'use strict';

const FLAG='__gamePlanCoachBoard20260814';
if(window[FLAG])return;
window[FLAG]=true;

function isCoachEditing(){
  try{return typeof isCoachUser==='function'&&isCoachUser()&&!(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode);}
  catch(_){return false;}
}

function ensureBanner(root){
  let banner=root.querySelector('.coach-board-banner');
  if(!isCoachEditing()){
    banner?.remove();
    return;
  }
  if(!banner){
    banner=document.createElement('div');
    banner.className='coach-board-banner';
    banner.innerHTML='<div class="coach-board-banner-icon"><i data-lucide="clipboard-pen-line"></i></div><div><strong>Pizarra táctica</strong><span>Edita el scouting y publica cuando esté listo.</span></div>';
    const first=root.firstElementChild;
    if(first)root.insertBefore(banner,first);
    else root.appendChild(banner);
  }
}

function markCoachMode(){
  const view=document.getElementById('view-tactics');
  const root=document.getElementById('scouting-interactive-root');
  if(!view||!root)return;
  const enabled=isCoachEditing();
  view.classList.toggle('coach-board-mode',enabled);
  root.classList.toggle('coach-board-root',enabled);
  ensureBanner(root);
  if(enabled){
    root.querySelectorAll('.attack-scout-card').forEach((card,index)=>{
      card.dataset.boardCard=String(index+1);
    });
  }
  try{window.lucide?.createIcons?.();}catch(_){}
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__coachBoard20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(markCoachMode);
    return out;
  };
  wrapped.__coachBoard20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-coach-board-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-coach-board-20260814-css';
  style.textContent=`
#view-tactics.coach-board-mode #scouting-interactive-root.coach-board-root{
  --board-ink:#0f172a;
  --board-muted:#64748b;
  --board-line:#d8dee8;
  --board-paper:#f7f8fa;
  --board-accent:#d97706;
  position:relative;
  gap:1rem;
  padding:1rem;
  border:1px solid #dbe2ea;
  border-radius:24px;
  background-color:var(--board-paper);
  background-image:linear-gradient(rgba(148,163,184,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.075) 1px,transparent 1px);
  background-size:24px 24px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 14px 30px rgba(15,23,42,.06);
}
#view-tactics.coach-board-mode .coach-board-banner{
  display:flex;align-items:center;gap:.7rem;
  padding:.72rem .82rem;
  border:1px solid #cbd5e1;border-radius:15px;
  background:rgba(255,255,255,.94);
  box-shadow:0 4px 12px rgba(15,23,42,.05);
}
#view-tactics.coach-board-mode .coach-board-banner-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#0f172a;color:#fbbf24;flex:0 0 auto}
#view-tactics.coach-board-mode .coach-board-banner-icon svg{width:18px;height:18px}
#view-tactics.coach-board-mode .coach-board-banner>div:last-child{display:grid;gap:.08rem;min-width:0}
#view-tactics.coach-board-mode .coach-board-banner strong{font-family:var(--font-heading);font-size:.84rem;color:#0f172a;letter-spacing:.01em}
#view-tactics.coach-board-mode .coach-board-banner span{font-size:.68rem;color:#64748b;font-weight:650}

#view-tactics.coach-board-mode .scouting-publish-bar{
  border:1px solid #cbd5e1!important;
  border-radius:16px!important;
  background:rgba(255,255,255,.97)!important;
  box-shadow:0 6px 18px rgba(15,23,42,.06)!important;
}
#view-tactics.coach-board-mode .scout-section{
  border:1px solid #d6dde7!important;
  border-radius:18px!important;
  background:rgba(255,255,255,.96)!important;
  box-shadow:0 7px 18px rgba(15,23,42,.055)!important;
}
#view-tactics.coach-board-mode .scout-section-head{padding-bottom:.72rem;border-bottom:1px dashed #d7dee8;margin-bottom:.9rem!important}
#view-tactics.coach-board-mode .scout-section-head>span{background:#0f172a!important;color:#fbbf24!important;border-radius:10px!important;font-family:var(--font-heading)}
#view-tactics.coach-board-mode .scout-section-head h3{font-size:1rem;color:#0f172a}
#view-tactics.coach-board-mode .scout-section-head p{font-size:.73rem;line-height:1.35}

#view-tactics.coach-board-mode .attack-cards-grid{gap:.85rem!important}
#view-tactics.coach-board-mode .attack-scout-card{
  position:relative;
  padding:.82rem!important;
  border:1px solid #cbd5e1!important;
  border-radius:16px!important;
  background:#fff!important;
  box-shadow:0 7px 18px rgba(15,23,42,.07)!important;
  overflow:hidden;
}
#view-tactics.coach-board-mode .attack-scout-card.is-hidden{opacity:.72;filter:saturate(.75)}
#view-tactics.coach-board-mode .attack-scout-card-head{
  margin:-.82rem -.82rem .72rem!important;
  padding:.72rem .75rem;
  min-height:64px;
  align-items:center!important;
  background:linear-gradient(135deg,#111827,#1e293b);
  border-bottom:2px solid #d97706;
}
#view-tactics.coach-board-mode .attack-scout-card-head>div{display:grid;gap:.22rem}
#view-tactics.coach-board-mode .attack-role{margin:0!important;color:#fbbf24!important;font-size:.65rem!important;letter-spacing:.075em!important}
#view-tactics.coach-board-mode .attack-name-input{
  min-height:34px!important;
  padding:.34rem .48rem!important;
  border:1px solid rgba(255,255,255,.20)!important;
  border-radius:8px!important;
  background:rgba(255,255,255,.09)!important;
  color:#fff!important;
  font-size:.82rem!important;
  box-shadow:none!important;
}
#view-tactics.coach-board-mode .attack-name-input::placeholder{color:#cbd5e1!important}
#view-tactics.coach-board-mode .attack-name-input:focus{border-color:#fbbf24!important;background:rgba(255,255,255,.13)!important;outline:none!important}
#view-tactics.coach-board-mode .attack-visibility-toggle span{border-color:rgba(255,255,255,.22)!important;background:rgba(255,255,255,.08)!important;color:#e2e8f0!important}
#view-tactics.coach-board-mode .attack-visibility-toggle input:checked+span{background:#ecfdf5!important;color:#047857!important;border-color:#86efac!important}

#view-tactics.coach-board-mode .attack-direction-options{
  margin:.05rem 0 .62rem!important;
  padding:.55rem;
  gap:.32rem!important;
  border:1px solid #e2e8f0;
  border-radius:12px;
  background:#f8fafc;
}
#view-tactics.coach-board-mode .attack-direction-option span{
  padding:.34rem .48rem!important;
  border-radius:8px!important;
  background:#fff!important;
  border-color:#cbd5e1!important;
  color:#334155;
  font-size:.68rem!important;
}
#view-tactics.coach-board-mode .attack-direction-option input:checked+span{
  background:#eaf2ff!important;
  border-color:#2563eb!important;
  color:#1d4ed8!important;
  box-shadow:inset 0 0 0 1px #2563eb;
}
#view-tactics.coach-board-mode .attack-tendency-summary{
  margin:.55rem 0 .62rem!important;
  border-left:3px solid #2563eb!important;
  border-radius:10px!important;
  background:#f8fbff!important;
}
#view-tactics.coach-board-mode .attack-card-court{border-radius:10px!important;border-width:2px!important;box-shadow:0 4px 12px rgba(15,23,42,.12),inset 0 0 0 1px rgba(95,56,20,.18)!important}

#view-tactics.coach-board-mode .serve-zone-priority-summary{border-radius:12px!important;box-shadow:none!important}
#view-tactics.coach-board-mode .serve-heat-volleyball-wrap{padding:.2rem 0}
#view-tactics.coach-board-mode .serve-player-target{padding:.72rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}

@media(max-width:720px){
  #view-tactics.coach-board-mode #scouting-interactive-root.coach-board-root{padding:.62rem;border-radius:18px;background-size:20px 20px}
  #view-tactics.coach-board-mode .coach-board-banner{padding:.62rem .68rem}
  #view-tactics.coach-board-mode .coach-board-banner span{display:none}
  #view-tactics.coach-board-mode .scout-section{padding:.78rem!important;border-radius:15px!important}
  #view-tactics.coach-board-mode .attack-scout-card{padding:.7rem!important}
  #view-tactics.coach-board-mode .attack-scout-card-head{margin:-.7rem -.7rem .65rem!important;padding:.65rem .66rem}
  #view-tactics.coach-board-mode .attack-name-input{font-size:.78rem!important}
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
    if(ready){
      clearInterval(timer);
      setTimeout(markCoachMode,0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();