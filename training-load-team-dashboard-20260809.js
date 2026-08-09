(function(){
'use strict';

let currentSort='acwr';
let busy=false;

function isCoach(){
  try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}
}

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

function tone(metric){
  const key=metric?.interpretation?.key||'insufficient';
  return key;
}

function sortRows(rows){
  const copy=[...(rows||[])];
  const num=v=>Number.isFinite(Number(v))?Number(v):-Infinity;
  if(currentSort==='change') return copy.sort((a,b)=>num(b.changePct)-num(a.changePct));
  if(currentSort==='acute') return copy.sort((a,b)=>num(b.acuteLoad)-num(a.acuteLoad));
  if(currentSort==='name') return copy.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es'));
  return copy.sort((a,b)=>num(b.acwr)-num(a.acwr));
}

function ensureStyles(){
  if(document.getElementById('team-load-dashboard-css'))return;
  const s=document.createElement('style');s.id='team-load-dashboard-css';
  s.textContent=`
  .team-load-card{margin-top:1rem}.team-load-head{display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap}.team-load-controls{display:flex;gap:.5rem;align-items:center}.team-load-controls select{min-width:190px}.team-load-table-wrap{overflow:auto;margin-top:1rem}.team-load-table{width:100%;border-collapse:collapse;min-width:760px}.team-load-table th,.team-load-table td{padding:.8rem .7rem;border-bottom:1px solid #e2e8f0;text-align:left}.team-load-table th{font-size:.78rem;color:#64748b;background:#f8fafc;position:sticky;top:0}.team-load-player{display:flex;align-items:center;gap:.65rem}.team-load-badge{display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .55rem;border-radius:999px;font-size:.76rem;font-weight:800}.team-load-badge.insufficient{background:#f1f5f9;color:#475569}.team-load-badge.low{background:#dbeafe;color:#1d4ed8}.team-load-badge.similar{background:#dcfce7;color:#15803d}.team-load-badge.considerable{background:#ffedd5;color:#c2410c}.team-load-badge.high{background:#fee2e2;color:#b91c1c}.team-load-foot{margin-top:.8rem;font-size:.78rem;color:#64748b}.team-load-empty{padding:1rem;color:#64748b}
  `;document.head.appendChild(s);
}

function findCoachDashboardContainer(){
  const candidates=[
    document.getElementById('home-dashboard'),
    document.querySelector('#view-home-portal .dashboard-grid'),
    document.querySelector('#view-home-portal'),
    document.querySelector('.app-home-dashboard')
  ].filter(Boolean);
  return candidates[0]||null;
}

function renderShell(){
  if(!isCoach())return null;
  ensureStyles();
  const host=findCoachDashboardContainer();if(!host)return null;
  let card=document.getElementById('team-load-card');
  if(!card){
    card=document.createElement('article');card.id='team-load-card';card.className='dashboard-card dashboard-card-wide team-load-card';
    card.innerHTML=`<div class="team-load-head"><div><span class="dashboard-eyebrow"><i data-lucide="activity"></i> Carga del equipo</span><h3>ACWR y cambio de carga</h3></div><div class="team-load-controls"><label for="team-load-sort" style="font-size:.78rem;color:#64748b">Ordenar por</label><select id="team-load-sort" class="form-control"><option value="acwr">Mayor ACWR</option><option value="change">Mayor incremento</option><option value="acute">Mayor carga 7 días</option><option value="name">Nombre</option></select></div></div><div class="team-load-table-wrap"><div class="team-load-empty">Cargando datos de carga…</div></div><div class="team-load-foot">Indicador descriptivo de cambio de carga. No se interpreta como predictor de lesión.</div>`;
    host.appendChild(card);
    card.querySelector('#team-load-sort')?.addEventListener('change',e=>{currentSort=e.target.value;void refresh();});
  }
  if(window.lucide)try{window.lucide.createIcons();}catch(_){}
  return card;
}

function fmtNum(v){return Number.isFinite(Number(v))?Math.round(Number(v)).toLocaleString('es-ES'):'—';}
function fmtAcwr(v){return Number.isFinite(Number(v))?Number(v).toFixed(2).replace('.',','):'Datos insuficientes';}
function fmtChange(v){if(!Number.isFinite(Number(v)))return '—';const n=Math.round(Number(v));return `${n>0?'+':''}${n} %`;}

async function refresh(){
  if(!isCoach()||busy||!window.TrainingLoadEngine)return;
  const card=renderShell();if(!card)return;
  busy=true;
  try{
    const rows=sortRows(await window.TrainingLoadEngine.calculateTeam(new Date()));
    const wrap=card.querySelector('.team-load-table-wrap');
    if(!wrap)return;
    if(!rows.length){wrap.innerHTML='<div class="team-load-empty">No hay jugadoras con datos disponibles.</div>';return;}
    wrap.innerHTML=`<table class="team-load-table"><thead><tr><th>Jugadora</th><th>Carga 7d</th><th>Habitual</th><th>ACWR</th><th>Cambio</th><th>Interpretación</th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="team-load-player"><strong>${esc(r.name)}</strong>${r.dorsal!=null?`<small>#${esc(r.dorsal)}</small>`:''}</div></td><td>${fmtNum(r.acuteLoad)} UA</td><td>${r.status==='ready'?`${fmtNum(r.chronicLoad)} UA`:'Datos insuficientes'}</td><td><strong>${fmtAcwr(r.acwr)}</strong></td><td>${fmtChange(r.changePct)}</td><td><span class="team-load-badge ${tone(r)}">${esc(r.interpretation?.label||'Datos insuficientes')}</span></td></tr>`).join('')}</tbody></table>`;
  }catch(error){
    console.warn('[TeamLoadDashboard]',error);
    const wrap=card.querySelector('.team-load-table-wrap');if(wrap)wrap.innerHTML='<div class="team-load-empty">No se pudieron cargar los datos de carga del equipo.</div>';
  }finally{busy=false;}
}

function install(){
  const wait=()=>{
    if(!window.TrainingLoadEngine||typeof window.renderHomeDashboard!=='function'){setTimeout(wait,200);return;}
    const base=window.renderHomeDashboard;
    if(!base.__teamLoadWrapped){
      const wrapped=function(){const r=base.apply(this,arguments);if(isCoach())setTimeout(()=>{renderShell();void refresh();},0);return r;};
      wrapped.__teamLoadWrapped=true;window.renderHomeDashboard=wrapped;
    }
    if(isCoach()){renderShell();void refresh();}
    setInterval(()=>{if(isCoach())void refresh();},15000);
    console.info('[TeamLoadDashboard] ACWR-3 cargado.');
  };
  wait();
}

install();
})();
