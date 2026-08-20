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
    #coach-stats-charts{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:1rem!important;margin-bottom:1.35rem!important}
    #coach-stats-charts .card{margin:0!important;min-width:0!important;border-radius:18px!important}
    #coach-stats-charts .card-header{margin-bottom:.65rem!important;align-items:flex-start!important}
    #coach-stats-charts .card-header h3{display:flex!important;align-items:flex-start!important;gap:.45rem!important;margin:0!important;font-size:1rem!important;line-height:1.22!important;color:#0f172a!important}
    #coach-stats-charts .card-header h3 i{flex:0 0 auto!important;width:18px!important;height:18px!important;margin-top:.05rem!important}
    #coach-stats-charts .card-header h3 span{min-width:0!important}

    .stats-season-card{border-radius:18px!important;overflow:hidden!important}
    .stats-season-card>.card-header{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:1rem!important;margin-bottom:1rem!important}
    .stats-season-card #stats-list-title{font-family:var(--font-heading)!important;font-size:1.15rem!important;line-height:1.15!important;margin:0!important;color:#0f172a!important}
    .stats-season-card #stats-list-help{margin:.28rem 0 0!important;font-size:.76rem!important;line-height:1.3!important;color:#64748b!important}
    .stats-season-card .stats-publication-filter{flex:0 0 auto!important;min-height:38px!important;font-size:.78rem!important;border-radius:10px!important}
    #stats-matches-list{gap:.75rem!important}
    #stats-matches-list .match-stat-card{min-width:0!important;border:1px solid #e2e8f0!important;border-radius:15px!important;background:#fff!important;box-shadow:0 4px 14px rgba(15,23,42,.035)!important;padding:.9rem!important}
    #stats-matches-list .match-stat-header{display:flex!important;align-items:flex-start!important;gap:.55rem!important;flex-wrap:wrap!important;margin-bottom:.7rem!important}
    #stats-matches-list .match-stat-header>div:first-child{flex:1 1 190px!important;min-width:0!important}
    #stats-matches-list .match-round-badge{display:inline-flex!important;align-items:center!important;font-size:.66rem!important;line-height:1!important;padding:.27rem .5rem!important;border-radius:999px!important}
    #stats-matches-list .match-stat-title{font-family:var(--font-heading)!important;font-size:.98rem!important;line-height:1.18!important;margin:.38rem 0 .18rem!important;color:#0f172a!important;overflow-wrap:anywhere!important}
    #stats-matches-list .match-stat-header p{font-size:.73rem!important;line-height:1.25!important}
    #stats-matches-list .publication-badge,#stats-matches-list .badge{flex:0 0 auto!important;margin:0!important;white-space:nowrap!important}
    #stats-matches-list .match-stat-body{min-width:0!important}
    #stats-matches-list .stats-card-actions{margin-top:.75rem!important;padding-top:.75rem!important;border-top:1px solid #f1f5f9!important}
    #stats-filter-empty{padding:1rem;border:1px dashed #cbd5e1;border-radius:13px;background:#f8fafc;color:#64748b;text-align:center;font-size:.8rem;line-height:1.35}

    @media(max-width:760px), (max-width:1366px) and (any-pointer:coarse){
      #coach-stats-charts{grid-template-columns:1fr!important;gap:.85rem!important}
      #coach-stats-charts .card{padding:1rem!important}
      #coach-stats-charts .card-header h3{font-size:.96rem!important;line-height:1.2!important}
      #coach-stats-charts .card>div[style*="height"]{height:220px!important}
    }
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
      .stats-season-card{padding:1rem!important}
      .stats-season-card>.card-header{flex-direction:column!important;gap:.65rem!important;margin-bottom:.8rem!important}
      .stats-season-card #stats-list-title{font-size:1.06rem!important}
      .stats-season-card .stats-publication-filter{width:100%!important;max-width:none!important}
      #stats-matches-list{display:grid!important;grid-template-columns:1fr!important;gap:.6rem!important}
      #stats-matches-list .match-stat-card{padding:.78rem!important;border-radius:13px!important}
      #stats-matches-list .match-stat-header{gap:.4rem!important;margin-bottom:.55rem!important}
      #stats-matches-list .match-stat-header>div:first-child{flex:1 1 100%!important;width:100%!important}
      #stats-matches-list .match-stat-title{font-size:.94rem!important}
      #stats-matches-list .stats-card-actions{width:100%!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.45rem!important}
      #stats-matches-list .stats-card-actions .btn{width:100%!important;min-width:0!important;justify-content:center!important;font-size:.72rem!important;padding:.55rem .45rem!important}
      #stats-matches-list .stats-card-actions .btn:last-child:nth-child(3){grid-column:1/-1!important}
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

function polishChartHeader(canvasId,label){
  const canvas=document.getElementById(canvasId);
  const heading=canvas?.closest('.card')?.querySelector('.card-header h3');
  if(!heading)return;
  const icon=heading.querySelector('i');
  Array.from(heading.childNodes).forEach(node=>{if(node!==icon)node.remove();});
  const text=document.createElement('span');
  text.textContent=label;
  heading.appendChild(text);
}

function publicationStatusFromCard(card){
  const badge=card?.querySelector('.publication-badge');
  if(badge?.classList.contains('is-draft'))return 'draft';
  if(badge?.classList.contains('is-published'))return 'published';
  if(badge?.classList.contains('is-archived'))return 'archived';
  return 'empty';
}

function polishSeasonList(){
  const list=document.getElementById('stats-matches-list');
  const card=list?.closest('.card');
  if(!list||!card)return;
  card.classList.add('stats-season-card');
  const title=document.getElementById('stats-list-title');
  const help=document.getElementById('stats-list-help');
  if(title)title.textContent='🏐 Jornadas y estadísticas';
  if(help)help.textContent='Consulta, edita y publica los datos de cada partido de liga.';

  list.querySelector('#stats-filter-empty')?.remove();
  const filter=window.__statsPublicationFilter||'all';
  let visibleCount=0;
  list.querySelectorAll('.match-stat-card').forEach(matchCard=>{
    const round=matchCard.querySelector('.match-round-badge');
    if(round&&round.textContent.trim()==='Jornada ?')round.textContent='Partido';
    const visible=filter==='all'||publicationStatusFromCard(matchCard)===filter;
    matchCard.hidden=!visible;
    if(visible)visibleCount++;
  });
  if(filter!=='all'&&visibleCount===0){
    const empty=document.createElement('div');
    empty.id='stats-filter-empty';
    const labels={draft:'borrador',published:'publicada',archived:'archivada'};
    empty.textContent=`No hay estadísticas ${labels[filter]||''}s en este momento.`;
    list.appendChild(empty);
  }
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

  polishChartHeader('chart-global-reception-error','Error en recepción (=)');
  polishChartHeader('chart-global-reception-perfect','Recepción perfecta (# +)');
  polishSeasonList();
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
