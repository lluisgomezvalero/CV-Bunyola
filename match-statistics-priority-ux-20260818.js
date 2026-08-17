(function(){
'use strict';

const FLAG='__matchStatisticsPriorityUx20260818';
if(window[FLAG])return;
window[FLAG]=true;

function isCoach(){
  try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}
}

function ensureStyles(){
  if(document.getElementById('stats-priority-ux-style'))return;
  const style=document.createElement('style');
  style.id='stats-priority-ux-style';
  style.textContent=`
    #stats-priority-block{margin:0 0 1.15rem;padding:1rem 1rem .9rem;border:1px solid #e2e8f0;border-radius:18px;background:rgba(255,255,255,.94);box-shadow:0 8px 24px rgba(15,23,42,.05)}
    #stats-priority-block .stats-priority-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem;margin-bottom:.8rem}
    #stats-priority-block .stats-priority-heading strong{font-family:var(--font-heading);font-size:1.05rem;color:#0f172a}
    #stats-priority-block .stats-priority-heading span{font-size:.74rem;color:#64748b}
    #stats-priority-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem}
    #stats-priority-grid .stats-summary-item{margin:0!important;min-width:0;padding:.85rem .75rem!important;border:1px solid #e2e8f0!important;border-radius:14px!important;background:#f8fafc!important;box-shadow:none!important;display:flex!important;align-items:center!important;gap:.65rem!important}
    #stats-priority-grid .stats-summary-icon{flex:0 0 auto}
    #stats-priority-grid strong{font-size:1.15rem!important;line-height:1.1}
    #stats-priority-grid span:not(.stats-summary-icon){font-size:.72rem!important;line-height:1.2}
    #coach-stats-summary{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(125px,1fr))!important;gap:.7rem!important;margin-bottom:1.35rem!important}
    #coach-stats-summary .stats-summary-item{min-width:0!important}
    @media(max-width:560px){
      #stats-priority-block{padding:.85rem .75rem}
      #stats-priority-block .stats-priority-heading{align-items:flex-start;flex-direction:column;gap:.1rem}
      #stats-priority-grid{gap:.45rem}
      #stats-priority-grid .stats-summary-item{padding:.7rem .5rem!important;gap:.4rem!important;flex-direction:column!important;align-items:flex-start!important}
      #stats-priority-grid .stats-summary-icon{font-size:1rem}
      #stats-priority-grid strong{font-size:1.02rem!important}
      #stats-priority-grid span:not(.stats-summary-icon){font-size:.66rem!important}
      #coach-stats-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.55rem!important}
    }
  `;
  document.head.appendChild(style);
}

function applyUx(){
  if(!isCoach())return;
  ensureStyles();
  const summary=document.getElementById('coach-stats-summary');
  if(!summary)return;

  let block=document.getElementById('stats-priority-block');
  if(!block){
    block=document.createElement('section');
    block.id='stats-priority-block';
    block.className='coach-only-view';
    block.innerHTML='<div class="stats-priority-heading"><strong>Claves de rendimiento</strong><span>Los 3 indicadores principales del equipo</span></div><div id="stats-priority-grid"></div>';
    summary.parentNode?.insertBefore(block,summary);
  }

  const grid=document.getElementById('stats-priority-grid');
  if(!grid)return;
  ['stats-avg-rec-perfect','stats-avg-rec-error','stats-avg-attack-efficiency'].forEach(id=>{
    const item=document.getElementById(id)?.closest('.stats-summary-item');
    if(item&&item.parentNode!==grid)grid.appendChild(item);
  });
}

function install(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=document.documentElement.dataset.matchStatsAuthoritativeBound==='1';
    const current=window.renderStats;
    if(ready&&typeof current==='function'&&!current.__statsPriorityWrapped){
      clearInterval(timer);
      const wrapped=function(...args){
        const result=current.apply(this,args);
        Promise.resolve(result).finally(()=>setTimeout(applyUx,0));
        return result;
      };
      wrapped.__statsPriorityWrapped=true;
      window.renderStats=wrapped;
      try{renderStats=wrapped;}catch(_){}
      setTimeout(applyUx,0);
    }else if(tries>=100){
      clearInterval(timer);
    }
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
