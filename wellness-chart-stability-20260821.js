(function(){
'use strict';
const FLAG='__wellnessChartStability20260821';
if(window[FLAG])return;
window[FLAG]=true;

function getCanvas(){return document.getElementById('chart-wellness-weekly');}
function getChart(){const canvas=getCanvas();if(!canvas||!window.Chart)return null;try{return typeof window.Chart.getChart==='function'?window.Chart.getChart(canvas):null;}catch(_){return null;}}
function repaint(){const root=document.getElementById('view-wellness');if(!root?.classList.contains('active'))return;const chart=getChart();if(!chart)return;try{chart.resize();chart.update('none');}catch(_){try{chart.update();}catch(__){}}}
function queueRepaint(){cancelAnimationFrame(queueRepaint.raf||0);clearTimeout(queueRepaint.t);queueRepaint.raf=requestAnimationFrame(()=>{repaint();queueRepaint.t=setTimeout(repaint,80);});}
function install(){
 const canvas=getCanvas();
 if(!canvas){setTimeout(install,120);return;}
 if(!canvas.dataset.wellnessChartVisibilityGuard){
  canvas.dataset.wellnessChartVisibilityGuard='1';
  if('IntersectionObserver'in window){
   const io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>0){queueRepaint();break;}}},{threshold:[0,.01,.25]});
   io.observe(canvas);
  }
 }
 const root=document.getElementById('view-wellness');
 if(root&&!root.dataset.wellnessChartActiveGuard){
  root.dataset.wellnessChartActiveGuard='1';
  new MutationObserver(()=>{if(root.classList.contains('active'))queueRepaint();}).observe(root,{attributes:true,attributeFilter:['class']});
 }
 window.addEventListener('pageshow',queueRepaint,{passive:true});
 window.addEventListener('resize',queueRepaint,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueRepaint();},{passive:true});
 setTimeout(queueRepaint,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
