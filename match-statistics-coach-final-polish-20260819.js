(function(){
'use strict';

const FLAG='__matchStatisticsCoachFinalPolish20260819';
if(window[FLAG])return;
window[FLAG]=true;

let previousEnhancer=null;

function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}

function ensureStyles(){
  if(document.getElementById('match-statistics-coach-final-polish-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-coach-final-polish-style';
  style.textContent=`
    #view-stats{
      --coach-positive:#3f7f62;
      --coach-negative:#bd6666;
      --coach-info:#5b7fa8;
      --coach-warn:#b58b52;
    }

    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-positive{background:#f7fbf8!important}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-negative{background:#fff9f9!important}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-info{background:#f8faff!important}
    #view-stats #stats-priority-grid .stats-summary-item::after{content:'';position:absolute;right:.65rem;top:.65rem;width:7px;height:7px;border:1.5px solid #cbd5e1;border-radius:50%;opacity:.8}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-positive::after{border-color:var(--coach-positive)}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-negative::after{border-color:var(--coach-negative)}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-info::after{border-color:var(--coach-info)}

    #view-stats #stats-matches-list{gap:.42rem!important}
    #view-stats #stats-matches-list .coach-match-accordion>summary{min-height:60px!important;padding:.62rem .72rem!important}
    #view-stats #stats-matches-list .coach-match-kicker{margin-bottom:.16rem!important;font-size:.54rem!important;color:#7a8799!important}
    #view-stats #stats-matches-list .coach-match-summary-title{font-size:.8rem!important}
    #view-stats #stats-matches-list .coach-match-summary-result{font-size:.86rem!important}
    #view-stats #stats-matches-list .coach-match-accordion[data-status="published"] .coach-match-status-dot{background:#6b9b7d!important}
    #view-stats #stats-matches-list .coach-match-accordion[data-status="draft"] .coach-match-status-dot{background:#c49a60!important}
    #view-stats #stats-matches-list .coach-match-accordion[data-status="archived"] .coach-match-status-dot{background:#9ca8b7!important}
    #view-stats #stats-matches-list .coach-match-expanded{padding:.52rem .68rem .62rem!important}

    #view-stats #stats-matches-list .match-metrics-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.36rem!important;margin:0 0 .38rem!important}
    #view-stats #stats-matches-list .match-metrics-row .metric-pill{min-width:0!important;margin:0!important;padding:.42rem .5rem!important;border:1px solid #e8edf3!important;border-radius:10px!important;background:#fbfcfe!important}
    #view-stats #stats-matches-list .match-metrics-row .metric-pill .lbl{display:block!important;font-size:.56rem!important;line-height:1.12!important;color:#728094!important}
    #view-stats #stats-matches-list .match-metrics-row .metric-pill .val{display:block!important;margin-top:.12rem!important;font-size:.84rem!important;line-height:1!important;font-weight:850!important}
    #view-stats #stats-matches-list .coach-reception-distribution-copy{display:none!important}
    #view-stats #stats-matches-list .rec-progress-bar{height:7px!important;margin:.38rem 0 .52rem!important;border-radius:999px!important;overflow:hidden!important;background:#eef2f6!important}

    #view-stats #stats-matches-list .match-extra-metrics{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.34rem!important;margin:.4rem 0 0!important}
    #view-stats #stats-matches-list .match-extra-metrics>div{min-width:0!important;min-height:55px!important;margin:0!important;padding:.42rem .36rem .4rem .52rem!important;border-radius:10px!important}
    #view-stats #stats-matches-list .match-extra-metrics>div strong{display:block!important;font-size:.78rem!important;line-height:1.05!important}
    #view-stats #stats-matches-list .match-extra-metrics>div span{display:block!important;margin-top:.12rem!important;font-size:.54rem!important;line-height:1.12!important;color:#758196!important}
    #view-stats #stats-matches-list .match-extra-metrics>div.coach-tone-positive{background:#f8fbf9!important}
    #view-stats #stats-matches-list .match-extra-metrics>div.coach-tone-negative{background:#fffafa!important}
    #view-stats #stats-matches-list .match-extra-metrics>div.coach-tone-info{background:#f9fbfe!important}
    #view-stats #stats-matches-list .match-extra-metrics>div.coach-tone-warn{background:#fffcf7!important}

    #view-stats #stats-matches-list .coach-card-more{margin-top:.48rem!important}
    #view-stats #stats-matches-list .coach-card-more>summary{min-height:34px!important;padding:.4rem .02rem 0!important;font-size:.61rem!important}
    #view-stats #stats-matches-list .coach-card-more .stats-extended-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.32rem!important;margin-top:.38rem!important}
    #view-stats #stats-matches-list .stats-extended-card-item{min-height:52px!important;padding:.4rem .32rem .38rem .5rem!important;border-radius:9px!important}
    #view-stats #stats-matches-list .stats-extended-card-item strong{font-size:.74rem!important}
    #view-stats #stats-matches-list .stats-extended-card-item span{font-size:.52rem!important}
    #view-stats #stats-matches-list .stats-card-actions{margin-top:.52rem!important;padding-top:.5rem!important}
    #view-stats #stats-matches-list .stats-card-actions .btn{min-height:36px!important;font-size:.64rem!important;padding:.46rem .5rem!important}

    #view-stats #coach-stats-charts{gap:.62rem!important}
    #view-stats #coach-stats-charts .coach-league-chart{padding:.76rem .78rem .58rem!important;border-radius:15px!important;box-shadow:0 5px 18px rgba(15,23,42,.032)!important}
    #view-stats .coach-league-chart-head{margin-bottom:.42rem!important}
    #view-stats .coach-league-chart-head span{font-size:.54rem!important;color:#9aa5b4!important}
    #view-stats .coach-league-chart-head h3{font-size:.84rem!important}
    #view-stats .coach-league-chart-head strong{font-size:.62rem!important;color:#718096!important}
    #view-stats .coach-league-chart-body{grid-template-columns:24px minmax(0,1fr)!important;gap:.28rem!important}
    #view-stats .coach-chart-axis{height:150px!important;font-size:.47rem!important}
    #view-stats .coach-bars-area{height:168px!important}
    #view-stats .coach-bar{opacity:.76!important;border-radius:3px 3px 1px 1px!important}
    #view-stats .coach-bar-value{font-size:.48rem!important;color:#687588!important}
    #view-stats .coach-bar-label{font-size:.48rem!important;color:#718096!important}
    #view-stats .coach-league-chart.is-very-dense .coach-bars-grid{gap:1px!important}
    #view-stats .coach-league-chart.is-very-dense .coach-bar{width:68%!important;min-width:2px!important;border-radius:2px 2px 0 0!important}
    #view-stats .coach-league-chart[data-tone="positive"] .coach-bar{--bar-color:#4f8c6c!important}
    #view-stats .coach-league-chart[data-tone="negative"] .coach-bar{--bar-color:#c46c6c!important}
    #view-stats .coach-league-chart[data-tone="info"] .coach-bar{--bar-color:#6688b0!important}

    @media(max-width:560px){
      #view-stats #stats-matches-list .coach-match-accordion>summary{min-height:57px!important;padding:.58rem .64rem!important}
      #view-stats #stats-matches-list .coach-match-summary-title{font-size:.76rem!important}
      #view-stats #stats-matches-list .coach-match-summary-side{gap:.42rem!important}
      #view-stats #stats-matches-list .coach-match-expanded{padding:.48rem .6rem .58rem!important}
      #view-stats #stats-matches-list .match-extra-metrics{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.28rem!important}
      #view-stats #stats-matches-list .match-extra-metrics>div{min-height:52px!important;padding:.38rem .28rem .36rem .46rem!important}
      #view-stats #stats-matches-list .match-extra-metrics>div strong{font-size:.73rem!important}
      #view-stats #stats-matches-list .match-extra-metrics>div span{font-size:.5rem!important}
      #view-stats #stats-matches-list .coach-card-more .stats-extended-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      #view-stats #coach-stats-charts .coach-league-chart{padding:.7rem .62rem .52rem!important}
      #view-stats .coach-league-chart-head h3{font-size:.79rem!important}
      #view-stats .coach-chart-axis{height:142px!important}
      #view-stats .coach-bars-area{height:160px!important}
      #view-stats .coach-league-chart.is-very-dense .coach-bar-label{font-size:.42rem!important;letter-spacing:-.025em!important}
    }

    @media(max-width:370px){
      #view-stats #stats-matches-list .match-extra-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #view-stats #stats-matches-list .coach-card-more .stats-extended-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #view-stats .coach-league-chart.is-very-dense .coach-bar-label{font-size:.4rem!important}
    }
  `;
  document.head.appendChild(style);
}

function compactExpandedCards(){
  if(!isCoach())return;
  document.querySelectorAll('#stats-matches-list .match-stat-card').forEach(card=>{
    const progress=card.querySelector('.rec-progress-bar');
    const copy=progress?.previousElementSibling;
    if(copy&&/Distribuci[oó]n de Recepci[oó]n/i.test(copy.textContent||''))copy.classList.add('coach-reception-distribution-copy');
  });
}

function applyFinalPolish(){
  if(!isCoach())return;
  ensureStyles();
  compactExpandedCards();
}

function wrapEnhancer(){
  const current=window.enhanceCoachMatchStatistics;
  if(typeof current!=='function'||current.__coachFinalPolishWrapped)return false;
  previousEnhancer=current;
  const wrapped=function(){
    try{return previousEnhancer.apply(this,arguments);}
    finally{requestAnimationFrame(applyFinalPolish);}
  };
  wrapped.__coachFinalPolishWrapped=true;
  window.enhanceCoachMatchStatistics=wrapped;
  return true;
}

function install(){
  ensureStyles();
  applyFinalPolish();
  if(wrapEnhancer())return;
  setTimeout(()=>{if(wrapEnhancer())applyFinalPolish();},250);
  setTimeout(()=>{if(wrapEnhancer())applyFinalPolish();},800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
