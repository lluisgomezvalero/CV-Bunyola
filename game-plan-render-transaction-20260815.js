(function(){
'use strict';

const FLAG='__gamePlanRenderTransaction20260815';
if(window[FLAG])return;
window[FLAG]=true;

let previewInstalled=false;
let publishInstalled=false;
let busy=false;

function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function root(){return document.getElementById('scouting-interactive-root');}
function view(){return document.getElementById('view-tactics');}

function setBusy(on,label){
  const v=view();
  if(!v)return;
  v.classList.toggle('game-plan-render-transaction',Boolean(on));
  const r=root();
  if(r)r.setAttribute('aria-busy',on?'true':'false');
  const bar=r?.querySelector('.scouting-publish-bar');
  if(bar){
    bar.querySelectorAll('button').forEach(btn=>{btn.disabled=Boolean(on);});
    if(on&&label){
      const publish=[...bar.querySelectorAll('button')].find(btn=>/publicar|actualizar publicación/i.test(btn.textContent||''));
      if(publish&&!publish.dataset.transactionLabel){
        publish.dataset.transactionLabel=publish.innerHTML;
        publish.innerHTML=`<span class="game-plan-transaction-spinner" aria-hidden="true"></span><span>${label}</span>`;
      }
    }
  }
}

function restoreButtonLabels(){
  const r=root();
  r?.querySelectorAll('button[data-transaction-label]').forEach(btn=>{
    btn.innerHTML=btn.dataset.transactionLabel||btn.innerHTML;
    delete btn.dataset.transactionLabel;
  });
}

function runTransaction(base,ctx,args,options={}){
  if(busy)return base.apply(ctx,args);
  const live=window.renderTactics;
  if(typeof live!=='function')return base.apply(ctx,args);

  busy=true;
  setBusy(true,options.label||'');
  const noop=function(){};
  let out;
  try{
    // saveScoutingData(), toggleScoutingPreview() y publishScoutingPlan()
    // llaman a renderTactics internamente. Durante la transacción se silencian
    // esos renders intermedios para evitar volver fugazmente a la UI antigua.
    window.renderTactics=noop;
    try{renderTactics=noop;}catch(_){}
    out=base.apply(ctx,args);
  }finally{
    window.renderTactics=live;
    try{renderTactics=live;}catch(_){}
  }

  const finish=()=>{
    try{live();}catch(error){console.warn('[GamePlanRenderTransaction] final render',error);}
    requestAnimationFrame(()=>{
      restoreButtonLabels();
      setBusy(false,'');
      busy=false;
      try{window.lucide?.createIcons?.();}catch(_){}
    });
  };

  // Deja que los wrappers de sincronización actualicen primero el estado local.
  setTimeout(finish,options.delay||0);
  return out;
}

function installPreview(){
  if(previewInstalled)return true;
  const base=window.toggleScoutingPreview;
  if(typeof base!=='function')return false;
  if(base.__renderTransaction20260815){previewInstalled=true;return true;}
  const wrapped=function(enabled){
    if(!coach())return base.apply(this,arguments);
    return runTransaction(base,this,arguments,{delay:45});
  };
  wrapped.__renderTransaction20260815=true;
  window.toggleScoutingPreview=wrapped;
  try{toggleScoutingPreview=wrapped;}catch(_){}
  previewInstalled=true;
  return true;
}

function installPublish(){
  if(publishInstalled)return true;
  const base=window.publishScoutingPlan;
  if(typeof base!=='function')return false;
  if(base.__renderTransaction20260815){publishInstalled=true;return true;}
  const wrapped=function(){
    if(!coach())return base.apply(this,arguments);
    return runTransaction(base,this,arguments,{label:'Actualizando…',delay:25});
  };
  wrapped.__renderTransaction20260815=true;
  window.publishScoutingPlan=wrapped;
  try{publishScoutingPlan=wrapped;}catch(_){}
  publishInstalled=true;
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-render-transaction-20260815-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-render-transaction-20260815-css';
  style.textContent=`
#view-tactics.game-plan-render-transaction #scouting-interactive-root{pointer-events:none}
#view-tactics.game-plan-render-transaction .scouting-publish-bar{position:relative}
#view-tactics .game-plan-transaction-spinner{display:inline-block;width:15px;height:15px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:gamePlanTransactionSpin .65s linear infinite}
@keyframes gamePlanTransactionSpin{to{transform:rotate(360deg)}}
`;
  document.head.appendChild(style);
}

function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const a=installPreview();
    const b=installPublish();
    if(a&&b){clearInterval(timer);return;}
    if(tries>180)clearInterval(timer);
  },100);

  // La capa autoritativa puede envolver publishScoutingPlan un poco después del
  // arranque. Recomprueba y vuelve a colocar esta transacción como capa exterior.
  setTimeout(()=>{
    publishInstalled=false;
    installPublish();
  },2300);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
