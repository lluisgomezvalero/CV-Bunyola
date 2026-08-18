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
    #stats-priority-grid .stats-summary-item{margin:0!important;min-width:0!important;min-height:112px;padding:.8rem .7rem!important;border:1px solid #e2e8f0!important;border-radius:14px!important;background:#f8fafc!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:.22rem!important;overflow:hidden!important}
    #stats-priority-grid .stats-summary-icon{display:block!important;flex:0 0 auto!important;font-size:1rem!important;line-height:1!important;margin:0 0 .12rem!important}
    #stats-priority-grid strong{display:block!important;width:100%!important;font-size:1.15rem!important;line-height:1.05!important;color:#0f172a!important}
    #stats-priority-grid span:not(.stats-summary-icon){display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;font-size:.72rem!important;line-height:1.18!important;white-space:normal!important;overflow:visible!important;overflow-wrap:normal!important;word-break:normal!important;text-overflow:clip!important}
    #coach-stats-summary{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(125px,1fr))!important;gap:.7rem!important;margin-bottom:1.35rem!important}
    #coach-stats-summary .stats-summary-item{min-width:0!important}
    #coach-stats-summary .stats-summary-icon{flex:0 0 1.35rem!important;width:1.35rem!important;text-align:center!important;font-size:1rem!important;line-height:1!important}
    #coach-stats-summary .stats-summary-item>div{min-width:0!important}
    #coach-stats-summary .stats-summary-item>div>span{line-height:1.15!important}
    @media(max-width:560px){
      #stats-priority-block{padding:.85rem .72rem}
      #stats-priority-block .stats-priority-heading{align-items:flex-start;flex-direction:column;gap:.1rem}
      #stats-priority-grid{gap:.38rem}
      #stats-priority-grid .stats-summary-item{min-height:104px;padding:.62rem .48rem!important;gap:.18rem!important}
      #stats-priority-grid .stats-summary-icon{font-size:.95rem!important;margin-bottom:.08rem!important}
      #stats-priority-grid strong{font-size:1.01rem!important}
      #stats-priority-grid span:not(.stats-summary-icon){font-size:.625rem!important;line-height:1.16!important;white-space:normal!important;overflow:visible!important;overflow-wrap:normal!important;word-break:normal!important}
      #coach-stats-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.55rem!important}
      #coach-stats-summary .stats-summary-icon{flex-basis:1.25rem!important;width:1.25rem!important;font-size:.95rem!important}
    }
    @media(max-width:390px){
      #stats-priority-grid{gap:.3rem}
      #stats-priority-grid .stats-summary-item{padding:.58rem .4rem!important}
      #stats-priority-grid span:not(.stats-summary-icon){font-size:.59rem!important}
    }
  `;
  document.head.appendChild(style);
}

function setCardIcon(valueId,iconText){
  const item=document.getElementById(valueId)?.closest('.stats-summary-item');
  const icon=item?.querySelector('.stats-summary-icon');
  if(icon)icon.textContent=iconText;
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

  const summaryIcons={
    'stats-record':'⚖️',
    'stats-total-aces':'⚡',
    'stats-total-attack-errors':'❌',
    'stats-total-serve-errors':'❌',
    'stats-total-blocks':'🧱',
    'stats-total-own-errors':'🔴',
    'stats-total-opponent-errors':'🟢'
  };
  Object.entries(summaryIcons).forEach(([id,iconText])=>setCardIcon(id,iconText));

  const priorityIcons={
    'stats-avg-rec-perfect':'✅',
    'stats-avg-rec-error':'❌',
    'stats-avg-attack-efficiency':'📈'
  };

  Object.entries(priorityIcons).forEach(([id,iconText])=>{
    const item=document.getElementById(id)?.closest('.stats-summary-item');
    if(!item)return;
    const icon=item.querySelector('.stats-summary-icon');
    if(icon)icon.textContent=iconText;
    if(item.parentNode!==grid)grid.appendChild(item);
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
