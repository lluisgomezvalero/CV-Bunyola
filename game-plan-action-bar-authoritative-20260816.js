(function(){
'use strict';

const FLAG='__gamePlanActionBarAuthoritative20260816';
if(window[FLAG])return;
window[FLAG]=true;

let renderWrapped=false;
let observer=null;

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function preview(){try{return typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);}catch(_){return false;}}
function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function root(){return document.getElementById('scouting-interactive-root');}
function view(){return document.getElementById('view-tactics');}

function button(action,icon,label,cls=''){
  return `<button type="button" class="btn ${cls}" data-game-plan-stable-action="${action}"><i data-lucide="${icon}"></i><span>${label}</span></button>`;
}

function bind(actions){
  actions.querySelectorAll('[data-game-plan-stable-action]').forEach(btn=>{
    if(btn.dataset.bound==='1')return;
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      const action=btn.dataset.gamePlanStableAction;
      try{
        if(action==='save'&&typeof saveScoutingData==='function')saveScoutingData();
        else if(action==='preview'&&typeof toggleScoutingPreview==='function')toggleScoutingPreview(true);
        else if(action==='back'&&typeof toggleScoutingPreview==='function')toggleScoutingPreview(false);
        else if(action==='publish'&&typeof publishScoutingPlan==='function')publishScoutingPlan();
        else if(action==='archive'&&typeof archiveScoutingPlan==='function')archiveScoutingPlan();
      }catch(error){console.error('[GamePlanStableActions]',action,error);}
    });
  });
}

function ensure(){
  const v=view(),r=root();
  if(!v||!r||!coach())return;
  const bar=r.querySelector('.scouting-publish-bar');
  const actions=bar?.querySelector('.scouting-publish-actions');
  if(!bar||!actions)return;

  v.classList.add('game-plan-stable-actions-ready');
  bar.classList.add('game-plan-stable-publish-bar');
  actions.classList.add('game-plan-stable-actions');

  const rec=record();
  const isPreview=preview();
  const status=String(rec?.status||'draft');
  const signature=`${isPreview?'preview':'edit'}|${status}`;

  const statusSmall=bar.querySelector('.scouting-status small');
  const statusStrong=bar.querySelector('.scouting-status strong');
  if(statusSmall)statusSmall.textContent='Estado del plan';
  if(statusStrong)statusStrong.textContent=isPreview?'Vista previa de jugadoras':status==='published'?'Publicado':status==='archived'?'Archivado':'Borrador';

  if(actions.dataset.stableSignature!==signature || !actions.querySelector('[data-game-plan-stable-action]')){
    if(isPreview){
      actions.innerHTML=button('back','arrow-left','Volver a editar','btn-outline game-plan-stable-back');
      actions.classList.add('is-preview');
    }else{
      const publishLabel=status==='published'?'Actualizar publicación':'Publicar plan';
      actions.innerHTML=[
        button('save','save','Guardar','btn-outline game-plan-stable-save'),
        button('preview','eye','Vista previa','btn-outline game-plan-stable-preview'),
        button('publish','send',publishLabel,'btn-primary game-plan-stable-publish'),
        button('archive','archive','Archivar','btn-outline danger-soft game-plan-stable-archive')
      ].join('');
      actions.classList.remove('is-preview');
    }
    actions.dataset.stableSignature=signature;
  }

  bind(actions);
  try{window.lucide?.createIcons?.();}catch(_){}
}

function wrapRender(){
  if(renderWrapped)return true;
  const base=window.renderTactics;
  if(typeof base!=='function')return false;
  if(base.__gamePlanStableActions20260816){renderWrapped=true;return true;}
  const wrapped=function(){
    const out=base.apply(this,arguments);
    // Se ejecuta de forma síncrona, antes de que el navegador pinte el render base.
    // Así la barra antigua nunca llega a ser visible entre estados.
    ensure();
    return out;
  };
  wrapped.__gamePlanStableActions20260816=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  renderWrapped=true;
  return true;
}

function observe(){
  const r=root();
  if(!r||observer)return;
  observer=new MutationObserver(()=>ensure());
  observer.observe(r,{childList:true,subtree:true});
}

function injectStyles(){
  if(document.getElementById('game-plan-action-bar-authoritative-20260816-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-action-bar-authoritative-20260816-css';
  style.textContent=`
#view-tactics.game-plan-stable-actions-ready .scouting-save-row{display:none!important}
#view-tactics .game-plan-stable-publish-bar{width:100%!important;max-width:none!important;box-sizing:border-box!important}
#view-tactics .game-plan-stable-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:.42rem!important;width:100%!important;min-width:0!important}
#view-tactics .game-plan-stable-actions.is-preview{grid-template-columns:1fr!important}
#view-tactics .game-plan-stable-actions>button{width:100%!important;min-width:0!important;min-height:42px!important;margin:0!important;padding:.45rem .5rem!important;border-radius:10px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:.35rem!important;font-size:.69rem!important;line-height:1.08!important;text-align:center!important;white-space:normal!important;box-shadow:none!important}
#view-tactics .game-plan-stable-actions>button svg{width:17px!important;height:17px!important;flex:0 0 auto!important}
#view-tactics .game-plan-stable-publish{background:linear-gradient(135deg,#fbbf24,#ea8a00)!important;color:#111827!important;border-color:#f59e0b!important}
#view-tactics .game-plan-stable-archive{background:#fffafa!important;color:#b91c1c!important;border-color:#fecaca!important;opacity:1!important}
@media(max-width:720px){
  #view-tactics .game-plan-stable-publish-bar{display:grid!important;grid-template-columns:1fr!important;gap:.5rem!important;padding:.58rem!important;border-radius:14px!important}
  #view-tactics .game-plan-stable-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.42rem!important}
  #view-tactics .game-plan-stable-actions.is-preview{grid-template-columns:1fr!important}
  #view-tactics .game-plan-stable-actions>button{min-height:46px!important;padding:.42rem .35rem!important;font-size:.68rem!important}
  #view-tactics .game-plan-stable-actions .game-plan-stable-publish span{max-width:92px}
}
`;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ok=wrapRender();
    ensure();
    observe();
    if(ok&&root())clearInterval(timer);
    else if(tries>180)clearInterval(timer);
  },80);
  // Algunas capas antiguas terminan de instalarse con timeout. Reafirmamos esta
  // capa como envoltorio exterior una vez pasado ese arranque tardío.
  setTimeout(()=>{
    renderWrapped=false;
    wrapRender();
    ensure();
    observe();
  },2800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
