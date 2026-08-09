(function(){
'use strict';

let rendering=false;
let refreshTimer=null;
let lastSignature='';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function isPlayer(){try{return typeof getCurrentUser==='function'&&getCurrentUser()?.role==='player'}catch(_){return false}}
function fmtUA(v){return Number.isFinite(Number(v))?`${Math.round(Number(v)).toLocaleString('es-ES')} UA`:'—'}
function fmtPct(v){if(!Number.isFinite(Number(v)))return '—';const n=Math.round(Number(v));return `${n>0?'+':''}${n} %`}
function fmtAcwr(v){return Number.isFinite(Number(v))?Number(v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}):'Datos insuficientes'}

function tone(key){
  return ({low:'blue',similar:'green',considerable:'orange',high:'red',insufficient:'neutral'})[key]||'neutral';
}

function dailySeries(loads,days=42){
  const end=new Date(); end.setHours(23,59,59,999);
  const start=new Date(end); start.setDate(start.getDate()-(days-1)); start.setHours(0,0,0,0);
  const buckets=[];
  for(let i=0;i<days;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    buckets.push({date:d,key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,load:0});
  }
  const map=new Map(buckets.map(x=>[x.key,x]));
  for(const row of loads||[]){
    const d=new Date(row.startsAt);if(Number.isNaN(d.getTime()))continue;
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const b=map.get(key);if(b)b.load+=Number(row.sessionLoad)||0;
  }
  return buckets;
}

function chartSvg(loads){
  const data=dailySeries(loads,42);
  const max=Math.max(1,...data.map(x=>x.load));
  const w=840,h=180,padX=18,padTop=14,padBottom=28;
  const plotH=h-padTop-padBottom;
  const step=(w-padX*2)/data.length;
  const bars=data.map((d,i)=>{
    const bh=Math.max(0,(d.load/max)*plotH);
    const x=padX+i*step+1;
    const y=padTop+plotH-bh;
    const bw=Math.max(2,step-2);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2"><title>${esc(d.key)} · ${Math.round(d.load)} UA</title></rect>`;
  }).join('');
  const labels=[0,6,13,20,27,34,41].map(i=>{
    const d=data[i]; if(!d)return '';
    const x=padX+(i+.5)*step;
    return `<text x="${x.toFixed(1)}" y="${h-7}" text-anchor="middle">${String(d.date.getDate()).padStart(2,'0')}/${String(d.date.getMonth()+1).padStart(2,'0')}</text>`;
  }).join('');
  return `<svg class="training-load-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolución de la carga diaria de las últimas seis semanas"><line x1="${padX}" y1="${padTop+plotH}" x2="${w-padX}" y2="${padTop+plotH}" class="axis"/>${bars}${labels}</svg>`;
}

function cardHtml(result){
  const ready=result.status==='ready';
  const t=tone(result.interpretation?.key);
  const habitual=ready?fmtUA(result.chronicLoad):'Datos insuficientes';
  const change=ready?fmtPct(result.changePct):'—';
  const explanation=ready
    ? result.interpretation?.label||'Comparación con tu carga habitual.'
    : `Aún no hay suficiente historial en la ventana de días 8–35 (${result.history?.chronicWeeksWithLoad||0}/${result.history?.requiredWeeksWithLoad||2} semanas con carga).`;
  return `<article id="player-training-load-card" class="dashboard-card dashboard-card-wide player-training-load-card tone-${t}">
    <div class="training-load-head"><div><span class="training-load-eyebrow"><i data-lucide="activity"></i> Monitorización individual</span><h3>Carga de entrenamiento</h3></div><span class="training-load-badge">ACWR uncoupled</span></div>
    <div class="training-load-metrics">
      <div><small>Carga últimos 7 días</small><strong>${fmtUA(result.acuteLoad)}</strong></div>
      <div><small>Carga habitual</small><strong>${habitual}</strong></div>
      <div><small>Cambio</small><strong>${change}</strong></div>
      <div><small>ACWR</small><strong>${fmtAcwr(result.acwr)}</strong></div>
    </div>
    <div class="training-load-interpretation"><span class="training-load-dot"></span><div><strong>${ready?esc(result.interpretation?.label):'Datos insuficientes'}</strong><p>${esc(explanation)}</p></div></div>
    <div class="training-load-chart-wrap"><div class="training-load-chart-title"><span>Evolución de carga diaria</span><small>Últimos 42 días · UA</small></div>${chartSvg(result.sessionLoads)}</div>
    <p class="training-load-footnote">La carga se calcula con duración de sesión × RPE individual. Este indicador describe cambios de carga y no predice lesiones.</p>
  </article>`;
}

function injectStyles(){
  if(document.getElementById('training-load-player-style'))return;
  const s=document.createElement('style');s.id='training-load-player-style';s.textContent=`
.player-training-load-card{padding:1.25rem!important;overflow:hidden}.training-load-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.training-load-eyebrow{display:flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b}.training-load-eyebrow svg{width:16px}.training-load-head h3{margin:.25rem 0 0;font-size:1.18rem;color:#0f172a}.training-load-badge{font-size:.72rem;font-weight:800;padding:.35rem .55rem;border-radius:999px;background:#f1f5f9;color:#475569;white-space:nowrap}.training-load-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin-top:1rem}.training-load-metrics>div{padding:.85rem;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.training-load-metrics small{display:block;color:#64748b;font-size:.72rem;margin-bottom:.3rem}.training-load-metrics strong{font-size:1.15rem;color:#0f172a}.training-load-interpretation{display:flex;align-items:flex-start;gap:.7rem;margin-top:.85rem;padding:.8rem .9rem;border-radius:12px;background:#f8fafc}.training-load-dot{width:10px;height:10px;border-radius:50%;margin-top:.35rem;flex:0 0 auto;background:#94a3b8}.tone-blue .training-load-dot{background:#3b82f6}.tone-green .training-load-dot{background:#22c55e}.tone-orange .training-load-dot{background:#f59e0b}.tone-red .training-load-dot{background:#ef4444}.training-load-interpretation strong{color:#0f172a}.training-load-interpretation p{margin:.15rem 0 0;color:#64748b;font-size:.8rem}.training-load-chart-wrap{margin-top:1rem;border-top:1px solid #e2e8f0;padding-top:.9rem}.training-load-chart-title{display:flex;justify-content:space-between;gap:1rem;align-items:center;font-size:.82rem;font-weight:800;color:#334155}.training-load-chart-title small{font-weight:500;color:#94a3b8}.training-load-chart{display:block;width:100%;height:auto;margin-top:.45rem}.training-load-chart rect{fill:currentColor;color:#64748b;opacity:.78}.training-load-chart .axis{stroke:#cbd5e1;stroke-width:1}.training-load-chart text{font-size:10px;fill:#94a3b8}.training-load-footnote{font-size:.72rem;color:#94a3b8;margin:.55rem 0 0}@media(max-width:700px){.training-load-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.training-load-head{align-items:center}.training-load-badge{display:none}}
  `;document.head.appendChild(s);
}

function dashboardContainer(){
  return document.getElementById('home-dashboard')||document.querySelector('#view-home-portal .dashboard-grid')||document.querySelector('#view-home-portal');
}

async function render(){
  if(rendering||!isPlayer()||!window.TrainingLoadEngine)return;
  const root=dashboardContainer(); if(!root)return;
  rendering=true;
  try{
    const identity=await window.VolleySupabase?.getIdentity?.();
    const pid=identity?.data?.player?.id;
    if(!pid)return;
    const result=await window.TrainingLoadEngine.calculatePlayer(pid,new Date());
    const signature=JSON.stringify([result.acuteLoad,result.chronicLoad,result.acwr,result.changePct,result.status,result.sessionLoads?.map(x=>[x.eventId,x.sessionLoad])]);
    if(signature===lastSignature&&document.getElementById('player-training-load-card'))return;
    lastSignature=signature;
    document.getElementById('player-training-load-card')?.remove();
    root.insertAdjacentHTML('beforeend',cardHtml(result));
    try{if(window.lucide)window.lucide.createIcons()}catch(_){}
  }catch(error){console.warn('[TrainingLoadPlayerDashboard]',error);}
  finally{rendering=false;}
}

function install(){
  injectStyles();
  const wait=()=>{
    if(!window.TrainingLoadEngine||!window.VolleySupabase){setTimeout(wait,180);return;}
    const base=window.renderHomeDashboard;
    if(typeof base==='function'&&!base.__trainingLoadPlayer){
      const wrapped=function(){const r=base.apply(this,arguments);setTimeout(()=>void render(),0);return r;};
      wrapped.__trainingLoadPlayer=true;window.renderHomeDashboard=wrapped;
    }
    void render();
    refreshTimer=setInterval(()=>{if(isPlayer())void render();},15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isPlayer())void render();});
    console.info('[TrainingLoadPlayerDashboard] ACWR-2 activo.');
  };
  setTimeout(wait,1800);
}

install();
})();