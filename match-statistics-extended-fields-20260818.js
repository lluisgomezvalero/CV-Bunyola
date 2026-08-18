(function(){
'use strict';

const FLAG='__matchStatisticsExtendedFields20260818';
if(window[FLAG])return;
window[FLAG]=true;

const EXTRA_KEYS=['recExclamPct','recTotal','attackTotal','serveErrorPct','serveTotal','blockTotal'];
const EXTRA_VISIBILITY_ORDER=[
  'recPerfectPct','recExclamPct','recErrorPct','recTotal',
  'attackEfficiencyPct','attackTotal','attackErrors',
  'aces','serveErrorPct','serveTotal',
  'bloqueos','blockTotal','ownErrors','opponentErrors'
];

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function findMatch(id){return (state()?.events||[]).find(e=>String(e?.id)===String(id));}
function numberText(value,{percent=false}={}){
  const n=Number(value);if(!Number.isFinite(n))return '—';
  return percent?`${n.toFixed(1)}%`:String(Math.max(0,Math.round(n)));
}
function serveErrorPercent(stats){
  const direct=Number(stats?.serveErrorPct);
  if(Number.isFinite(direct))return Math.max(0,Math.min(100,direct));
  const total=Number(stats?.serveTotal);const errors=Number(stats?.serveErrors??stats?.saquesError);
  if(Number.isFinite(total)&&total>0&&Number.isFinite(errors))return Math.max(0,Math.min(100,(errors/total)*100));
  return null;
}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function normalizedVisible(stats){
  const raw=Array.isArray(stats?.visibleToPlayers)?stats.visibleToPlayers.map(String):[];
  const set=new Set(raw);
  if(set.has('serveErrors')){set.delete('serveErrors');set.add('serveErrorPct');}
  return set;
}

function ensureStyles(){
  if(document.getElementById('match-statistics-extended-fields-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-extended-fields-style';
  style.textContent=`
    #form-match-stats .extended-stat-field label{gap:.22rem!important}
    #form-match-stats .extended-stat-note{display:block;margin-top:.25rem;font-size:.6rem;line-height:1.25;color:#64748b}
    #form-match-stats .stats-row-full>.form-group{grid-column:1/-1!important}
    #stats-matches-list .stats-extended-card-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem;margin:.7rem 0 .15rem;padding-top:.7rem;border-top:1px solid #f1f5f9}
    #stats-matches-list .stats-extended-card-item{min-width:0;padding:.55rem .45rem;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;text-align:center}
    #stats-matches-list .stats-extended-card-item strong{display:block;font-size:.82rem;line-height:1.1;color:#0f172a}
    #stats-matches-list .stats-extended-card-item span{display:block;margin-top:.16rem;font-size:.59rem;line-height:1.15;color:#64748b}

    #modal-player-match-stats .modal-content{max-width:560px!important}
    #modal-player-match-stats .player-stats-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:.85rem .9rem;margin-bottom:.9rem;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff}
    #modal-player-match-stats .player-stats-hero>div{min-width:0}
    #modal-player-match-stats .player-stats-hero span{display:block;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b}
    #modal-player-match-stats .player-stats-hero small{display:block;margin-top:.2rem;font-size:.69rem;line-height:1.3;color:#64748b}
    #modal-player-match-stats .player-stats-hero strong{flex:0 0 auto;font-family:var(--font-heading);font-size:1rem;color:#0f172a;text-align:right}
    #modal-player-match-stats .player-stat-section{margin-top:.85rem}
    #modal-player-match-stats .player-stat-section h4{display:flex;align-items:center;gap:.4rem;margin:0 0 .45rem;font-family:var(--font-heading);font-size:.78rem;font-weight:850;letter-spacing:.02em;text-transform:uppercase;color:#334155}
    #modal-player-match-stats .player-stat-section h4::before{content:'';width:7px;height:7px;border-radius:50%;background:#d97706;flex:0 0 auto}
    #modal-player-match-stats .player-stat-group-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.48rem}
    #modal-player-match-stats .player-stat-metric{display:flex;align-items:center;gap:.58rem;min-width:0;padding:.68rem .72rem;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
    #modal-player-match-stats .player-stat-metric .metric-icon{display:grid;place-items:center;flex:0 0 31px;width:31px;height:31px;border-radius:9px;background:#f8fafc;font-size:.9rem}
    #modal-player-match-stats .player-stat-metric>div{min-width:0}
    #modal-player-match-stats .player-stat-metric strong{display:block;font-size:.92rem;line-height:1.05;color:#0f172a;font-variant-numeric:tabular-nums}
    #modal-player-match-stats .player-stat-metric small{display:block;margin-top:.14rem;font-size:.63rem;line-height:1.18;color:#64748b;overflow-wrap:anywhere}
    #modal-player-match-stats .player-stats-empty{padding:1rem;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;color:#64748b;text-align:center;font-size:.76rem;line-height:1.4}
    @media(max-width:700px){#stats-matches-list .stats-extended-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:560px){
      #modal-player-match-stats .modal-content{width:min(94vw,560px)!important}
      #modal-player-match-stats .modal-body{padding:.85rem!important}
      #modal-player-match-stats .player-stats-hero{padding:.72rem .75rem}
      #modal-player-match-stats .player-stat-group-grid{gap:.4rem}
      #modal-player-match-stats .player-stat-metric{padding:.6rem .58rem;gap:.48rem}
      #modal-player-match-stats .player-stat-metric .metric-icon{flex-basis:28px;width:28px;height:28px}
      #modal-player-match-stats .player-stat-metric strong{font-size:.86rem}
      #modal-player-match-stats .player-stat-metric small{font-size:.59rem}
    }
    @media(max-width:420px){
      #stats-matches-list .stats-extended-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      #modal-player-match-stats .player-stats-hero{align-items:flex-start}
    }
  `;
  document.head.appendChild(style);
}

function makeGroup(id,label,{percent=false,note=''}={}){
  let input=document.getElementById(id);
  if(input)return input.closest('.form-group');
  const group=document.createElement('div');
  group.className='form-group extended-stat-field';
  group.innerHTML=`<label for="${id}">${label}</label><input type="number" id="${id}" class="form-control" min="0" ${percent?'max="100" step="0.1"':'step="1"'} inputmode="${percent?'decimal':'numeric'}">${note?`<small class="extended-stat-note">${note}</small>`:''}`;
  return group;
}
function makeRow(){const row=document.createElement('div');row.className='form-row extended-stat-row';return row;}
function cleanupEmptyRows(form){form.querySelectorAll('.form-row').forEach(row=>{if(!row.querySelector('.form-group'))row.remove();});}

function arrangeFormFields(){
  const form=document.getElementById('form-match-stats');if(!form)return;
  ensureStyles();

  const recHeading=form.querySelector('[data-stats-section="reception"]');
  const attackHeading=form.querySelector('[data-stats-section="attack"]');
  const serveHeading=form.querySelector('[data-stats-section="serve"]');
  const blockHeading=form.querySelector('[data-stats-section="errors"]');
  if(!recHeading||!attackHeading||!serveHeading||!blockHeading)return;

  const recPerfect=document.getElementById('stats-rec-perfect-pct')?.closest('.form-group');
  const recError=document.getElementById('stats-rec-error-pct')?.closest('.form-group');
  if(recPerfect&&recError&&!form.querySelector('[data-extended-row="reception-1"]')){
    recPerfect.querySelector('label').textContent='% recepción perfecta (#,+)';
    recError.querySelector('label').textContent='% error recepción (-)';
    const row1=makeRow();row1.dataset.extendedRow='reception-1';
    const row2=makeRow();row2.dataset.extendedRow='reception-2';
    row1.append(recPerfect,makeGroup('stats-rec-exclam-pct','% recepción exclamativa (!)',{percent:true,note:'Recepción que no permite jugar primer tiempo con la central.'}));
    row2.append(recError,makeGroup('stats-rec-total','Número total de recepciones'));
    recHeading.after(row1,row2);
  }

  const attackEff=document.getElementById('stats-attack-efficiency')?.closest('.form-group');
  const attackErr=document.getElementById('stats-attack-errors')?.closest('.form-group');
  if(attackEff&&attackErr&&!form.querySelector('[data-extended-row="attack-1"]')){
    const row1=makeRow();row1.dataset.extendedRow='attack-1';
    const row2=makeRow();row2.dataset.extendedRow='attack-2';row2.classList.add('stats-row-full');
    row1.append(attackEff,makeGroup('stats-attack-total','Número total de ataques'));
    row2.append(attackErr);
    attackHeading.after(row1,row2);
  }

  const aces=document.getElementById('stats-aces')?.closest('.form-group');
  const serveErr=document.getElementById('stats-serve-errors')?.closest('.form-group');
  if(aces&&serveErr&&!form.querySelector('[data-extended-row="serve-1"]')){
    const serveInput=document.getElementById('stats-serve-errors');
    const serveLabel=serveErr.querySelector('label');
    if(serveLabel)serveLabel.textContent='% error de saque';
    if(serveInput){serveInput.max='100';serveInput.step='0.1';serveInput.inputMode='decimal';}
    const row1=makeRow();row1.dataset.extendedRow='serve-1';
    const row2=makeRow();row2.dataset.extendedRow='serve-2';row2.classList.add('stats-row-full');
    row1.append(aces,serveErr);
    row2.append(makeGroup('stats-serve-total','Número total de saques'));
    serveHeading.after(row1,row2);
  }

  const blocks=document.getElementById('stats-bloqueos')?.closest('.form-group');
  const own=document.getElementById('stats-own-errors')?.closest('.form-group');
  const opp=document.getElementById('stats-opponent-errors')?.closest('.form-group');
  if(blocks&&own&&opp&&!form.querySelector('[data-extended-row="block-1"]')){
    const row1=makeRow();row1.dataset.extendedRow='block-1';
    const row2=makeRow();row2.dataset.extendedRow='block-2';
    row1.append(blocks,makeGroup('stats-block-total','Número total de bloqueos'));
    row2.append(own,opp);
    blockHeading.after(row1,row2);
  }

  cleanupEmptyRows(form);
}

function makeVisibility(key,text){
  const label=document.createElement('label');
  label.innerHTML=`<input type="checkbox" data-stats-visible="${key}"> ${text}`;
  return label;
}
function ensureVisibilityOptions(){
  const grid=document.querySelector('#form-match-stats .stats-visibility-grid');if(!grid)return;
  const legacyServe=grid.querySelector('[data-stats-visible="serveErrors"]');
  if(legacyServe)legacyServe.dataset.statsVisible='serveErrorPct';
  const additions={
    recExclamPct:'Recepción exclamativa (!)',recTotal:'Total recepciones',attackTotal:'Total ataques',serveErrorPct:'% error de saque',serveTotal:'Total saques',blockTotal:'Total bloqueos'
  };
  Object.entries(additions).forEach(([key,text])=>{if(!grid.querySelector(`[data-stats-visible="${key}"]`))grid.appendChild(makeVisibility(key,text));});
  const relabel={recPerfectPct:'Recepción perfecta (#,+)',recErrorPct:'Error recepción (-)',attackEfficiencyPct:'Efectividad de ataque',attackErrors:'Error de ataque',aces:'Aces',serveErrorPct:'% error de saque',bloqueos:'Bloqueos punto',ownErrors:'Error nuestro',opponentErrors:'Error rival'};
  Object.entries(relabel).forEach(([key,text])=>{
    const input=grid.querySelector(`[data-stats-visible="${key}"]`);const label=input?.closest('label');
    if(label){const checked=input.checked;label.textContent='';label.append(input,document.createTextNode(` ${text}`));input.checked=checked;}
  });
  EXTRA_VISIBILITY_ORDER.forEach(key=>{const input=grid.querySelector(`[data-stats-visible="${key}"]`);const label=input?.closest('label');if(label)grid.appendChild(label);});
}

function setInput(id,value){const el=document.getElementById(id);if(el)el.value=value??'';}
window.hydrateExtendedMatchStatsForm=function(_matchId,stats){
  arrangeFormFields();ensureVisibilityOptions();
  const s=stats||{};
  setInput('stats-rec-exclam-pct',s.recExclamPct);
  setInput('stats-rec-total',s.recTotal);
  setInput('stats-attack-total',s.attackTotal);
  const servePct=serveErrorPercent(s);
  setInput('stats-serve-errors',servePct==null?'':Number(servePct).toFixed(1));
  setInput('stats-serve-total',s.serveTotal);
  setInput('stats-block-total',s.blockTotal);
  const visible=normalizedVisible(s);
  EXTRA_KEYS.forEach(key=>{const cb=document.querySelector(`[data-stats-visible="${key}"]`);if(cb)cb.checked=Array.isArray(s.visibleToPlayers)?visible.has(key):true;});
};

function extractMatchId(card){
  const btn=[...card.querySelectorAll('[onclick]')].find(el=>String(el.getAttribute('onclick')||'').includes('openMatchStatsModal'));
  const text=btn?.getAttribute('onclick')||'';const match=text.match(/openMatchStatsModal\(['\"]([^'\"]+)['\"]\)/);return match?.[1]||null;
}
function replaceErrorNotation(root){
  root?.querySelectorAll('h3,h4,p,span,strong').forEach(el=>{
    if(el.children.length)return;
    const text=el.textContent||'';
    if(text.includes('Error en recepción (=)'))el.textContent=text.replace('Error en recepción (=)','Error en recepción (-)');
    else if(text.includes('Error Recepción (=)'))el.textContent=text.replace('Error Recepción (=)','Error Recepción (-)');
    else if(text.includes('% Error Recepción (=)'))el.textContent=text.replace('% Error Recepción (=)','% Error Recepción (-)');
  });
}
function paintServeErrorSummary(){
  const value=document.getElementById('stats-total-serve-errors');if(!value)return;
  const values=(state()?.events||[]).map(event=>event?.stats?serveErrorPercent(event.stats):null).filter(v=>Number.isFinite(v));
  value.textContent=values.length?`${(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1)}%`:'—';
  const label=value.parentElement?.querySelector('span');if(label)label.textContent='% error saque';
}
function paintServeErrorOnCard(card,stats){
  const pct=serveErrorPercent(stats);
  card.querySelectorAll('.match-extra-metrics>div').forEach(item=>{
    const label=item.querySelector('span');
    if(!label||!/error\s*(de\s*)?saque/i.test(label.textContent||''))return;
    const strong=item.querySelector('strong');if(strong)strong.textContent=numberText(pct,{percent:true});
    label.textContent='% error saque';
  });
}
function enhanceCoachCards(){
  const list=document.getElementById('stats-matches-list');if(!list)return;
  replaceErrorNotation(document.getElementById('coach-stats-charts'));replaceErrorNotation(list);paintServeErrorSummary();
  list.querySelectorAll('.match-stat-card').forEach(card=>{
    const id=extractMatchId(card);const stats=findMatch(id)?.stats;if(!stats)return;
    paintServeErrorOnCard(card,stats);
    if(card.querySelector('.stats-extended-card-grid'))return;
    const body=card.querySelector('.match-stat-body');if(!body)return;
    const grid=document.createElement('div');grid.className='stats-extended-card-grid';
    const items=[
      ['Recepción !',numberText(stats.recExclamPct,{percent:true})],['Total recepciones',numberText(stats.recTotal)],['Total ataques',numberText(stats.attackTotal)],['Total saques',numberText(stats.serveTotal)],['Total bloqueos',numberText(stats.blockTotal)]
    ];
    grid.innerHTML=items.map(([label,value])=>`<div class="stats-extended-card-item"><strong>${value}</strong><span>${label}</span></div>`).join('');
    body.appendChild(grid);
  });
}
window.enhanceCoachMatchStatistics=enhanceCoachCards;

function playerMetricValue(stats,key){
  const direct=Number(stats?.[key]);
  if(key==='serveErrorPct')return serveErrorPercent(stats);
  if(key==='recPerfectPct'&&Number.isFinite(direct))return direct;
  if(key==='recPerfectPct'&&Number(stats?.recTotal)>0)return (Number(stats?.recPerfect||0)/Number(stats.recTotal))*100;
  if(key==='recErrorPct'&&Number.isFinite(direct))return direct;
  if(key==='recErrorPct'&&Number(stats?.recTotal)>0)return (Number(stats?.recError||0)/Number(stats.recTotal))*100;
  return Number.isFinite(direct)?direct:null;
}
const PLAYER_METRICS={
  recPerfectPct:{label:'Recepción perfecta (#,+)',icon:'✅',percent:true},
  recExclamPct:{label:'Recepción exclamativa (!)',icon:'⚠️',percent:true},
  recErrorPct:{label:'Error de recepción (-)',icon:'❌',percent:true},
  recTotal:{label:'Total de recepciones',icon:'🔢'},
  attackEfficiencyPct:{label:'Efectividad de ataque',icon:'📈',percent:true},
  attackTotal:{label:'Total de ataques',icon:'🔢'},
  attackErrors:{label:'Errores de ataque',icon:'❌'},
  aces:{label:'Aces',icon:'⚡'},
  serveErrorPct:{label:'Error de saque',icon:'❌',percent:true},
  serveTotal:{label:'Total de saques',icon:'🔢'},
  bloqueos:{label:'Bloqueos punto',icon:'🧱'},
  blockTotal:{label:'Total de bloqueos',icon:'🔢'},
  ownErrors:{label:'Errores propios',icon:'🔴'},
  opponentErrors:{label:'Errores del rival',icon:'🟢'}
};
const PLAYER_GROUPS=[
  ['Recepción',['recPerfectPct','recExclamPct','recErrorPct','recTotal']],
  ['Ataque',['attackEfficiencyPct','attackTotal','attackErrors']],
  ['Saque',['aces','serveErrorPct','serveTotal']],
  ['Bloqueo',['bloqueos','blockTotal']],
  ['Balance de errores',['ownErrors','opponentErrors']]
];
function renderPlayerMetric(stats,key){
  const def=PLAYER_METRICS[key];if(!def)return'';
  const value=playerMetricValue(stats,key);
  return `<article class="player-stat-metric"><span class="metric-icon" aria-hidden="true">${def.icon}</span><div><strong>${numberText(value,{percent:def.percent})}</strong><small>${def.label}</small></div></article>`;
}
window.enhancePlayerMatchStatsModal=function(matchId,stats){
  const body=document.getElementById('player-match-stats-body');if(!body||!stats)return;
  const match=findMatch(matchId)||{};const visible=normalizedVisible(stats);
  const sections=PLAYER_GROUPS.map(([title,keys])=>{
    const shown=keys.filter(key=>visible.has(key));if(!shown.length)return'';
    return `<section class="player-stat-section"><h4>${title}</h4><div class="player-stat-group-grid">${shown.map(key=>renderPlayerMetric(stats,key)).join('')}</div></section>`;
  }).join('');
  const dateLocation=[match.date,match.location].filter(Boolean).map(escapeHtml).join(' · ');
  body.innerHTML=`<div class="player-stats-hero"><div><span>Resumen del partido</span><small>${dateLocation||'Estadísticas publicadas por el cuerpo técnico'}</small></div><strong>${escapeHtml(match.result||'Finalizado')}</strong></div>${sections||'<div class="player-stats-empty">El cuerpo técnico todavía no ha publicado indicadores para este partido.</div>'}`;
};

function boot(){
  ensureStyles();
  let tries=0;const timer=setInterval(()=>{tries++;arrangeFormFields();ensureVisibilityOptions();enhanceCoachCards();if(tries>80)clearInterval(timer);},125);
  const list=document.getElementById('stats-matches-list');if(list){new MutationObserver(()=>setTimeout(enhanceCoachCards,0)).observe(list,{childList:true,subtree:true});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
