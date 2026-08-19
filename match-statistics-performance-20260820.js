(function(){
'use strict';

const FLAG='__matchStatisticsPerformance20260820';
if(window[FLAG])return;
window[FLAG]=true;

function ensureStyles(){
  if(document.getElementById('match-statistics-performance-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-performance-style';
  style.textContent=`
    #view-stats #stats-matches-list .match-stat-card{
      content-visibility:auto;
      contain-intrinsic-size:64px;
    }
    #view-stats #stats-matches-list .match-stat-card:has(.coach-match-accordion[open]){
      content-visibility:visible;
      contain-intrinsic-size:auto;
    }
    #view-stats .coach-chart-tab-panel{contain:layout paint;}
    @media(max-width:560px){
      #form-match-stats .stats-modal-actions{
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        background:#fff!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function installLegacyChartBypass(){
  if(!window.__matchStatisticsCoachAppUx20260819)return false;
  const current=window.renderGlobalStatsCharts;
  if(typeof current!=='function')return false;
  if(current.__statsPerformanceBypass)return true;
  const bypass=function(){
    try{
      if(typeof activeChartGlobalRecError!=='undefined'&&activeChartGlobalRecError){activeChartGlobalRecError.destroy?.();activeChartGlobalRecError=null;}
      if(typeof activeChartGlobalRecPerfect!=='undefined'&&activeChartGlobalRecPerfect){activeChartGlobalRecPerfect.destroy?.();activeChartGlobalRecPerfect=null;}
    }catch(_){}
  };
  bypass.__statsPerformanceBypass=true;
  bypass.__legacy=current;
  window.renderGlobalStatsCharts=bypass;
  try{renderGlobalStatsCharts=bypass;}catch(_){}
  return true;
}

function installPublishedRpcCache(){
  const client=window.VolleySupabase?.getClient?.();
  if(!client||typeof client.rpc!=='function')return false;
  if(client.__statsPublishedRpcCache20260820)return true;
  const baseRpc=client.rpc.bind(client);
  let inFlight=null;
  let lastResult=null;
  let lastAt=0;
  const TTL=1500;
  client.rpc=function(name,...args){
    if(String(name)!=='get_published_match_statistics')return baseRpc(name,...args);
    const now=Date.now();
    if(inFlight)return inFlight;
    if(lastResult&&(now-lastAt)<TTL)return Promise.resolve(lastResult);
    inFlight=Promise.resolve(baseRpc(name,...args)).then(result=>{
      if(!result?.error){lastResult=result;lastAt=Date.now();}
      return result;
    }).finally(()=>{inFlight=null;});
    return inFlight;
  };
  client.__statsPublishedRpcCache20260820=true;
  window.invalidatePublishedMatchStatsCache=function(){lastResult=null;lastAt=0;};
  return true;
}

function install(){
  ensureStyles();
  installLegacyChartBypass();
  if(!installPublishedRpcCache()){
    setTimeout(installPublishedRpcCache,250);
    setTimeout(installPublishedRpcCache,900);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
