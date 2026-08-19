(function(){
'use strict';

const FLAG='__matchStatisticsPlayerOverview20260819';
if(window[FLAG])return;
window[FLAG]=true;

let baseRenderStats=null;
let installed=false;
let renderSeq=0;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function db(){return window.VolleySupabase?.getClient?.()||null;}
function isUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));}
function parseRound(value){const m=String(value||'').match(/(\d{1,2})/);const n=m?Number(m[1]):null;return Number.isInteger(n)&&n>0&&n<=22?n:null;}
function matchKeyValues(match){return [match?.id,match?.supabaseId,match?.supabase_id,match?.legacyId,match?.legacy_id].filter(Boolean).map(String);}
function metric(stats,key){const n=Number(stats?.[key]);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;}

function ensureStyles(){
  if(document.getElementById('match-statistics-player-overview-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-player-overview-style';
  style.textContent=`
    #view-stats #coach-stats-charts.player-league-overview{display:grid!important;grid-template-columns:1fr!important;gap:.65rem!important;margin:0 0 .9rem!important;overflow:visible!important}
    #view-stats #coach-stats-charts.player-league-overview>.card{display:none!important}
    #view-stats .player-league-empty{padding:.85rem .9rem;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:#64748b;font-size:.72rem;line-height:1.35;box-shadow:0 6px 18px rgba(15,23,42,.035)}
    #view-stats .player-league-chart{margin:0;padding:.78rem .8rem .62rem;border:1px solid #e5eaf1;border-radius:15px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.035);overflow:hidden}
    #view-stats .player-league-chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem;margin-bottom:.5rem}
    #view-stats .player-league-chart-head>div{min-width:0}
    #view-stats .player-league-chart-head span{display:block;font-size:.55rem;font-weight:850;letter-spacing:.055em;text-transform:uppercase;color:#94a3b8}
    #view-stats .player-league-chart-head h3{margin:.1rem 0 0;font-family:var(--font-heading);font-size:.84rem;line-height:1.15;color:#0f172a}
    #view-stats .player-league-chart-head strong{flex:0 0 auto;font-size:.62rem;color:#64748b;font-variant-numeric:tabular-nums}
    #view-stats .player-chart-body{display:grid;grid-template-columns:22px minmax(0,1fr);gap:.28rem;min-width:0}
    #view-stats .player-chart-axis{position:relative;height:126px;font-size:.45rem;color:#94a3b8;font-variant-numeric:tabular-nums}
    #view-stats .player-chart-axis span{position:absolute;right:0}
    #view-stats .player-chart-axis .y100{top:0}
    #view-stats .player-chart-axis .y50{top:50%;transform:translateY(-50%)}
    #view-stats .player-chart-axis .y0{bottom:16px}
    #view-stats .player-bars-area{position:relative;height:142px;min-width:0;overflow:hidden;border-bottom:1px solid #edf1f5;background:linear-gradient(to bottom,transparent 0,transparent calc(50% - .5px),#f2f5f8 calc(50% - .5px),#f2f5f8 calc(50% + .5px),transparent calc(50% + .5px))}
    #view-stats .player-bars-grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(var(--count),minmax(0,1fr));gap:var(--gap);align-items:stretch;min-width:0}
    #view-stats .player-bar-col{min-width:0;display:grid;grid-template-rows:1fr 16px;align-items:end}
    #view-stats .player-bar-track{position:relative;height:100%;display:flex;align-items:flex-end;justify-content:center;min-width:0}
    #view-stats .player-bar{width:min(68%,var(--bar-max));min-width:3px;height:calc(var(--value) * 1%);max-height:100%;border-radius:4px 4px 1px 1px;background:var(--bar-color);opacity:.82}
    #view-stats .player-bar.is-empty{height:2px!important;background:#dbe3ec;opacity:.75}
    #view-stats .player-bar-value{position:absolute;left:50%;bottom:calc(var(--value) * 1% + 3px);transform:translateX(-50%);font-size:.46rem;font-weight:800;color:#64748b;white-space:nowrap;font-variant-numeric:tabular-nums}
    #view-stats .player-league-chart.is-dense .player-bar-value{display:none}
    #view-stats .player-bar-label{display:flex;align-items:flex-end;justify-content:center;height:16px;font-size:.46rem;font-weight:750;color:#64748b;font-variant-numeric:tabular-nums;white-space:nowrap}
    #view-stats .player-league-chart.is-very-dense .player-bar-label{font-size:.4rem}
    #stats-matches-list .player-match-stat-card .match-round-badge.player-friendly-badge{background:#f1f5f9!important;color:#475569!important;border-color:#e2e8f0!important}
    @media(max-width:380px){
      #view-stats .player-league-chart{padding:.72rem .66rem .55rem}
      #view-stats .player-league-chart-head h3{font-size:.78rem}
      #view-stats .player-chart-axis{height:116px}
      #view-stats .player-bars-area{height:132px}
      #view-stats .player-bar-label{font-size:.42rem}
    }
  `;
  document.head.appendChild(style);
}

function localMatches(){
  return (state()?.events||[]).filter(match=>['Partido','Amistoso'].includes(String(match?.type||''))).sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||'')));
}

function relabelPlayerCards(){
  const cards=[...document.querySelectorAll('#stats-matches-list .player-match-stat-card')];
  const matches=localMatches();
  cards.forEach((card,index)=>{
    const match=matches[index];if(!match)return;
    const badge=card.querySelector('.match-round-badge');if(!badge)return;
    if(String(match.type)==='Amistoso'){
      badge.textContent='Amistoso';
      badge.classList.add('player-friendly-badge');
      return;
    }
    badge.classList.remove('player-friendly-badge');
    const round=parseRound(match?.round??match?.jornada??match?.matchday??match?.rawPayload?.round??match?.rawPayload?.jornada);
    badge.textContent=round?`Jornada ${round}`:'Partido de Liga';
  });
}

async function mapPublishedRows(rows){
  const matches=localMatches();
  const direct=new Map();
  matches.forEach(match=>matchKeyValues(match).forEach(key=>direct.set(key,match)));
  const unresolved=[];
  const mapped=[];
  (rows||[]).forEach(row=>{
    const id=String(row?.event_id||'');
    const match=direct.get(id);
    if(match)mapped.push({row,match});
    else if(isUuid(id))unresolved.push(row);
  });
  if(!unresolved.length)return mapped;
  const client=db();if(!client)return mapped;
  try{
    const ids=unresolved.map(row=>String(row.event_id));
    const {data,error}=await client.from('events').select('id,legacy_id').in('id',ids);
    if(error)throw error;
    const meta=new Map((data||[]).map(item=>[String(item.id),String(item.legacy_id||'')]));
    unresolved.forEach(row=>{
      const legacy=meta.get(String(row.event_id));if(!legacy)return;
      const match=matches.find(item=>matchKeyValues(item).includes(legacy));
      if(match)mapped.push({row,match});
    });
  }catch(error){console.warn('[PlayerStatsOverview] event mapping',error);}
  return mapped;
}

function sizing(count){
  if(count<=4)return {gap:'11px',max:'42px'};
  if(count<=8)return {gap:'6px',max:'28px'};
  if(count<=14)return {gap:'3px',max:'18px'};
  return {gap:'1px',max:'9px'};
}
function average(rows,key){
  const values=rows.map(item=>item.values[key]).filter(value=>value!=null);
  return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
}
function chart(rows,{key,title,color}){
  const count=Math.max(1,rows.length);const size=sizing(count);const avg=average(rows,key);
  const dense=count>8?' is-dense':'';const veryDense=count>16?' is-very-dense':'';
  const bars=rows.map(item=>{
    const value=item.values[key];const safe=value==null?0:value;
    return `<div class="player-bar-col" title="Jornada ${item.round} · ${value==null?'Sin dato':value.toFixed(1)+'%'}"><div class="player-bar-track">${value==null?'':`<span class="player-bar-value" style="--value:${safe}">${value.toFixed(0)}%</span>`}<span class="player-bar ${value==null?'is-empty':''}" style="--value:${safe};--bar-color:${color}"></span></div><small class="player-bar-label">${item.round}</small></div>`;
  }).join('');
  return `<article class="player-league-chart${dense}${veryDense}"><header class="player-league-chart-head"><div><span>Liga · evolución</span><h3>${title}</h3></div><strong>${avg==null?'—':avg.toFixed(1)+'% media'}</strong></header><div class="player-chart-body"><div class="player-chart-axis"><span class="y100">100</span><span class="y50">50</span><span class="y0">0</span></div><div class="player-bars-area"><div class="player-bars-grid" style="--count:${count};--gap:${size.gap};--bar-max:${size.max}">${bars}</div></div></div></article>`;
}

async function renderPlayerOverview(){
  if(isCoach())return;
  const seq=++renderSeq;
  ensureStyles();
  relabelPlayerCards();
  const charts=document.getElementById('coach-stats-charts');if(!charts)return;
  charts.classList.add('player-league-overview');
  const client=db();
  if(!client){charts.innerHTML='<div class="player-league-empty">Las gráficas de evolución estarán disponibles cuando se carguen los datos publicados.</div>';return;}
  try{
    const {data,error}=await client.rpc('get_published_match_statistics');
    if(error)throw error;if(seq!==renderSeq)return;
    const mapped=await mapPublishedRows(data||[]);if(seq!==renderSeq)return;
    const league=mapped.filter(item=>String(item.match?.type||'')==='Partido').sort((a,b)=>String(a.match?.date||'').localeCompare(String(b.match?.date||''))).slice(0,22);
    const rows=league.map((item,index)=>{
      const stats=item.row?.payload||{};
      const visible=new Set(Array.isArray(item.row?.visible_metrics)?item.row.visible_metrics.map(String):[]);
      const round=parseRound(item.match?.round??item.match?.jornada??item.match?.matchday??item.match?.rawPayload?.round??item.match?.rawPayload?.jornada)??(index+1);
      return {round,values:{
        recErrorPct:visible.has('recErrorPct')?metric(stats,'recErrorPct'):null,
        recPerfectPct:visible.has('recPerfectPct')?metric(stats,'recPerfectPct'):null
      }};
    }).sort((a,b)=>a.round-b.round);
    if(!rows.length){
      charts.innerHTML='<div class="player-league-empty"><strong style="display:block;color:#334155;margin-bottom:.15rem;">Evolución de Liga</strong>Todavía no hay ninguna jornada de Liga publicada. Las gráficas aparecerán al publicar la primera estadística.</div>';
      return;
    }
    charts.innerHTML=[
      chart(rows,{key:'recErrorPct',title:'Error en recepción (-)',color:'#c65f66'}),
      chart(rows,{key:'recPerfectPct',title:'Recepción perfecta (#,+)',color:'#4b9b72'})
    ].join('');
  }catch(error){
    console.error('[PlayerStatsOverview] load',error);
    charts.innerHTML='<div class="player-league-empty">No se ha podido cargar la evolución de las jornadas publicadas.</div>';
  }
}

function install(){
  if(installed)return;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=document.documentElement.dataset.matchStatsAuthoritativeBound==='1';
    const current=window.renderStats;
    if(ready&&typeof current==='function'&&!current.__playerOverviewWrapped){
      clearInterval(timer);installed=true;baseRenderStats=current;
      const wrapped=function(...args){
        const result=baseRenderStats.apply(this,args);
        Promise.resolve(result).finally(()=>{if(!isCoach())void renderPlayerOverview();});
        return result;
      };
      wrapped.__playerOverviewWrapped=true;
      window.renderStats=wrapped;try{renderStats=wrapped;}catch(_){}
    }else if(tries>=100)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
