(function(){
'use strict';
const FLAG='__wellnessCoachClarity20260820';
if(window[FLAG])return;
window[FLAG]=true;

function isCoach(){
  try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}catch(_){return false;}
}
function numText(value,suffix=''){
  const n=Number(String(value??'').replace(',','.'));
  if(!Number.isFinite(n))return '—';
  return `${Number.isInteger(n)?n:n.toFixed(1)}${suffix}`;
}

function ensureStyles(){
  if(document.getElementById('wellness-coach-clarity-20260820-style'))return;
  const style=document.createElement('style');
  style.id='wellness-coach-clarity-20260820-style';
  style.textContent=`
  @media(max-width:760px){
    #view-wellness #borg-legend-inline{display:none!important}
    #view-wellness>.wellness-main-card>.card-header{display:none!important}

    #view-wellness .wellness-team-snapshot{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:.5rem!important;
      margin:.3rem 0 .72rem!important;
    }
    #view-wellness .wellness-snapshot-card{
      min-width:0!important;
      min-height:78px!important;
      padding:.68rem .7rem!important;
      display:grid!important;
      grid-template-columns:30px minmax(0,1fr)!important;
      align-items:center!important;
      gap:.5rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:15px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 4px 13px rgba(15,23,42,.025)!important;
    }
    #view-wellness .wellness-snapshot-icon{
      width:30px!important;height:30px!important;border-radius:10px!important;
      display:grid!important;place-items:center!important;background:#f4f7f9!important;color:#607086!important;
    }
    #view-wellness .wellness-snapshot-icon svg{width:16px!important;height:16px!important}
    #view-wellness .wellness-snapshot-card small{
      display:block!important;margin:0 0 .12rem!important;color:#8a96a5!important;font-size:.55rem!important;font-weight:850!important;text-transform:uppercase!important;letter-spacing:.045em!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
    }
    #view-wellness .wellness-snapshot-card strong{
      display:block!important;color:#253044!important;font-size:1rem!important;line-height:1.05!important;font-weight:900!important;
    }
    #view-wellness .wellness-snapshot-card.is-good .wellness-snapshot-icon{background:#ecfdf5!important;color:#159269!important}
    #view-wellness .wellness-snapshot-card.is-warn .wellness-snapshot-icon{background:#fff7ed!important;color:#c46a19!important}
    #view-wellness .wellness-snapshot-card.is-alert .wellness-snapshot-icon{background:#fff1f2!important;color:#c53d49!important}

    #view-wellness>.wellness-main-card{
      margin:0 0 .78rem!important;
      padding:.85rem!important;
    }
    #view-wellness .wellness-chart-section{
      order:1!important;
      margin:0!important;
      padding:0!important;
      border-top:0!important;
    }
    #view-wellness #wellness-chart-title{
      margin:0 0 .18rem!important;
      color:#253044!important;
      font-size:1.02rem!important;
      line-height:1.15!important;
    }
    #view-wellness #wellness-chart-description{
      margin:0 0 .5rem!important;
      color:#7d8998!important;
      font-size:.62rem!important;
      line-height:1.4!important;
    }
    #view-wellness .wellness-chart-frame{
      height:225px!important;min-height:225px!important;max-height:225px!important;
    }

    #view-wellness .wellness-weekly-detail-toggle{
      width:100%!important;
      min-height:44px!important;
      margin:.65rem 0 0!important;
      padding:.65rem .72rem!important;
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:.5rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:12px!important;
      background:#f8fafb!important;
      color:#536173!important;
      box-shadow:none!important;
      font-size:.68rem!important;
      font-weight:850!important;
      text-align:left!important;
    }
    #view-wellness .wellness-weekly-detail-toggle svg{width:16px!important;height:16px!important;transition:transform .18s ease!important}
    #view-wellness .wellness-weekly-detail-toggle[aria-expanded="true"] svg{transform:rotate(180deg)!important}
    #view-wellness .wellness-weekly-detail-table{
      display:none!important;
      margin:.45rem 0 0!important;
      max-height:290px!important;
      overflow:auto!important;
      border:1px solid #edf0f3!important;
      border-radius:12px!important;
      background:#fff!important;
    }
    #view-wellness .wellness-weekly-detail-table.is-open{display:block!important}

    #view-wellness #rpe-team-summary-section.wellness-rpe-clear-card{
      margin:.78rem 0 0!important;
      padding:.82rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:18px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 5px 16px rgba(15,23,42,.03)!important;
    }
    #view-wellness .wellness-rpe-heading-row{
      display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:.6rem!important;margin:0 0 .18rem!important;
    }
    #view-wellness #rpe-team-summary-section.wellness-rpe-clear-card h3{
      margin:0!important;font-size:1rem!important;color:#253044!important;line-height:1.15!important;
    }
    #view-wellness #rpe-team-summary-section.wellness-rpe-clear-card>p{
      margin:0 0 .6rem!important;color:#7d8998!important;font-size:.62rem!important;line-height:1.4!important;
    }
    #view-wellness .wellness-rpe-info-btn{
      width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;display:grid!important;place-items:center!important;
      border:1px solid #eadfca!important;border-radius:50%!important;background:#fffaf0!important;color:#a76d13!important;box-shadow:none!important;font-size:0!important;
    }
    #view-wellness .wellness-rpe-info-btn svg{width:16px!important;height:16px!important;margin:0!important}
    #view-wellness .rpe-team-summary-grid{
      display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.48rem!important;
    }
    #view-wellness .rpe-team-summary-grid>*{
      min-width:0!important;border-radius:13px!important;box-shadow:none!important;
    }
    #view-wellness .rpe-legend-bottom{
      display:flex!important;flex-wrap:nowrap!important;gap:.32rem!important;margin:.58rem 0 0!important;padding:.04rem 0 .1rem!important;overflow-x:auto!important;scrollbar-width:none!important;
    }
    #view-wellness .rpe-legend-bottom::-webkit-scrollbar{display:none!important}

    #view-wellness .wellness-coach-inspector{
      margin-top:.78rem!important;
    }
    #view-wellness .wellness-coach-inspector .wellness-clarity-heading{
      margin:0 0 .18rem!important;color:#253044!important;font-family:var(--font-heading)!important;font-size:1rem!important;line-height:1.15!important;
    }
    #view-wellness .wellness-coach-inspector .wellness-clarity-copy{
      margin:0 0 .65rem!important;color:#7d8998!important;font-size:.62rem!important;line-height:1.4!important;
    }
  }
  `;
  document.head.appendChild(style);
}

function weeklyTableWrap(){
  const table=document.querySelector('#view-wellness .borg-matrix-table');
  if(!table)return null;
  const wrap=table.parentElement;
  if(!wrap)return null;
  wrap.classList.add('wellness-weekly-detail-table');
  return wrap;
}

function ensureWeeklyToggle(){
  const wrap=weeklyTableWrap();
  if(!wrap)return;
  let button=wrap.previousElementSibling;
  if(!button?.classList?.contains('wellness-weekly-detail-toggle')){
    button=document.createElement('button');
    button.type='button';
    button.className='wellness-weekly-detail-toggle';
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span>Ver detalle semanal y respuestas por día</span><i data-lucide="chevron-down"></i>';
    wrap.parentElement?.insertBefore(button,wrap);
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',open?'false':'true');
      wrap.classList.toggle('is-open',!open);
    });
  }
}

function simplifyIndividualTable(){
  const table=document.querySelector('#view-wellness .wellness-coach-inspector .wellness-detail-table');
  if(!table)return;
  const headers=[...table.querySelectorAll('thead th')];
  const idx=headers.findIndex(th=>/^estado$/i.test(th.textContent.trim()));
  if(idx<0)return;
  headers[idx].remove();
  table.querySelectorAll('tbody tr').forEach(row=>row.children[idx]?.remove());
}

function decorateInspector(){
  const inspector=document.querySelector('#view-wellness .wellness-coach-inspector');
  if(!inspector)return;
  const heading=[...inspector.querySelectorAll('h2,h3')].find(el=>/seguimiento individual/i.test(el.textContent));
  if(heading){heading.textContent='Seguimiento individual';heading.classList.add('wellness-clarity-heading');}
  const intro=[...inspector.querySelectorAll('p')].find(p=>/consulta el cuestionario|cuestionario de cada jugadora/i.test(p.textContent));
  if(intro){intro.textContent='Consulta fatiga, sueño, dolor y notas de cada jugadora.';intro.classList.add('wellness-clarity-copy');}
}

function separateRpe(mainCard){
  const section=document.getElementById('rpe-team-summary-section');
  if(!section)return;
  section.classList.add('wellness-rpe-clear-card');
  const title=section.querySelector('h3');
  if(title)title.textContent='RPE de entrenamientos';
  const copy=section.querySelector(':scope > p');
  if(copy)copy.textContent='Media de esfuerzo percibido en cada sesión. Pulsa una tarjeta para ver las respuestas.';

  let headingRow=section.querySelector('.wellness-rpe-heading-row');
  if(!headingRow&&title){
    headingRow=document.createElement('div');
    headingRow.className='wellness-rpe-heading-row';
    title.parentElement?.insertBefore(headingRow,title);
    headingRow.appendChild(title);
  }
  const info=document.querySelector('#view-wellness button[onclick*="openBorgScaleModal"]');
  if(info&&headingRow&&info.parentElement!==headingRow){
    info.classList.remove('wellness-scale-info-btn');
    info.classList.add('wellness-rpe-info-btn');
    info.innerHTML='<i data-lucide="info"></i>';
    info.setAttribute('aria-label','Ver escala RPE');
    info.setAttribute('title','Ver escala RPE');
    headingRow.appendChild(info);
  }
  if(mainCard&&section.parentElement===mainCard)mainCard.insertAdjacentElement('afterend',section);
}

function reorderWellness(mainCard){
  if(!mainCard)return;
  const header=mainCard.querySelector(':scope > .card-header');
  const chart=document.getElementById('chart-wellness-weekly');
  const chartSection=chart?.parentElement?.parentElement;
  if(header&&chartSection&&chartSection.parentElement===mainCard)header.insertAdjacentElement('afterend',chartSection);
}

function tuneChart(){
  const canvas=document.getElementById('chart-wellness-weekly');
  if(!canvas||!window.Chart?.getChart)return;
  const chart=window.Chart.getChart(canvas);
  if(!chart)return;
  let changed=false;
  (chart.data?.datasets||[]).forEach(ds=>{
    const isScatter=ds.type==='scatter'||String(ds.label||'').toLowerCase().includes('jugadora');
    if(!isScatter){
      if(ds.categoryPercentage!==.96){ds.categoryPercentage=.96;changed=true;}
      if(ds.barPercentage!==.88){ds.barPercentage=.88;changed=true;}
      if(ds.maxBarThickness!==58){ds.maxBarThickness=58;changed=true;}
      if(ds.borderRadius!==7){ds.borderRadius=7;changed=true;}
    }
  });
  chart.options=chart.options||{};
  chart.options.plugins=chart.options.plugins||{};
  chart.options.plugins.legend=chart.options.plugins.legend||{};
  if(chart.options.plugins.legend.display!==false){chart.options.plugins.legend.display=false;changed=true;}
  const y=chart.options.scales?.y;
  if(y?.title){
    if(y.title.text!=='Bienestar (0–5)'){y.title.text='Bienestar (0–5)';changed=true;}
  }
  if(changed)try{chart.update('none');}catch(_){try{chart.update();}catch(__){}}
}

function readWeeklySummary(){
  const table=document.querySelector('#view-wellness .borg-matrix-table');
  if(!table)return{mean:null,responses:null};
  const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim().toLowerCase());
  const responseIndex=headers.findIndex(t=>t.includes('respuesta'));
  const meanIndex=headers.findIndex(t=>t.includes('bienestar medio'));
  const row=[...table.querySelectorAll('tbody tr')].find(tr=>/media semanal/i.test(tr.textContent));
  if(!row)return{mean:null,responses:null};
  const cells=[...row.children];
  const responses=responseIndex>=0?parseInt(cells[responseIndex]?.textContent,10):null;
  const meanRaw=meanIndex>=0?String(cells[meanIndex]?.textContent||'').match(/\d+(?:[.,]\d+)?/)?.[0]:null;
  const mean=meanRaw?Number(meanRaw.replace(',','.')):null;
  return{mean:Number.isFinite(mean)?mean:null,responses:Number.isFinite(responses)?responses:null};
}

function readLatestRpe(){
  const grid=document.getElementById('rpe-team-summary-grid');
  const card=grid?.children?.[0];
  if(!card)return null;
  const text=String(card.textContent||'').replace(/\s+/g,' ').trim();
  const match=text.match(/\b(?:10(?:[.,]0+)?|[0-9][.,]\d+)\b/);
  if(!match)return null;
  const value=Number(match[0].replace(',','.'));
  return Number.isFinite(value)?value:null;
}

function readAlertCount(){
  const inspector=document.querySelector('#view-wellness .wellness-coach-inspector');
  if(!inspector)return null;
  const alerts=inspector.querySelectorAll('.load-alert').length;
  if(alerts)return alerts;
  if(inspector.querySelector('.load-clear'))return 0;
  return null;
}

function ensureSnapshot(root,mainCard){
  if(!root||!mainCard)return;
  let box=root.querySelector('.wellness-team-snapshot');
  if(!box){
    box=document.createElement('section');
    box.className='wellness-team-snapshot';
    box.setAttribute('aria-label','Resumen de bienestar y carga del equipo');
    mainCard.insertAdjacentElement('beforebegin',box);
  }
  const weekly=readWeeklySummary();
  const rpe=readLatestRpe();
  const alerts=readAlertCount();
  const wellnessTone=weekly.mean==null?'':weekly.mean>=3.5?'is-good':weekly.mean>=2.5?'is-warn':'is-alert';
  const rpeTone=rpe==null?'':rpe<=6?'is-good':rpe<=8?'is-warn':'is-alert';
  const alertTone=alerts==null?'':alerts===0?'is-good':'is-alert';
  box.innerHTML=`
    <article class="wellness-snapshot-card ${wellnessTone}"><span class="wellness-snapshot-icon"><i data-lucide="heart-pulse"></i></span><div><small>Bienestar medio</small><strong>${weekly.mean==null?'—':numText(weekly.mean,'/5')}</strong></div></article>
    <article class="wellness-snapshot-card ${rpeTone}"><span class="wellness-snapshot-icon"><i data-lucide="activity"></i></span><div><small>Último RPE</small><strong>${rpe==null?'—':numText(rpe,'/10')}</strong></div></article>
    <article class="wellness-snapshot-card"><span class="wellness-snapshot-icon"><i data-lucide="users"></i></span><div><small>Respuestas semana</small><strong>${weekly.responses==null?'—':weekly.responses}</strong></div></article>
    <article class="wellness-snapshot-card ${alertTone}"><span class="wellness-snapshot-icon"><i data-lucide="shield-check"></i></span><div><small>Alertas de carga</small><strong>${alerts==null?'—':alerts}</strong></div></article>`;
}

function decorate(){
  if(!isCoach())return;
  const root=document.getElementById('view-wellness');
  if(!root)return;
  const mainCard=root.querySelector(':scope > .wellness-main-card')||root.querySelector(':scope > .card');
  const chartTitle=document.getElementById('wellness-chart-title');
  if(chartTitle)chartTitle.textContent='Bienestar del equipo';
  const chartCopy=document.getElementById('wellness-chart-description');
  if(chartCopy)chartCopy.textContent='Media semanal del equipo con las respuestas individuales de las jugadoras.';
  document.getElementById('borg-legend-inline')?.setAttribute('aria-hidden','true');
  reorderWellness(mainCard);
  ensureWeeklyToggle();
  separateRpe(mainCard);
  decorateInspector();
  simplifyIndividualTable();
  ensureSnapshot(root,mainCard);
  tuneChart();
  try{window.lucide?.createIcons?.();}catch(_){}
}

function install(){
  ensureStyles();
  decorate();
  setTimeout(decorate,250);
  setTimeout(decorate,900);
  setTimeout(decorate,1800);
  const root=document.getElementById('view-wellness');
  if(root&&!root.dataset.wellnessCoachClarityObserved){
    root.dataset.wellnessCoachClarityObserved='1';
    let timer=null;
    new MutationObserver(()=>{
      if(!root.classList.contains('active'))return;
      clearTimeout(timer);
      timer=setTimeout(decorate,90);
    }).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
