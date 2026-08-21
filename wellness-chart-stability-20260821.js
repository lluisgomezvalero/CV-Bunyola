(function(){
'use strict';
const FLAG='__wellnessChartStability20260821';
if(window[FLAG])return;
window[FLAG]=true;
let wasIntersecting=false;
let rebuildBusy=false;

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

function repaint(){
 if(!active())return;
 const chart=getChart();if(!chart)return;
 try{chart.resize();chart.update('none');}catch(_){try{chart.update();}catch(__){}}
}

function hardRebuild(){
 if(!active()||rebuildBusy)return;
 rebuildBusy=true;
 try{
  const chart=getChart();
  if(chart){try{chart.destroy();}catch(_){}}
  try{window.activeChartTrend=null;}catch(_){ }
  if(typeof window.renderWellnessCharts==='function'){
   window.renderWellnessCharts();
  }else{
   try{if(typeof renderWellnessCharts==='function')renderWellnessCharts();}catch(_){ }
  }
  requestAnimationFrame(()=>{repaint();setTimeout(repaint,80);});
 }catch(e){console.warn('[WellnessChart] rebuild',e);}
 finally{setTimeout(()=>{rebuildBusy=false;},140);}
}

function queueRepaint(){
 cancelAnimationFrame(queueRepaint.raf||0);
 clearTimeout(queueRepaint.t);
 queueRepaint.raf=requestAnimationFrame(()=>{repaint();queueRepaint.t=setTimeout(repaint,80);});
}

function install(){
 injectCompositingFix();
 const canvas=getCanvas();
 if(!canvas){setTimeout(install,120);return;}
 if(!canvas.dataset.wellnessChartVisibilityGuard){
  canvas.dataset.wellnessChartVisibilityGuard='1';
  if('IntersectionObserver'in window){
   const io=new IntersectionObserver(entries=>{
    for(const entry of entries){
     const visible=entry.isIntersecting&&entry.intersectionRatio>0;
     if(visible&&!wasIntersecting){
      if(canvas.dataset.wellnessChartSeen==='1')setTimeout(hardRebuild,20);
      else{canvas.dataset.wellnessChartSeen='1';queueRepaint();}
     }
     wasIntersecting=visible;
    }
   },{threshold:[0,.01,.25]});
   io.observe(canvas);
  }
 }
 const root=document.getElementById('view-wellness');
 if(root&&!root.dataset.wellnessChartActiveGuard){
  root.dataset.wellnessChartActiveGuard='1';
  new MutationObserver(()=>{if(root.classList.contains('active'))setTimeout(hardRebuild,40);}).observe(root,{attributes:true,attributeFilter:['class']});
 }
 window.addEventListener('pageshow',()=>setTimeout(hardRebuild,40),{passive:true});
 window.addEventListener('resize',queueRepaint,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(hardRebuild,40);},{passive:true});
 setTimeout(queueRepaint,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
