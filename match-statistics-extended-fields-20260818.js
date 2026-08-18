(function(){
'use strict';

const FLAG='__matchStatisticsExtendedFields20260818';
if(window[FLAG])return;
window[FLAG]=true;

const EXTRA_KEYS=['recExclamPct','recTotal','attackTotal','serveTotal','blockTotal'];
const EXTRA_VISIBILITY_ORDER=[
  'recPerfectPct','recExclamPct','recErrorPct','recTotal',
  'attackEfficiencyPct','attackTotal','attackErrors',
  'aces','serveTotal','serveErrors',
  'bloqueos','blockTotal','ownErrors','opponentErrors'
];

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function findMatch(id){return (state()?.events||[]).find(e=>String(e?.id)===String(id));}
function numberText(value,{percent=false}={}){
  const n=Number(value);if(!Number.isFinite(n))return '—';
  return percent?`${n.toFixed(1)}%`:String(Math.max(0,Math.round(n)));
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
    #modal-player-match-stats .player-extended-stats{margin-top:.9rem;padding-top:.85rem;border-top:1px solid #e2e8f0}
    #modal-player-match-stats .player-extended-stats h4{margin:0 0 .55rem;font-family:var(--font-heading);font-size:.85rem;color:#334155}
    #modal-player-match-stats .player-extended-stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}
    #modal-player-match-stats .player-extended-stat{padding:.65rem;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc}
    #modal-player-match-stats .player-extended-stat strong{display:block;font-size:.95rem;color:#0f172a}
    #modal-player-match-stats .player-extended-stat span{display:block;margin-top:.12rem;font-size:.68rem;line-height:1.2;color:#64748b}
    @media(max-width:700px){#stats-matches-list .stats-extended-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:420px){#stats-matches-list .stats-extended-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
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
    const row1=makeRow();row1.dataset.extendedRow='serve-1';
    const row2=makeRow();row2.dataset.extendedRow='serve-2';row2.classList.add('stats-row-full');
    row1.append(aces,makeGroup('stats-serve-total','Número total de saques'));
    row2.append(serveErr);
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
  const additions={
    recExclamPct:'Recepción exclamativa (!)',recTotal:'Total recepciones',attackTotal:'Total ataques',serveTotal:'Total saques',blockTotal:'Total bloqueos'
  };
  Object.entries(additions).forEach(([key,text])=>{if(!grid.querySelector(`[data-stats-visible="${key}"]`))grid.appendChild(makeVisibility(key,text));});
  const relabel={recPerfectPct:'Recepción perfecta (#,+)',recErrorPct:'Error recepción (-)',attackEfficiencyPct:'Efectividad de ataque',attackErrors:'Error de ataque',aces:'Aces',serveErrors:'Error de saque',bloqueos:'Bloqueos punto',ownErrors:'Error nuestro',opponentErrors:'Error rival'};
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
  setInput('stats-serve-total',s.serveTotal);
  setInput('stats-block-total',s.blockTotal);
  const visible=Array.isArray(s.visibleToPlayers)?new Set(s.visibleToPlayers):null;
  EXTRA_KEYS.forEach(key=>{const cb=document.querySelector(`[data-stats-visible="${key}"]`);if(cb)cb.checked=visible?visible.has(key):true;});
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
function enhanceCoachCards(){
  const list=document.getElementById('stats-matches-list');if(!list)return;
  replaceErrorNotation(document.getElementById('coach-stats-charts'));replaceErrorNotation(list);
  list.querySelectorAll('.match-stat-card').forEach(card=>{
    if(card.querySelector('.stats-extended-card-grid'))return;
    const id=extractMatchId(card);const stats=findMatch(id)?.stats;if(!stats)return;
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

window.enhancePlayerMatchStatsModal=function(_matchId,stats){
  const body=document.getElementById('player-match-stats-body');if(!body||!stats)return;
  replaceErrorNotation(body);body.querySelector('.player-extended-stats')?.remove();
  const visible=new Set(Array.isArray(stats.visibleToPlayers)?stats.visibleToPlayers:[]);
  const defs=[
    ['recExclamPct','Recepción exclamativa (!)',numberText(stats.recExclamPct,{percent:true})],
    ['recTotal','Total recepciones',numberText(stats.recTotal)],
    ['attackTotal','Total ataques',numberText(stats.attackTotal)],
    ['serveTotal','Total saques',numberText(stats.serveTotal)],
    ['blockTotal','Total bloqueos',numberText(stats.blockTotal)]
  ].filter(([key])=>visible.has(key));
  if(!defs.length)return;
  const section=document.createElement('section');section.className='player-extended-stats';
  section.innerHTML=`<h4>Volumen y recepción</h4><div class="player-extended-stats-grid">${defs.map(([,label,value])=>`<div class="player-extended-stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div>`;
  body.appendChild(section);
};

function boot(){
  ensureStyles();
  let tries=0;const timer=setInterval(()=>{tries++;arrangeFormFields();ensureVisibilityOptions();enhanceCoachCards();if(tries>80)clearInterval(timer);},125);
  const list=document.getElementById('stats-matches-list');if(list){new MutationObserver(()=>setTimeout(enhanceCoachCards,0)).observe(list,{childList:true,subtree:true});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
