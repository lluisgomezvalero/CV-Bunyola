(function(){
'use strict';

const FLAG='__playerWellnessSummary20260813';
if(window[FLAG])return;
window[FLAG]=true;

function parseNumber(text){
  const match=String(text||'').match(/-?\d+(?:[.,]\d+)?/);
  return match?Number(match[0].replace(',','.')):null;
}

function readWellnessPanel(modal){
  const panel=modal?.querySelector('.passport-status-panel.passport-wellness-v2');
  if(!panel)return null;
  const heading=String(panel.querySelector('.passport-panel-heading h3')?.textContent||'').trim();
  if(/sin registro/i.test(heading))return {empty:true};
  if(/actualizando/i.test(heading))return {loading:true};

  const result={fatigue:null,sleep:null,pain:null};
  panel.querySelectorAll('.passport-wellness-v2-item').forEach(item=>{
    const label=String(item.querySelector('span')?.textContent||'').trim().toLowerCase();
    const value=String(item.querySelector('strong')?.textContent||'').trim();
    if(label==='fatiga')result.fatigue=parseNumber(value);
    if(label==='molestias')result.pain=parseNumber(value);
    if(label==='sueño')result.sleep=value;
  });
  return result;
}

function summarize(data){
  if(!data||data.loading)return {text:'Actualizando…',tone:'neutral'};
  if(data.empty)return {text:'— Sin registro',tone:'neutral'};
  const fatigue=Number(data.fatigue);
  const pain=Number(data.pain);
  const sleep=String(data.sleep||'').toLowerCase();
  if(Number.isFinite(pain)&&pain>=4)return {text:'🤕 Molestias',tone:'pain'};
  if(Number.isFinite(fatigue)&&fatigue>=4)return {text:'😴 Cansada',tone:'fatigue'};
  if(['muy mal','mal'].includes(sleep))return {text:'😐 Sueño bajo',tone:'sleep'};
  return {text:'😊 Bien',tone:'good'};
}

function findSummaryValue(modal){
  const grid=modal?.querySelector('.passport-metrics-grid');
  if(!grid)return null;
  const candidates=[...grid.querySelectorAll('article, .passport-metric, .passport-kpi, :scope > div')];
  for(const card of candidates){
    const labels=[...card.querySelectorAll('span, small, label')];
    const label=labels.find(el=>String(el.textContent||'').trim().toLowerCase()==='bienestar');
    if(!label)continue;
    const value=card.querySelector('strong, b, .value, .passport-metric-value, .passport-kpi-value');
    if(value)return value;
  }
  return null;
}

function updateSummary(){
  const modal=document.getElementById('modal-player-detail');
  if(!modal||!modal.classList.contains('active'))return;
  const value=findSummaryValue(modal);
  if(!value)return;
  const summary=summarize(readWellnessPanel(modal));
  if(value.textContent!==summary.text)value.textContent=summary.text;
  value.dataset.wellnessSummaryTone=summary.tone;
  const colors={good:'#15803d',fatigue:'#c2410c',sleep:'#a16207',pain:'#7e22ce',neutral:'#64748b'};
  value.style.color=colors[summary.tone]||colors.neutral;
}

function install(){
  const modal=document.getElementById('modal-player-detail');
  if(!modal)return;
  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;updateSummary();});
  };
  new MutationObserver(schedule).observe(modal,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  schedule();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
