(function(){
'use strict';

const FLAG='__wellnessSvgChart20260822';
if(window[FLAG])return;
window[FLAG]=true;

let baseRenderWellnessCharts=null;
let lastSignature='';
let scheduled=false;
let lastWidth=0;

function mobileViewport(){
  try{return window.matchMedia('(max-width:760px), (max-width:1366px) and (any-pointer:coarse)').matches;}
  catch(_){return window.innerWidth<=1366;}
}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null;}catch(_){return null;}}
function isCoach(){
  try{
    if(typeof isCoachUser==='function'&&isCoachUser())return true;
    const role=String(currentUser()?.role||'').toLowerCase();
    return role==='coach'||role==='administrator'||role==='admin';
  }catch(_){return false;}
}
function root(){return document.getElementById('view-wellness');}
function active(){return root()?.classList.contains('active');}
function xml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));}
function clampFatigue(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(5,n)):null;}
function localDateKey(log){
  const raw=log?.dateKey||log?.date;
  if(raw)return String(raw).slice(0,10);
  if(log?.createdAt){
    const d=new Date(log.createdAt);
    if(Number.isFinite(d.getTime())){
      const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }
  }
  return '';
}
function weekInfo(key){
  const match=String(key||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return null;
  const d=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12);
  if(!Number.isFinite(d.getTime()))return null;
  const offset=(d.getDay()+6)%7;
  d.setDate(d.getDate()-offset);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return{key:`${y}-${m}-${day}`,date:d,label:`Sem. ${day}/${m}`};
}
function fatigueColor(value,alpha=1){
  try{if(typeof getFatigueChartColor==='function')return getFatigueChartColor(value,alpha);}catch(_){}
  const v=Number(value)||0;
  const rgb=v<=1.5?'34,197,94':v<=2.5?'20,184,166':v<=3.5?'234,179,8':v<=4.5?'249,115,22':'239,68,68';
  return `rgba(${rgb},${alpha})`;
}
function normalizedLogs(){
  const st=state();if(!st)return[];
  const playerById=new Map((st.players||[]).map(player=>[String(player.id),player]));
  let rows=(st.wellnessLogs||[]).filter(Boolean).map(log=>{
    const fatigue=clampFatigue(log.fatigue??log.generalState??log.general_state);
    const key=localDateKey(log);
    if(fatigue===null||!key)return null;
    const player=playerById.get(String(log.playerId??log.player_id??''));
    return{
      fatigue,
      dateKey:key,
      playerId:String(log.playerId??log.player_id??log.playerName??log.player_name??''),
      playerName:log.playerName||log.player_name||player?.name||'Jugadora'
    };
  }).filter(Boolean);
  if(!isCoach()){
    const pid=String(currentUser()?.playerId||'');
    if(pid)rows=rows.filter(row=>row.playerId===pid);
  }
  rows.sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.playerName.localeCompare(b.playerName));
  return rows;
}
function dataSignature(rows){return rows.map(row=>`${row.dateKey}:${row.playerId}:${row.fatigue}`).join('|');}
function ensureStyles(){
  if(document.getElementById('wellness-svg-chart-20260822-style'))return;
  const style=document.createElement('style');
  style.id='wellness-svg-chart-20260822-style';
  style.textContent=`
  @media(max-width:760px), (max-width:1366px) and (any-pointer:coarse){
    #view-wellness .wellness-chart-frame{position:relative!important;height:220px!important;min-height:220px!important;max-height:220px!important;overflow:hidden!important}
    #view-wellness #chart-wellness-weekly{display:none!important;visibility:hidden!important;width:0!important;height:0!important;pointer-events:none!important}
    #view-wellness .wellness-svg-chart{display:block!important;width:100%!important;height:220px!important;max-width:100%!important;overflow:visible!important}
    #view-wellness .wellness-svg-chart text{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  }`;
  document.head.appendChild(style);
}
function frame(){
  const canvas=document.getElementById('chart-wellness-weekly');
  const holder=canvas?.parentElement;
  if(holder)holder.classList.add('wellness-chart-frame');
  return holder||null;
}
function destroyLegacyChart(){
  try{
    const chart=window.activeChartTrend;
    if(chart&&typeof chart.destroy==='function')chart.destroy();
    window.activeChartTrend=null;
  }catch(_){}
}
function renderSvg(force=false){
  if(!mobileViewport())return false;
  ensureStyles();
  const holder=frame();
  if(!holder)return false;
  destroyLegacyChart();

  const rows=normalizedLogs();
  const signature=dataSignature(rows);
  const existing=holder.querySelector(':scope > .wellness-svg-chart');
  if(!force&&existing&&signature===lastSignature)return true;
  lastSignature=signature;

  const grouped=new Map();
  rows.forEach(row=>{
    const info=weekInfo(row.dateKey);if(!info)return;
    if(!grouped.has(info.key))grouped.set(info.key,{...info,logs:[]});
    grouped.get(info.key).logs.push(row);
  });
  const weeks=[...grouped.values()].sort((a,b)=>a.date-b.date);

  const width=Math.max(320,Math.round(holder.getBoundingClientRect().width||holder.clientWidth||320));
  lastWidth=width;
  const height=220,left=30,right=10,top=10,bottom=30;
  const plotW=Math.max(1,width-left-right),plotH=height-top-bottom;
  const baseline=top+plotH;
  const y=value=>top+((5-Math.max(0,Math.min(5,Number(value)||0)))/5)*plotH;

  let body='';
  for(let level=1;level<=5;level+=1){
    const yy=y(level);
    body+=`<line x1="${left}" y1="${yy.toFixed(1)}" x2="${(width-right).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e8edf2" stroke-width="1"/>`;
    body+=`<text x="${left-7}" y="${(yy+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${level}</text>`;
  }
  body+=`<line x1="${left}" y1="${baseline.toFixed(1)}" x2="${(width-right).toFixed(1)}" y2="${baseline.toFixed(1)}" stroke="#dce3ea" stroke-width="1"/>`;

  if(!weeks.length){
    body+=`<text x="${(width/2).toFixed(1)}" y="104" text-anchor="middle" font-size="13" font-weight="700" fill="#64748b">Sin registros de bienestar</text>`;
    body+=`<text x="${(width/2).toFixed(1)}" y="124" text-anchor="middle" font-size="10" fill="#94a3b8">La evolución aparecerá cuando haya respuestas.</text>`;
  }else{
    const step=plotW/weeks.length;
    const barWidth=Math.max(10,Math.min(52,step*.56));
    const showEvery=Math.max(1,Math.ceil(weeks.length/6));

    weeks.forEach((week,index)=>{
      const cx=left+step*(index+.5);
      const values=week.logs.map(row=>row.fatigue).filter(Number.isFinite);
      const average=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
      const yy=y(average),barHeight=Math.max(0,baseline-yy);
      body+=`<rect x="${(cx-barWidth/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="7" fill="${fatigueColor(average,.72)}" stroke="${fatigueColor(average,1)}" stroke-width="1"><title>${xml(week.label)} · media ${average.toFixed(1)}/5</title></rect>`;
      body+=`<text x="${cx.toFixed(1)}" y="${Math.max(top+10,yy-5).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="800" fill="#475569">${average.toFixed(1)}</text>`;
      if(index%showEvery===0||index===weeks.length-1){
        body+=`<text x="${cx.toFixed(1)}" y="${(height-9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#7c8998">${xml(week.label.replace('Sem. ',''))}</text>`;
      }
    });

    if(isCoach()){
      const playerKeys=[...new Set(rows.map(row=>row.playerId))];
      playerKeys.forEach((playerKey,playerIndex)=>{
        weeks.forEach((week,index)=>{
          const rec=week.logs.find(row=>row.playerId===playerKey);
          if(!rec)return;
          const step=plotW/weeks.length,cx=left+step*(index+.5);
          const spread=Math.min(step*.34,18);
          const seed=((playerIndex*17+7)%13)/12-.5;
          const px=cx+seed*spread*2;
          const py=y(rec.fatigue);
          body+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${fatigueColor(rec.fatigue,1)}" stroke="#ffffff" stroke-width="1.6"><title>${xml(rec.playerName)} · ${rec.fatigue.toFixed(1)}/5 · ${xml(rec.dateKey)}</title></circle>`;
        });
      });
    }
  }

  const svg=`<svg class="wellness-svg-chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Evolución semanal del bienestar" preserveAspectRatio="none">${body}</svg>`;
  existing?.remove();
  holder.insertAdjacentHTML('beforeend',svg);
  return true;
}
function schedule(force=false){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    if(active())renderSvg(force);
  });
}
function observeView(){
  const view=root();if(!view||view.dataset.wellnessSvgObserved==='1')return;
  view.dataset.wellnessSvgObserved='1';
  new MutationObserver(()=>schedule(false)).observe(view,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
}
function installOverride(attempt=0){
  ensureStyles();
  if(typeof window.renderWellnessCharts!=='function'){
    if(attempt<120)setTimeout(()=>installOverride(attempt+1),50);
    return;
  }
  if(window.renderWellnessCharts.__wellnessSvgMobile)return;
  baseRenderWellnessCharts=window.renderWellnessCharts;
  const wrapped=function(){
    if(mobileViewport())return renderSvg(true);
    return baseRenderWellnessCharts.apply(this,arguments);
  };
  wrapped.__wellnessSvgMobile=true;
  wrapped.__baseRenderWellnessCharts=baseRenderWellnessCharts;
  window.renderWellnessCharts=wrapped;
  window.renderWellnessSvgChart=()=>renderSvg(true);
  observeView();
  if(active())schedule(true);
}

window.addEventListener('resize',()=>{
  if(!mobileViewport()||!active())return;
  const holder=frame();if(!holder)return;
  const width=Math.round(holder.getBoundingClientRect().width||holder.clientWidth||0);
  if(Math.abs(width-lastWidth)>=4)schedule(true);
},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())schedule(false);});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installOverride(),{once:true});
else installOverride();
})();
