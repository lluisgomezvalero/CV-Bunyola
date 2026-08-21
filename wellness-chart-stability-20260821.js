(function(){
'use strict';
const FLAG='__wellnessChartStability20260821';
if(window[FLAG])return;
window[FLAG]=true;
let stableTimer=0;
let lastViewportWidth=Math.round(window.innerWidth||0);

function injectCompositingFix(){
 if(document.getElementById('wellness-chart-compositing-fix-20260821'))return;
 const style=document.createElement('style');
 style.id='wellness-chart-compositing-fix-20260821';
 style.textContent=`
 @media(max-width:760px), (max-width:1366px) and (any-pointer:coarse){
  #view-wellness.wellness-role-coach>.wellness-main-card{
   backdrop-filter:none!important;
   -webkit-backdrop-filter:none!important;
   background:#fff!important;
  }
  #view-wellness .wellness-chart-section,
  #view-wellness .wellness-chart-frame{
   backdrop-filter:none!important;
   -webkit-backdrop-filter:none!important;
   filter:none!important;
   transform:none!important;
   background:#fff!important;
  }
  #view-wellness #chart-wellness-weekly{
   display:block!important;
   visibility:visible!important;
   opacity:1!important;
   transform:none!important;
   filter:none!important;
  }
 }
 `;
 document.head.appendChild(style);
}

function getCanvas(){return document.getElementById('chart-wellness-weekly');}
function getChart(){const canvas=getCanvas();if(!canvas||!window.Chart)return null;try{return typeof window.Chart.getChart==='function'?window.Chart.getChart(canvas):null;}catch(_){return null;}}
function active(){return document.getElementById('view-wellness')?.classList.contains('active');}
function hasStableLayout(){
 const canvas=getCanvas();
 if(!canvas||!active())return false;
 const rect=canvas.getBoundingClientRect();
 const frame=canvas.closest('.wellness-chart-frame');
 const frameRect=frame?.getBoundingClientRect();
 return rect.width>120&&rect.height>120&&(!frameRect||frameRect.width>120&&frameRect.height>120);
}
function chartHasValidSize(chart){return !!chart&&Number(chart.width)>120&&Number(chart.height)>120;}

function repaint(){
 if(!hasStableLayout())return;
 const chart=getChart();if(!chart)return;
 try{chart.resize();chart.update('none');}catch(_){try{chart.update();}catch(__){}}
}

function buildOnlyIfNeeded(){
 if(!hasStableLayout())return;
 const chart=getChart();
 if(chartHasValidSize(chart)){
  repaint();
  return;
 }
 if(chart){try{chart.destroy();}catch(_){}}
 try{window.activeChartTrend=null;}catch(_){ }
 try{
  if(typeof window.renderWellnessCharts==='function')window.renderWellnessCharts();
  else if(typeof renderWellnessCharts==='function')renderWellnessCharts();
 }catch(e){console.warn('[WellnessChart] initial build',e);}
 requestAnimationFrame(()=>{repaint();setTimeout(repaint,100);});
}

function ensureStableChart(attempt=0){
 clearTimeout(stableTimer);
 if(!active())return;
 if(hasStableLayout()){
  stableTimer=setTimeout(()=>requestAnimationFrame(buildOnlyIfNeeded),120);
  return;
 }
 if(attempt<18)stableTimer=setTimeout(()=>ensureStableChart(attempt+1),80);
}

function repaintWhenStable(attempt=0){
 clearTimeout(stableTimer);
 if(!active())return;
 if(hasStableLayout()){
  stableTimer=setTimeout(()=>requestAnimationFrame(repaint),80);
  return;
 }
 if(attempt<10)stableTimer=setTimeout(()=>repaintWhenStable(attempt+1),80);
}

function handleViewportResize(){
 const width=Math.round(window.innerWidth||0);
 if(Math.abs(width-lastViewportWidth)<4)return;
 lastViewportWidth=width;
 repaintWhenStable();
}

function install(){
 injectCompositingFix();
 const canvas=getCanvas();
 if(!canvas){setTimeout(install,120);return;}
 const root=document.getElementById('view-wellness');
 if(root&&!root.dataset.wellnessChartActiveGuard){
  root.dataset.wellnessChartActiveGuard='1';
  new MutationObserver(()=>{if(root.classList.contains('active'))ensureStableChart();}).observe(root,{attributes:true,attributeFilter:['class']});
 }
 window.addEventListener('pageshow',repaintWhenStable,{passive:true});
 window.addEventListener('resize',handleViewportResize,{passive:true});
 if(window.visualViewport)window.visualViewport.addEventListener('resize',handleViewportResize,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)repaintWhenStable();},{passive:true});
 setTimeout(()=>ensureStableChart(),300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
