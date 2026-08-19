(function(){
'use strict';

const FLAG='__matchStatisticsCoachChartTabs20260820';
if(window[FLAG])return;
window[FLAG]=true;

let previousEnhancer=null;
const TAB_DEFS=[
  {tone:'positive',label:'Recepción #,+'},
  {tone:'negative',label:'Error recepción'},
  {tone:'info',label:'Ataque'}
];

function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}

function ensureStyles(){
  if(document.getElementById('coach-chart-tabs-20260820-style'))return;
  const style=document.createElement('style');
  style.id='coach-chart-tabs-20260820-style';
  style.textContent=`
    #view-stats #coach-stats-charts.coach-chart-tabs-ready{display:block!important;margin-bottom:1rem!important}
    #view-stats .coach-chart-tabs-shell{border:1px solid #e6ebf2;border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.032);overflow:hidden}
    #view-stats .coach-chart-tabs-top{padding:.7rem .72rem .58rem;border-bottom:1px solid #eef2f7}
    #view-stats .coach-chart-tabs-eyebrow{display:block;margin:0 0 .42rem;font-size:.54rem;font-weight:850;letter-spacing:.055em;text-transform:uppercase;color:#9aa5b4}
    #view-stats .coach-chart-tabs-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.28rem;padding:.22rem;border-radius:11px;background:#f4f7fa}
    #view-stats .coach-chart-tab{appearance:none;min-width:0;min-height:34px;padding:.38rem .35rem;border:0;border-radius:8px;background:transparent;color:#708096;font:inherit;font-size:.59rem;font-weight:800;line-height:1.08;text-align:center;cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}
    #view-stats .coach-chart-tab.is-active{background:#fff;color:#1f2937;box-shadow:0 1px 5px rgba(15,23,42,.08)}
    #view-stats .coach-chart-tab[data-tone="positive"].is-active{color:#3f7f62}
    #view-stats .coach-chart-tab[data-tone="negative"].is-active{color:#ad5959}
    #view-stats .coach-chart-tab[data-tone="info"].is-active{color:#52769f}
    #view-stats .coach-chart-tabs-panels{min-width:0}
    #view-stats .coach-chart-tab-panel{display:none;min-width:0}
    #view-stats .coach-chart-tab-panel.is-active{display:block}
    #view-stats .coach-chart-tabs-shell .coach-league-chart{margin:0!important;padding:.72rem .72rem .56rem!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important}
    #view-stats .coach-chart-tabs-shell .coach-league-chart-head span{display:none!important}
    #view-stats .coach-chart-tabs-shell .coach-league-chart-head{margin-bottom:.38rem!important}
    #view-stats .coach-chart-tabs-shell .coach-league-chart-head h3{font-size:.84rem!important}
    #view-stats .coach-chart-tabs-shell .coach-league-chart-head strong{font-size:.62rem!important}

    @media(max-width:560px){
      #view-stats .coach-chart-tabs-top{padding:.62rem .62rem .52rem}
      #view-stats .coach-chart-tabs-nav{gap:.22rem}
      #view-stats .coach-chart-tab{min-height:32px;padding:.34rem .25rem;font-size:.55rem}
      #view-stats .coach-chart-tabs-shell .coach-league-chart{padding:.66rem .58rem .5rem!important}
    }
    @media(max-width:370px){
      #view-stats .coach-chart-tab{font-size:.51rem;letter-spacing:-.01em}
    }
  `;
  document.head.appendChild(style);
}

function activeTone(){
  const saved=String(window.__coachStatsChartTab||'positive');
  return TAB_DEFS.some(def=>def.tone===saved)?saved:'positive';
}

function selectTone(shell,tone){
  const safe=TAB_DEFS.some(def=>def.tone===tone)?tone:'positive';
  window.__coachStatsChartTab=safe;
  shell.querySelectorAll('.coach-chart-tab').forEach(button=>{
    const active=button.dataset.tone===safe;
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-selected',active?'true':'false');
    button.tabIndex=active?0:-1;
  });
  shell.querySelectorAll('.coach-chart-tab-panel').forEach(panel=>{
    const active=panel.dataset.tone===safe;
    panel.classList.toggle('is-active',active);
    panel.hidden=!active;
  });
}

function buildTabs(){
  if(!isCoach())return;
  ensureStyles();
  const charts=document.getElementById('coach-stats-charts');
  if(!charts)return;
  const articles=[...charts.querySelectorAll(':scope > .coach-league-chart')];
  if(articles.length<2)return;

  const byTone=new Map(articles.map(article=>[String(article.dataset.tone||''),article]));
  if(!TAB_DEFS.every(def=>byTone.has(def.tone)))return;

  charts.querySelector(':scope > .coach-chart-tabs-shell')?.remove();
  const shell=document.createElement('section');
  shell.className='coach-chart-tabs-shell';
  shell.innerHTML='<div class="coach-chart-tabs-top"><span class="coach-chart-tabs-eyebrow">Liga · evolución por jornada</span><div class="coach-chart-tabs-nav" role="tablist" aria-label="Indicador de evolución"></div></div><div class="coach-chart-tabs-panels"></div>';
  const nav=shell.querySelector('.coach-chart-tabs-nav');
  const panels=shell.querySelector('.coach-chart-tabs-panels');

  TAB_DEFS.forEach((def,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='coach-chart-tab';
    button.dataset.tone=def.tone;
    button.id=`coach-chart-tab-${def.tone}`;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls',`coach-chart-panel-${def.tone}`);
    button.textContent=def.label;
    button.addEventListener('click',()=>selectTone(shell,def.tone));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const next=(index+(event.key==='ArrowRight'?1:-1)+TAB_DEFS.length)%TAB_DEFS.length;
      const nextTone=TAB_DEFS[next].tone;
      selectTone(shell,nextTone);
      shell.querySelector(`.coach-chart-tab[data-tone="${nextTone}"]`)?.focus();
    });
    nav.appendChild(button);

    const panel=document.createElement('div');
    panel.className='coach-chart-tab-panel';
    panel.dataset.tone=def.tone;
    panel.id=`coach-chart-panel-${def.tone}`;
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',button.id);
    panel.appendChild(byTone.get(def.tone));
    panels.appendChild(panel);
  });

  charts.appendChild(shell);
  charts.classList.add('coach-chart-tabs-ready');
  selectTone(shell,activeTone());
}

function wrapEnhancer(){
  const current=window.enhanceCoachMatchStatistics;
  if(typeof current!=='function'||current.__coachChartTabsWrapped)return false;
  previousEnhancer=current;
  const wrapped=function(){
    try{return previousEnhancer.apply(this,arguments);}
    finally{requestAnimationFrame(buildTabs);}
  };
  wrapped.__coachChartTabsWrapped=true;
  window.enhanceCoachMatchStatistics=wrapped;
  return true;
}

function install(){
  ensureStyles();
  requestAnimationFrame(buildTabs);
  if(wrapEnhancer())return;
  setTimeout(()=>{if(wrapEnhancer())buildTabs();},250);
  setTimeout(()=>{if(wrapEnhancer())buildTabs();},800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
