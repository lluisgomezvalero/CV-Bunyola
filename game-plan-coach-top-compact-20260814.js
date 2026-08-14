(function(){
'use strict';

const FLAG='__gamePlanCoachTopCompact20260814';
if(window[FLAG])return;
window[FLAG]=true;

function isCoachEditing(){
  try{return typeof isCoachUser==='function'&&isCoachUser()&&!(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode);}
  catch(_){return false;}
}

function compactHint(view){
  const hint=view.querySelector('.game-plan-workflow-hint');
  if(!hint)return;
  hint.classList.add('game-plan-workflow-hint-compact');
  hint.innerHTML='<i data-lucide="info"></i><span><strong>Borrador</strong>: solo staff <b>·</b> <strong>Publicar</strong>: visible para jugadoras</span>';
}

function ensureCompactSave(actions){
  let btn=actions.querySelector('.coach-compact-save');
  if(btn)return btn;
  btn=document.createElement('button');
  btn.type='button';
  btn.className='btn btn-outline coach-compact-save';
  btn.innerHTML='<i data-lucide="save"></i><span>Guardar</span>';
  btn.addEventListener('click',()=>{
    const original=document.getElementById('save-scouting-plan');
    if(original&&original!==btn){ original.click(); return; }
    try{ if(typeof saveScoutingData==='function') saveScoutingData(); }catch(error){ console.error(error); }
  });
  actions.appendChild(btn);
  return btn;
}

function compactPublishBar(root){
  const bar=root.querySelector('.scouting-publish-bar');
  if(!bar)return;
  bar.classList.add('coach-compact-publish-bar');

  const status=bar.querySelector('.scouting-status');
  const small=status?.querySelector('small');
  if(small)small.textContent='Estado';

  const actions=bar.querySelector('.scouting-publish-actions');
  if(!actions)return;
  actions.classList.add('coach-compact-actions');

  const buttons=[...actions.querySelectorAll('button')];
  const preview=buttons.find(btn=>/vista previa/i.test(btn.textContent||''));
  const publish=buttons.find(btn=>/publicar|actualizar publicación/i.test(btn.textContent||''));
  const archive=buttons.find(btn=>/archivar/i.test(btn.textContent||''));
  if(preview)preview.classList.add('coach-compact-preview');
  if(publish)publish.classList.add('coach-compact-publish');
  if(archive)archive.classList.add('coach-compact-archive');
  ensureCompactSave(actions);
}

function compactReadTracker(root){
  const tracker=root.querySelector('.plan-read-tracker');
  if(tracker)tracker.classList.add('coach-compact-read-tracker');
}

function decorate(){
  const view=document.getElementById('view-tactics');
  const root=document.getElementById('scouting-interactive-root');
  if(!view||!root)return;
  const enabled=isCoachEditing();
  view.classList.toggle('coach-top-compact',enabled);
  root.classList.toggle('coach-top-compact-root',enabled);
  if(!enabled)return;

  compactHint(view);
  compactPublishBar(root);
  compactReadTracker(root);
  try{window.lucide?.createIcons?.();}catch(_){}
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__coachTopCompact20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(decorate);
    return out;
  };
  wrapped.__coachTopCompact20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-coach-top-compact-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-coach-top-compact-20260814-css';
  style.textContent=`
#view-tactics.coach-top-compact .game-plan-workflow-hint-compact{
  align-items:center;
  margin:.55rem 0 .65rem!important;
  padding:.48rem .65rem!important;
  border-radius:11px!important;
  font-size:.69rem!important;
  line-height:1.25!important;
}
#view-tactics.coach-top-compact .game-plan-workflow-hint-compact svg{width:15px!important;height:15px!important;margin:0!important}
#view-tactics.coach-top-compact .game-plan-workflow-hint-compact span{min-width:0}
#view-tactics.coach-top-compact .game-plan-workflow-hint-compact b{font-weight:700;opacity:.55;margin:0 .12rem}

#view-tactics.coach-top-compact #scouting-interactive-root.coach-top-compact-root{
  width:100%!important;
  max-width:none!important;
  box-sizing:border-box!important;
  gap:.7rem!important;
}
#view-tactics.coach-top-compact #scouting-interactive-root.coach-top-compact-root>*{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  box-sizing:border-box!important;
  margin-left:0!important;
  margin-right:0!important;
}
#view-tactics.coach-top-compact .coach-board-banner{margin:0!important}

#view-tactics.coach-top-compact .coach-compact-publish-bar{
  width:100%!important;
  max-width:none!important;
  box-sizing:border-box!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(0,2.2fr)!important;
  align-items:center!important;
  gap:.65rem!important;
  padding:.65rem .72rem!important;
  margin:0!important;
}
#view-tactics.coach-top-compact .coach-compact-publish-bar .scouting-status{
  min-width:0!important;
  padding:.05rem 0!important;
}
#view-tactics.coach-top-compact .coach-compact-publish-bar .scouting-status small{
  font-size:.62rem!important;
  letter-spacing:.06em!important;
}
#view-tactics.coach-top-compact .coach-compact-publish-bar .scouting-status strong{
  font-size:.92rem!important;
  line-height:1.05!important;
}
#view-tactics.coach-top-compact .coach-compact-actions{
  width:100%!important;
  min-width:0!important;
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  gap:.4rem!important;
}
#view-tactics.coach-top-compact .coach-compact-actions>button{
  width:100%!important;
  min-width:0!important;
  min-height:40px!important;
  margin:0!important;
  padding:.42rem .45rem!important;
  border-radius:10px!important;
  justify-content:center!important;
  gap:.3rem!important;
  font-size:.68rem!important;
  line-height:1.08!important;
  white-space:normal!important;
  text-align:center!important;
  box-shadow:none!important;
}
#view-tactics.coach-top-compact .coach-compact-actions>button svg{width:17px!important;height:17px!important;flex:0 0 auto}
#view-tactics.coach-top-compact .coach-compact-save{order:1}
#view-tactics.coach-top-compact .coach-compact-preview{order:2}
#view-tactics.coach-top-compact .coach-compact-publish{order:3}
#view-tactics.coach-top-compact .coach-compact-archive{order:4}

#view-tactics.coach-top-compact .scouting-save-row{display:none!important}
#view-tactics.coach-top-compact .coach-compact-read-tracker{
  padding:.72rem .78rem!important;
  margin:0!important;
  border-radius:14px!important;
}
#view-tactics.coach-top-compact .coach-compact-read-tracker .plan-read-tracker-head{margin-bottom:.4rem!important}
#view-tactics.coach-top-compact .coach-compact-read-tracker .plan-read-summary{margin-top:.5rem!important}

@media(max-width:720px){
  #view-tactics.coach-top-compact>.card,
  #view-tactics.coach-top-compact .tactics-card,
  #view-tactics.coach-top-compact .game-plan-card{padding-left:.72rem!important;padding-right:.72rem!important}
  #view-tactics.coach-top-compact .game-plan-workflow-hint-compact{margin:.45rem 0 .55rem!important;padding:.42rem .55rem!important}
  #view-tactics.coach-top-compact .game-plan-workflow-hint-compact span{white-space:normal}
  #view-tactics.coach-top-compact #scouting-interactive-root.coach-top-compact-root{
    padding:.5rem!important;
    gap:.55rem!important;
    border-radius:16px!important;
  }
  #view-tactics.coach-top-compact .coach-board-banner{display:none!important}
  #view-tactics.coach-top-compact .coach-compact-publish-bar{
    grid-template-columns:1fr!important;
    gap:.5rem!important;
    padding:.58rem!important;
    border-radius:14px!important;
  }
  #view-tactics.coach-top-compact .coach-compact-publish-bar .scouting-status{
    display:flex!important;
    align-items:center!important;
    min-height:34px!important;
  }
  #view-tactics.coach-top-compact .coach-compact-actions{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:.42rem!important;
  }
  #view-tactics.coach-top-compact .coach-compact-actions>button{
    min-height:44px!important;
    padding:.4rem .38rem!important;
    font-size:.69rem!important;
  }
  #view-tactics.coach-top-compact .coach-compact-publish{background:linear-gradient(135deg,#fbbf24,#ea8a00)!important;color:#111827!important;border-color:#f59e0b!important}
  #view-tactics.coach-top-compact .coach-compact-archive{background:#fffafa!important;color:#b91c1c!important;border-color:#fecaca!important;opacity:1!important}
  #view-tactics.coach-top-compact .coach-compact-read-tracker{padding:.62rem .66rem!important}
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
      setTimeout(decorate,0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
