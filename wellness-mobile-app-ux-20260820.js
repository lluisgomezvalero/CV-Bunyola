(function(){
'use strict';
const FLAG='__wellnessMobileAppUx20260820';
if(window[FLAG])return;
window[FLAG]=true;

function ensureStyles(){
  if(document.getElementById('wellness-mobile-app-ux-20260820-style'))return;
  const style=document.createElement('style');
  style.id='wellness-mobile-app-ux-20260820-style';
  style.textContent=`
  @media(max-width:760px){
    #view-wellness{padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}

    #view-wellness>.wellness-main-card{
      margin:.3rem 0 .85rem!important;
      padding:.82rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:18px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 5px 16px rgba(15,23,42,.035)!important;
    }
    #view-wellness>.wellness-main-card>.card-header{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 38px!important;
      align-items:center!important;
      gap:.5rem!important;
      margin:0 0 .7rem!important;
      padding:0!important;
    }
    #view-wellness>.wellness-main-card>.card-header>div:first-child{min-width:0!important}
    #view-wellness #borg-matrix-header-title{
      margin:0!important;
      color:#253044!important;
      font-family:var(--font-heading)!important;
      font-size:1.02rem!important;
      line-height:1.1!important;
      gap:0!important;
    }
    #view-wellness .wellness-scale-info-btn{
      width:38px!important;
      height:38px!important;
      min-width:38px!important;
      padding:0!important;
      display:grid!important;
      place-items:center!important;
      justify-self:end!important;
      border:1px solid #eadfca!important;
      border-radius:50%!important;
      background:#fffaf0!important;
      color:#a76d13!important;
      box-shadow:none!important;
      font-size:0!important;
    }
    #view-wellness .wellness-scale-info-btn svg{width:17px!important;height:17px!important;margin:0!important}
    #view-wellness #borg-legend-inline{
      grid-column:1/-1!important;
      display:flex!important;
      flex-wrap:nowrap!important;
      gap:.34rem!important;
      width:100%!important;
      margin:.02rem 0 0!important;
      padding:.05rem 0 .12rem!important;
      overflow-x:auto!important;
      scrollbar-width:none!important;
      overscroll-behavior-x:contain!important;
    }
    #view-wellness #borg-legend-inline::-webkit-scrollbar{display:none!important}
    #view-wellness #borg-legend-inline span,
    #view-wellness .rpe-legend-bottom span{
      flex:0 0 auto!important;
      padding:.3rem .46rem!important;
      border:1px solid #e6e9ed!important;
      border-radius:999px!important;
      background:#f8fafb!important;
      color:#687587!important;
      font-size:.54rem!important;
      line-height:1!important;
      white-space:nowrap!important;
    }
    #view-wellness #borg-legend-inline b,
    #view-wellness .rpe-legend-bottom b{color:#3b4658!important;font-weight:900!important}

    #view-wellness .borg-matrix-table{
      width:100%!important;
      border-collapse:separate!important;
      border-spacing:0!important;
      font-size:.62rem!important;
      color:#445164!important;
    }
    #view-wellness .borg-matrix-table th,
    #view-wellness .borg-matrix-table td{
      padding:.43rem .34rem!important;
      border-bottom:1px solid #eef1f4!important;
      white-space:nowrap!important;
    }
    #view-wellness .borg-matrix-table thead th{
      background:#f8fafb!important;
      color:#7a8797!important;
      font-size:.54rem!important;
      font-weight:850!important;
      letter-spacing:.02em!important;
    }
    #view-wellness .borg-matrix-table tbody tr:last-child td{border-bottom:0!important}

    #view-wellness .wellness-chart-section{
      margin-top:1rem!important;
      padding-top:.82rem!important;
      border-top:1px solid #edf0f3!important;
    }
    #view-wellness #wellness-chart-title{
      margin:0 0 .25rem!important;
      color:#293548!important;
      font-size:.88rem!important;
      line-height:1.15!important;
    }
    #view-wellness #wellness-chart-description{
      margin:0 0 .55rem!important;
      color:#8a95a3!important;
      font-size:.61rem!important;
      line-height:1.4!important;
    }
    #view-wellness .wellness-chart-frame{
      height:210px!important;
      min-height:210px!important;
      max-height:210px!important;
    }

    #view-wellness #rpe-team-summary-section{
      margin-top:1rem!important;
      padding-top:.82rem!important;
      border-top:1px solid #edf0f3!important;
    }
    #view-wellness #rpe-team-summary-section h3{
      margin:0 0 .22rem!important;
      color:#293548!important;
      font-size:.88rem!important;
      line-height:1.15!important;
    }
    #view-wellness #rpe-team-summary-section>p{
      margin:0 0 .65rem!important;
      color:#8a95a3!important;
      font-size:.61rem!important;
      line-height:1.4!important;
    }
    #view-wellness .rpe-team-summary-grid{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:.45rem!important;
    }
    #view-wellness .rpe-team-summary-grid>*{
      min-width:0!important;
      border-radius:12px!important;
      box-shadow:none!important;
    }
    #view-wellness .rpe-legend-bottom{
      display:flex!important;
      flex-wrap:nowrap!important;
      gap:.32rem!important;
      margin:.6rem 0 0!important;
      padding:.04rem 0 .1rem!important;
      overflow-x:auto!important;
      scrollbar-width:none!important;
    }
    #view-wellness .rpe-legend-bottom::-webkit-scrollbar{display:none!important}

    #view-wellness .wellness-coach-inspector{
      margin:.85rem 0 0!important;
      padding:.82rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:18px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 5px 16px rgba(15,23,42,.03)!important;
    }
    #view-wellness .wellness-inspector-toolbar{
      display:grid!important;
      grid-template-columns:1fr!important;
      gap:.45rem!important;
      margin:0 0 .6rem!important;
    }
    #view-wellness .wellness-inspector-toolbar select{
      width:100%!important;
      max-width:none!important;
      min-height:40px!important;
      border-radius:11px!important;
      font-size:.7rem!important;
    }
    #view-wellness .wellness-detail-table{
      font-size:.62rem!important;
    }
    #view-wellness .wellness-detail-table th,
    #view-wellness .wellness-detail-table td{
      padding:.48rem .38rem!important;
    }
    #view-wellness .load-alerts{gap:.45rem!important;margin:.6rem 0!important}
    #view-wellness .load-alert,
    #view-wellness .load-clear{
      padding:.65rem .7rem!important;
      border-radius:11px!important;
      font-size:.66rem!important;
      line-height:1.4!important;
    }
    #view-wellness .load-alert small{font-size:.57rem!important}
  }
  `;
  document.head.appendChild(style);
}

function decorate(){
  const root=document.getElementById('view-wellness');
  if(!root)return;
  const mainCard=root.querySelector(':scope > .card');
  if(mainCard)mainCard.classList.add('wellness-main-card');

  const title=document.getElementById('borg-matrix-header-title');
  if(title&&title.textContent.trim()!=='Bienestar y carga')title.textContent='Bienestar y carga';

  const info=root.querySelector('button[onclick*="openBorgScaleModal"]');
  if(info){
    info.classList.add('wellness-scale-info-btn');
    info.innerHTML='<i data-lucide="info"></i>';
    info.setAttribute('aria-label','Ver escala RPE');
    info.setAttribute('title','Ver escala RPE');
  }

  const chart=document.getElementById('chart-wellness-weekly');
  if(chart?.parentElement){
    chart.parentElement.classList.add('wellness-chart-frame');
    chart.parentElement.parentElement?.classList.add('wellness-chart-section');
  }
  try{window.lucide?.createIcons?.();}catch(_){}
}

function install(){
  ensureStyles();
  decorate();
  setTimeout(decorate,450);
  const root=document.getElementById('view-wellness');
  if(root&&!root.dataset.wellnessMobileUxObserved){
    root.dataset.wellnessMobileUxObserved='1';
    new MutationObserver(()=>{
      if(root.classList.contains('active'))setTimeout(decorate,30);
    }).observe(root,{attributes:true,attributeFilter:['class']});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();