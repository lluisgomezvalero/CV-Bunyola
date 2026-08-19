(function(){
'use strict';

const FLAG='__matchStatisticsCoachAppUx20260819';
if(window[FLAG])return;
window[FLAG]=true;

let deleting=false;
let previousEnhancer=null;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function db(){return window.VolleySupabase?.getClient?.()||null;}
function toast(message,type){try{if(typeof showToast==='function')showToast(message,type);}catch(_){}}
function isUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));}
function findMatch(id){return (state()?.events||[]).find(evt=>[evt?.id,evt?.legacyId,evt?.legacy_id,evt?.supabaseId,evt?.supabase_id].filter(Boolean).some(value=>String(value)===String(id)))||null;}
function resultOf(match){return String(match?.result||match?.rawPayload?.result||'').trim();}
function eventKey(match){return String(match?.id||match?.legacyId||match?.legacy_id||match?.supabaseId||match?.supabase_id||'');}
function numberValue(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function extractMatchId(card){
  if(!card)return null;
  const source=[...card.querySelectorAll('[onclick]')].map(el=>el.getAttribute('onclick')||'').find(text=>/(openMatchStatsModal|quickPublishMatchStats|archiveMatchStats)/.test(text))||'';
  const match=source.match(/(?:openMatchStatsModal|quickPublishMatchStats|archiveMatchStats)\(['\"]([^'\"]+)['\"]\)/);
  return match?.[1]||card.dataset.matchId||null;
}
function parseRound(value){
  const match=String(value||'').match(/(\d{1,2})/);
  const round=match?Number(match[1]):null;
  return Number.isInteger(round)&&round>0&&round<=99?round:null;
}
function statusFromCard(card){
  const badge=card?.querySelector('.publication-badge');
  if(badge?.classList.contains('is-published'))return {key:'published',label:'Publicada'};
  if(badge?.classList.contains('is-archived'))return {key:'archived',label:'Archivada'};
  if(badge?.classList.contains('is-draft'))return {key:'draft',label:'Borrador'};
  const text=String(badge?.textContent||'').trim();
  return {key:'empty',label:text||'Sin publicar'};
}
function roundLabel(card,match,index=0){
  const badge=card?.querySelector('.match-round-badge');
  const badgeText=String(badge?.textContent||'').trim();
  const type=String(match?.type||'');
  if(type==='Amistoso')return 'Amistoso';
  if(type==='Torneo')return 'Torneo';
  const raw=match?.round??match?.jornada??match?.matchday??match?.rawPayload?.round??match?.rawPayload?.jornada??parseRound(badgeText);
  const parsed=parseRound(raw);
  if(parsed)return `Jornada ${parsed}`;
  if(/^jornada/i.test(badgeText)&&!badgeText.includes('?'))return badgeText;
  return type==='Partido'?`Jornada ${index+1}`:(badgeText||'Partido');
}

function ensureStyles(){
  if(document.getElementById('match-statistics-coach-app-ux-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-coach-app-ux-style';
  style.textContent=`
    #view-stats{--coach-stats-border:#e6ebf2;--coach-stats-muted:#64748b;--coach-stats-ink:#0f172a;--coach-positive:#15803d;--coach-negative:#dc2626;--coach-info:#2563eb;--coach-warn:#d97706}
    #view-stats #coach-stats-app-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin:0 0 .9rem;padding:1rem 1.05rem;border:1px solid var(--coach-stats-border);border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.045)}
    #view-stats #coach-stats-app-hero>div{min-width:0}
    #view-stats #coach-stats-app-hero .coach-stats-eyebrow{display:block;margin-bottom:.18rem;font-size:.64rem;font-weight:850;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8}
    #view-stats #coach-stats-app-hero h2{margin:0;font-family:var(--font-heading);font-size:1.08rem;line-height:1.15;color:var(--coach-stats-ink)}
    #view-stats #coach-stats-app-hero p{margin:.28rem 0 0;font-size:.7rem;line-height:1.3;color:var(--coach-stats-muted)}
    #view-stats #coach-stats-app-hero .coach-stats-record{flex:0 0 auto;text-align:right}
    #view-stats #coach-stats-app-hero .coach-stats-record strong{display:block;font-family:var(--font-heading);font-size:1.3rem;line-height:1;color:var(--coach-stats-ink);font-variant-numeric:tabular-nums}
    #view-stats #coach-stats-app-hero .coach-stats-record span{display:block;margin-top:.22rem;font-size:.62rem;font-weight:750;color:var(--coach-stats-muted)}

    #view-stats #stats-priority-block{border:1px solid var(--coach-stats-border)!important;border-radius:18px!important;background:#fff!important;box-shadow:0 8px 24px rgba(15,23,42,.04)!important}
    #view-stats #stats-priority-block .stats-priority-heading strong{font-size:1rem!important}
    #view-stats #stats-priority-block .stats-priority-heading span{font-size:.68rem!important}
    #view-stats #stats-priority-grid .stats-summary-icon,
    #view-stats #coach-stats-summary .stats-summary-icon,
    #view-stats #coach-stats-charts .card-header i{display:none!important}
    #view-stats #stats-priority-grid .stats-summary-item{position:relative;min-height:88px!important;padding:.78rem .78rem .78rem .9rem!important;border:1px solid var(--coach-stats-border)!important;background:#fbfcfe!important;border-radius:13px!important;overflow:hidden}
    #view-stats #stats-priority-grid .stats-summary-item::before{content:'';position:absolute;inset:.7rem auto .7rem .35rem;width:3px;border-radius:999px;background:#cbd5e1}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-positive::before{background:var(--coach-positive)}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-negative::before{background:var(--coach-negative)}
    #view-stats #stats-priority-grid .stats-summary-item.coach-tone-info::before{background:var(--coach-info)}
    #view-stats #stats-priority-grid .stats-summary-item strong{font-size:1.08rem!important}

    #view-stats #coach-stats-season-more{margin:0 0 1rem;border:1px solid var(--coach-stats-border);border-radius:16px;background:#fff;overflow:hidden}
    #view-stats #coach-stats-season-more>summary{display:flex;align-items:center;justify-content:space-between;gap:.8rem;min-height:52px;padding:.75rem .9rem;cursor:pointer;list-style:none;font-size:.78rem;font-weight:850;color:#334155}
    #view-stats #coach-stats-season-more>summary::-webkit-details-marker{display:none}
    #view-stats #coach-stats-season-more>summary::after{content:'+';font-size:1.15rem;line-height:1;color:#94a3b8;font-weight:500}
    #view-stats #coach-stats-season-more[open]>summary::after{content:'–'}
    #view-stats #coach-stats-season-more .coach-season-more-body{padding:0 .8rem .8rem;border-top:1px solid #f1f5f9}
    #view-stats #coach-stats-season-more #coach-stats-summary{margin:.75rem 0 0!important}
    #view-stats #coach-stats-summary .stats-summary-item{min-height:76px!important;padding:.68rem!important;border:1px solid var(--coach-stats-border)!important;border-radius:12px!important;background:#fbfcfe!important;box-shadow:none!important}
    #view-stats #coach-stats-summary .stats-summary-item strong{font-size:.98rem!important}
    #view-stats #coach-stats-summary .stats-summary-item span{font-size:.64rem!important}

    #view-stats #coach-stats-charts{display:grid!important;grid-template-columns:1fr!important;gap:.75rem!important;margin-bottom:1rem!important;overflow:visible!important}
    #view-stats #coach-stats-charts .coach-league-chart{margin:0!important;padding:.88rem .9rem .72rem!important;border:1px solid var(--coach-stats-border)!important;border-radius:17px!important;background:#fff!important;box-shadow:0 8px 24px rgba(15,23,42,.04)!important;overflow:hidden!important}
    #view-stats .coach-league-chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;margin-bottom:.55rem}
    #view-stats .coach-league-chart-head>div{min-width:0}
    #view-stats .coach-league-chart-head span{display:block;font-size:.6rem;font-weight:850;letter-spacing:.055em;text-transform:uppercase;color:#94a3b8}
    #view-stats .coach-league-chart-head h3{margin:.12rem 0 0;font-family:var(--font-heading);font-size:.9rem;line-height:1.18;color:var(--coach-stats-ink)}
    #view-stats .coach-league-chart-head strong{flex:0 0 auto;font-size:.7rem;color:#64748b;font-variant-numeric:tabular-nums}
    #view-stats .coach-league-chart-body{display:grid;grid-template-columns:27px minmax(0,1fr);gap:.34rem;min-width:0}
    #view-stats .coach-chart-axis{position:relative;height:170px;font-size:.52rem;color:#94a3b8;font-variant-numeric:tabular-nums}
    #view-stats .coach-chart-axis span{position:absolute;right:0;transform:translateY(50%)}
    #view-stats .coach-chart-axis .y100{top:-.1rem;transform:none}
    #view-stats .coach-chart-axis .y50{bottom:50%}
    #view-stats .coach-chart-axis .y0{bottom:18px}
    #view-stats .coach-bars-area{position:relative;height:188px;min-width:0;overflow:hidden;border-bottom:1px solid #eef2f7;background:linear-gradient(to bottom,transparent 0,transparent calc(50% - .5px),#f1f5f9 calc(50% - .5px),#f1f5f9 calc(50% + .5px),transparent calc(50% + .5px))}
    #view-stats .coach-bars-grid{position:absolute;inset:0 0 0 0;display:grid;grid-template-columns:repeat(var(--journeys),minmax(0,1fr));gap:var(--bar-gap);align-items:stretch;min-width:0}
    #view-stats .coach-bar-col{min-width:0;display:grid;grid-template-rows:1fr 18px;align-items:end}
    #view-stats .coach-bar-track{position:relative;height:100%;min-width:0;display:flex;align-items:flex-end;justify-content:center}
    #view-stats .coach-bar{position:relative;width:min(64%,var(--bar-max));min-width:3px;height:calc(var(--value) * 1%);max-height:100%;border-radius:5px 5px 2px 2px;background:var(--bar-color);opacity:.88;transition:opacity .16s ease}
    #view-stats .coach-bar.is-empty{height:2px!important;background:#dbe3ec;opacity:.8}
    #view-stats .coach-bar-value{position:absolute;left:50%;bottom:calc(var(--value) * 1% + 4px);transform:translateX(-50%);font-size:.52rem;font-weight:800;color:#475569;white-space:nowrap;font-variant-numeric:tabular-nums}
    #view-stats .coach-league-chart.is-dense .coach-bar-value{display:none}
    #view-stats .coach-bar-label{display:flex;align-items:flex-end;justify-content:center;height:18px;font-size:.51rem;font-weight:750;color:#64748b;font-variant-numeric:tabular-nums;white-space:nowrap}
    #view-stats .coach-league-chart.is-very-dense .coach-bar-label{font-size:.44rem}
    #view-stats .coach-chart-empty{padding:.8rem;border:1px dashed #d7dee8;border-radius:11px;background:#fbfcfe;color:#64748b;font-size:.7rem;text-align:center}

    #view-stats .stats-season-card{border:1px solid var(--coach-stats-border)!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(15,23,42,.04)!important}
    #view-stats #stats-matches-list{display:grid!important;grid-template-columns:1fr!important;gap:.5rem!important}
    #view-stats #stats-matches-list .match-stat-card{position:relative;border:1px solid var(--coach-stats-border)!important;border-radius:14px!important;box-shadow:none!important;background:#fff!important;padding:0!important;overflow:hidden!important}
    #view-stats #stats-matches-list .coach-match-accordion{margin:0}
    #view-stats #stats-matches-list .coach-match-accordion>summary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.8rem;min-height:68px;padding:.72rem .78rem;cursor:pointer;list-style:none;background:#fff}
    #view-stats #stats-matches-list .coach-match-accordion>summary::-webkit-details-marker{display:none}
    #view-stats #stats-matches-list .coach-match-accordion[open]>summary{background:#fbfcfe;border-bottom:1px solid #eef2f7}
    #view-stats #stats-matches-list .coach-match-summary-main{min-width:0}
    #view-stats #stats-matches-list .coach-match-kicker{display:flex;align-items:center;gap:.35rem;margin-bottom:.2rem;font-size:.58rem;font-weight:850;letter-spacing:.035em;text-transform:uppercase;color:#7c8798}
    #view-stats #stats-matches-list .coach-match-status-dot{width:6px;height:6px;border-radius:50%;background:#cbd5e1}
    #view-stats #stats-matches-list .coach-match-accordion[data-status="published"] .coach-match-status-dot{background:#22c55e}
    #view-stats #stats-matches-list .coach-match-accordion[data-status="draft"] .coach-match-status-dot{background:#f59e0b}
    #view-stats #stats-matches-list .coach-match-accordion[data-status="archived"] .coach-match-status-dot{background:#94a3b8}
    #view-stats #stats-matches-list .coach-match-summary-title{display:block;min-width:0;font-family:var(--font-heading);font-size:.84rem;line-height:1.18;color:var(--coach-stats-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #view-stats #stats-matches-list .coach-match-summary-side{display:flex;align-items:center;gap:.55rem}
    #view-stats #stats-matches-list .coach-match-summary-result{font-family:var(--font-heading);font-size:.9rem;font-weight:850;color:#334155;font-variant-numeric:tabular-nums;white-space:nowrap}
    #view-stats #stats-matches-list .coach-match-chevron{width:9px;height:9px;border-right:2px solid #94a3b8;border-bottom:2px solid #94a3b8;transform:rotate(45deg);transition:transform .18s ease;margin-top:-4px}
    #view-stats #stats-matches-list .coach-match-accordion[open] .coach-match-chevron{transform:rotate(225deg);margin-top:4px}
    #view-stats #stats-matches-list .coach-match-expanded{padding:.72rem .78rem .78rem}
    #view-stats #stats-matches-list .coach-match-expanded>.match-stat-header{display:none!important}
    #view-stats #stats-matches-list .match-stat-card .stats-summary-icon,
    #view-stats #stats-matches-list .match-stat-card .match-extra-metrics i,
    #view-stats #stats-matches-list .match-stat-card .stats-card-actions i{display:none!important}
    #view-stats #stats-matches-list .coach-result-pill{display:none!important}
    #view-stats #stats-matches-list .match-extra-metrics>div,
    #view-stats #stats-matches-list .stats-extended-card-item{position:relative;overflow:hidden;border:1px solid #e5eaf1!important;background:#fbfcfe!important}
    #view-stats #stats-matches-list .match-extra-metrics>div::before,
    #view-stats #stats-matches-list .stats-extended-card-item::before{content:'';position:absolute;left:0;top:.38rem;bottom:.38rem;width:3px;border-radius:0 3px 3px 0;background:#cbd5e1}
    #view-stats #stats-matches-list .coach-tone-positive::before{background:var(--coach-positive)!important}
    #view-stats #stats-matches-list .coach-tone-negative::before{background:var(--coach-negative)!important}
    #view-stats #stats-matches-list .coach-tone-info::before{background:var(--coach-info)!important}
    #view-stats #stats-matches-list .coach-tone-warn::before{background:var(--coach-warn)!important}
    #view-stats #stats-matches-list .stats-card-actions{margin-top:.7rem!important;padding-top:.65rem!important;border-top:1px solid #eef2f7!important;gap:.4rem!important}
    #view-stats #stats-matches-list .stats-card-actions .btn{min-height:38px!important;border-radius:10px!important;font-size:.68rem!important;font-weight:800!important;padding:.5rem .62rem!important}
    #view-stats #stats-matches-list .coach-delete-stat-btn{border-color:#fecaca!important;background:#fff!important;color:#b91c1c!important}
    #view-stats #stats-matches-list .coach-delete-stat-btn:hover{background:#fef2f2!important}
    #view-stats #stats-matches-list .coach-card-more{margin:.62rem 0 0;border-top:1px solid #f1f5f9}
    #view-stats #stats-matches-list .coach-card-more>summary{display:flex;align-items:center;justify-content:space-between;min-height:38px;padding:.5rem .05rem 0;cursor:pointer;list-style:none;font-size:.66rem;font-weight:800;color:#64748b}
    #view-stats #stats-matches-list .coach-card-more>summary::-webkit-details-marker{display:none}
    #view-stats #stats-matches-list .coach-card-more>summary::after{content:'+';font-size:1rem;color:#94a3b8;font-weight:500}
    #view-stats #stats-matches-list .coach-card-more[open]>summary::after{content:'–'}
    #view-stats #stats-matches-list .coach-card-more .stats-extended-card-grid{margin:.45rem 0 0!important;padding-top:0!important;border-top:0!important}

    #form-match-stats .stats-form-section-title{display:none!important}
    #form-match-stats #stats-accordion-stack{display:grid;gap:.55rem;margin:.65rem 0 .8rem}
    #form-match-stats .stats-app-accordion{margin:0;border:1px solid #e2e8f0;border-radius:14px;background:#fff;overflow:hidden}
    #form-match-stats .stats-app-accordion>summary{display:flex;align-items:center;justify-content:space-between;gap:.75rem;min-height:50px;padding:.7rem .8rem;cursor:pointer;list-style:none;background:#fff;color:#0f172a}
    #form-match-stats .stats-app-accordion>summary::-webkit-details-marker{display:none}
    #form-match-stats .stats-app-accordion>summary strong{font-size:.76rem;font-weight:850;letter-spacing:.01em}
    #form-match-stats .stats-app-accordion>summary span{font-size:.61rem;font-weight:750;color:#94a3b8;white-space:nowrap}
    #form-match-stats .stats-app-accordion>summary::after{content:'+';flex:0 0 auto;margin-left:.15rem;font-size:1.08rem;line-height:1;color:#94a3b8;font-weight:500}
    #form-match-stats .stats-app-accordion[open]>summary{background:#fbfcfe;border-bottom:1px solid #f1f5f9}
    #form-match-stats .stats-app-accordion[open]>summary::after{content:'–'}
    #form-match-stats .stats-app-accordion-body{padding:.72rem .75rem .15rem}
    #form-match-stats .stats-app-accordion-body .form-row{margin:0!important}
    #form-match-stats .stats-app-accordion[data-section="publication"] .stats-app-accordion-body{padding-bottom:.72rem}
    #form-match-stats .stats-app-accordion .publication-state-control,
    #form-match-stats .stats-app-accordion .stats-visibility-fieldset{margin:0 0 .58rem!important}

    @media(max-width:560px){
      #view-stats #coach-stats-app-hero{padding:.82rem .86rem;border-radius:16px;margin-bottom:.7rem}
      #view-stats #coach-stats-app-hero h2{font-size:.96rem}
      #view-stats #coach-stats-app-hero p{font-size:.64rem}
      #view-stats #coach-stats-app-hero .coach-stats-record strong{font-size:1.12rem}
      #view-stats #stats-priority-block{padding:.78rem .7rem!important;border-radius:16px!important}
      #view-stats #stats-priority-grid .stats-summary-item{min-height:82px!important;padding:.62rem .5rem .62rem .72rem!important}
      #view-stats #coach-stats-charts .coach-league-chart{padding:.78rem .7rem .6rem!important;border-radius:15px!important}
      #view-stats .coach-league-chart-head h3{font-size:.82rem}
      #view-stats .coach-chart-axis{height:154px}
      #view-stats .coach-bars-area{height:172px}
      #view-stats #stats-matches-list .coach-match-accordion>summary{min-height:62px;padding:.65rem .7rem;gap:.55rem}
      #view-stats #stats-matches-list .coach-match-summary-title{font-size:.78rem}
      #view-stats #stats-matches-list .coach-match-kicker{font-size:.54rem}
      #view-stats #stats-matches-list .coach-match-summary-result{font-size:.84rem}
      #view-stats #stats-matches-list .coach-match-expanded{padding:.62rem .7rem .72rem}
      #view-stats #stats-matches-list .stats-card-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #view-stats #stats-matches-list .coach-delete-stat-btn{grid-column:1/-1!important}
      #form-match-stats #stats-accordion-stack{gap:.45rem;margin:.55rem 0 .7rem}
      #form-match-stats .stats-app-accordion{border-radius:12px}
      #form-match-stats .stats-app-accordion>summary{min-height:47px;padding:.64rem .7rem}
      #form-match-stats .stats-app-accordion-body{padding:.62rem .65rem .1rem}
    }
    @media(max-width:380px){
      #view-stats #stats-matches-list .coach-match-summary-title{font-size:.74rem}
      #view-stats .coach-bar-label{font-size:.47rem}
    }
  `;
  document.head.appendChild(style);
}

function ensureHero(){
  if(!isCoach())return;
  const anchor=document.getElementById('stats-priority-block')||document.getElementById('coach-stats-summary');
  if(!anchor?.parentNode)return;
  let hero=document.getElementById('coach-stats-app-hero');
  if(!hero){
    hero=document.createElement('section');
    hero.id='coach-stats-app-hero';
    hero.innerHTML='<div><span class="coach-stats-eyebrow">Temporada</span><h2>Estadísticas del equipo</h2><p>Resultados, rendimiento y publicación de cada partido.</p></div><div class="coach-stats-record"><strong>0V · 0D</strong><span>Balance global</span></div>';
    anchor.parentNode.insertBefore(hero,anchor);
  }
  const season=String(state()?.teamInfo?.season||'').trim();
  const eyebrow=hero.querySelector('.coach-stats-eyebrow');if(eyebrow)eyebrow.textContent=season?`Temporada ${season}`:'Temporada';
  const record=document.getElementById('stats-record')?.textContent?.trim();
  const value=hero.querySelector('.coach-stats-record strong');if(value)value.textContent=record||'0V · 0D';
}

function tonePriorityCards(){
  const toneMap={
    'stats-avg-rec-perfect':'coach-tone-positive',
    'stats-avg-rec-error':'coach-tone-negative',
    'stats-avg-attack-efficiency':'coach-tone-info'
  };
  Object.entries(toneMap).forEach(([id,tone])=>{
    const card=document.getElementById(id)?.closest('.stats-summary-item');
    if(card)card.classList.add(tone);
  });
}

function collapseSeasonTotals(){
  if(!isCoach())return;
  const summary=document.getElementById('coach-stats-summary');
  if(!summary||summary.closest('#coach-stats-season-more'))return;
  const details=document.createElement('details');
  details.id='coach-stats-season-more';
  details.innerHTML='<summary><span>Más indicadores de temporada</span></summary><div class="coach-season-more-body"></div>';
  summary.parentNode?.insertBefore(details,summary);
  details.querySelector('.coach-season-more-body')?.appendChild(summary);
}

function wrapExtendedMetrics(card){
  const grid=card.querySelector('.stats-extended-card-grid');
  if(!grid||grid.closest('.coach-card-more'))return;
  const details=document.createElement('details');
  details.className='coach-card-more';
  details.innerHTML='<summary>Más indicadores</summary>';
  grid.parentNode?.insertBefore(details,grid);
  details.appendChild(grid);
}

function toneMetricItems(card){
  const items=[...card.querySelectorAll('.match-extra-metrics>div,.stats-extended-card-item')];
  items.forEach(item=>{
    item.classList.remove('coach-tone-positive','coach-tone-negative','coach-tone-info','coach-tone-warn');
    const label=String(item.querySelector('span')?.textContent||item.textContent||'').toLowerCase();
    if(/recepci[oó]n perfecta|efect.*ataque|aces|bloqueos punto|error rival/.test(label))item.classList.add('coach-tone-positive');
    else if(/error.*recepci[oó]n|error ataque|error.*saque|error nuestro/.test(label))item.classList.add('coach-tone-negative');
    else if(/recepci[oó]n !|exclamativa/.test(label))item.classList.add('coach-tone-warn');
    else item.classList.add('coach-tone-info');
  });
}

function addDeleteButton(card,matchId,match){
  if(!match?.stats||card.querySelector('.coach-delete-stat-btn'))return;
  const actions=card.querySelector('.stats-card-actions');if(!actions)return;
  const button=document.createElement('button');
  button.type='button';button.className='btn btn-outline btn-sm coach-delete-stat-btn';
  button.textContent='Eliminar estadística';
  button.addEventListener('click',event=>{event.stopPropagation();void deleteStatistics(matchId);});
  actions.appendChild(button);
}

function buildMatchAccordion(card,match,index){
  if(card.querySelector(':scope > .coach-match-accordion'))return;
  const id=card.dataset.matchId||eventKey(match);
  const originalHeader=card.querySelector('.match-stat-header');
  const title=String(match?.title||originalHeader?.querySelector('.match-stat-title')?.textContent||'Partido').trim();
  const status=statusFromCard(card);
  const rLabel=roundLabel(card,match,index);
  const rNumber=parseRound(rLabel);
  if(rNumber)card.dataset.matchRound=String(rNumber);
  const result=resultOf(match)||'—';

  const details=document.createElement('details');
  details.className='coach-match-accordion';
  details.dataset.status=status.key;
  details.dataset.matchId=id;
  const summary=document.createElement('summary');
  summary.innerHTML=`<div class="coach-match-summary-main"><div class="coach-match-kicker"><span class="coach-match-status-dot"></span><span>${rLabel} · ${status.label}</span></div><strong class="coach-match-summary-title"></strong></div><div class="coach-match-summary-side"><strong class="coach-match-summary-result">${result}</strong><span class="coach-match-chevron" aria-hidden="true"></span></div>`;
  summary.querySelector('.coach-match-summary-title').textContent=title;

  const expanded=document.createElement('div');
  expanded.className='coach-match-expanded';
  while(card.firstChild)expanded.appendChild(card.firstChild);
  details.append(summary,expanded);
  card.appendChild(details);

  details.addEventListener('toggle',()=>{
    if(!details.open)return;
    const list=card.parentElement;
    list?.querySelectorAll('.coach-match-accordion[open]').forEach(other=>{if(other!==details)other.open=false;});
  });
}

function orderMatchCards(){
  const list=document.getElementById('stats-matches-list');if(!list)return;
  const cards=[...list.querySelectorAll(':scope > .match-stat-card')];
  cards.sort((a,b)=>{
    const ma=findMatch(a.dataset.matchId),mb=findMatch(b.dataset.matchId);
    const typeA=String(ma?.type||''),typeB=String(mb?.type||'');
    const leagueA=typeA==='Partido'?0:1,leagueB=typeB==='Partido'?0:1;
    if(leagueA!==leagueB)return leagueA-leagueB;
    const ra=Number(a.dataset.matchRound)||999,rb=Number(b.dataset.matchRound)||999;
    if(ra!==rb)return ra-rb;
    return String(ma?.date||'').localeCompare(String(mb?.date||''));
  });
  cards.forEach(card=>list.appendChild(card));
}

function polishCards(){
  if(!isCoach())return;
  const list=document.getElementById('stats-matches-list');if(!list)return;
  const cards=[...list.querySelectorAll(':scope > .match-stat-card')];
  cards.forEach((card,index)=>{
    const id=extractMatchId(card);if(!id)return;
    card.dataset.matchId=id;
    const match=findMatch(id);if(!match)return;
    wrapExtendedMetrics(card);
    toneMetricItems(card);
    addDeleteButton(card,id,match);
    buildMatchAccordion(card,match,index);
  });
  orderMatchCards();
}

function leagueStatsMatches(){
  const rows=(state()?.events||[]).filter(match=>String(match?.type||'')==='Partido'&&match?.stats);
  const list=document.getElementById('stats-matches-list');
  const roundFromDom=match=>{
    const key=eventKey(match);
    const card=[...(list?.querySelectorAll('.match-stat-card')||[])].find(node=>String(node.dataset.matchId||'')===key);
    return Number(card?.dataset.matchRound)||null;
  };
  rows.sort((a,b)=>{
    const ra=parseRound(a?.round??a?.jornada??a?.matchday??a?.rawPayload?.round??a?.rawPayload?.jornada)??roundFromDom(a)??999;
    const rb=parseRound(b?.round??b?.jornada??b?.matchday??b?.rawPayload?.round??b?.rawPayload?.jornada)??roundFromDom(b)??999;
    if(ra!==rb)return ra-rb;
    return String(a?.date||'').localeCompare(String(b?.date||''));
  });
  return rows.slice(0,22).map((match,index)=>({
    match,
    round:parseRound(match?.round??match?.jornada??match?.matchday??match?.rawPayload?.round??match?.rawPayload?.jornada)??roundFromDom(match)??(index+1)
  }));
}

function chartMetricValue(stats,key){
  const direct=numberValue(stats?.[key]);
  if(direct==null)return null;
  return Math.max(0,Math.min(100,direct));
}
function avgMetric(rows,key){
  const values=rows.map(row=>chartMetricValue(row.match?.stats,key)).filter(value=>value!=null);
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
}
function barSizing(count){
  if(count<=4)return {gap:'12px',max:'42px'};
  if(count<=8)return {gap:'7px',max:'30px'};
  if(count<=14)return {gap:'4px',max:'21px'};
  return {gap:'2px',max:'12px'};
}
function chartHtml(rows,{key,title,color,tone}){
  const count=Math.max(1,rows.length);
  const sizing=barSizing(count);
  const average=avgMetric(rows,key);
  const dense=count>8?' is-dense':'';
  const veryDense=count>16?' is-very-dense':'';
  const bars=rows.map(({match,round})=>{
    const value=chartMetricValue(match?.stats,key);
    const safe=value==null?0:value;
    const shown=value==null?'—':`${value.toFixed(0)}%`;
    return `<div class="coach-bar-col" title="Jornada ${round} · ${value==null?'Sin dato':value.toFixed(1)+'%'}"><div class="coach-bar-track"><span class="coach-bar-value" style="--value:${safe}">${shown}</span><span class="coach-bar ${value==null?'is-empty':''}" style="--value:${safe};--bar-color:${color}"></span></div><small class="coach-bar-label">${round}</small></div>`;
  }).join('');
  return `<article class="coach-league-chart${dense}${veryDense}" data-tone="${tone}"><header class="coach-league-chart-head"><div><span>Liga · evolución por jornada</span><h3>${title}</h3></div><strong>${average==null?'—':average.toFixed(1)+'%'} media</strong></header>${rows.length?`<div class="coach-league-chart-body"><div class="coach-chart-axis"><span class="y100">100</span><span class="y50">50</span><span class="y0">0</span></div><div class="coach-bars-area"><div class="coach-bars-grid" style="--journeys:${count};--bar-gap:${sizing.gap};--bar-max:${sizing.max}">${bars}</div></div></div>`:'<div class="coach-chart-empty">Todavía no hay jornadas de Liga con estadísticas registradas.</div>'}</article>`;
}
function renderLeagueBarCharts(){
  if(!isCoach())return;
  const charts=document.getElementById('coach-stats-charts');if(!charts)return;
  const rows=leagueStatsMatches();
  charts.innerHTML=[
    chartHtml(rows,{key:'recPerfectPct',title:'Recepción perfecta (#,+)',color:'#16a34a',tone:'positive'}),
    chartHtml(rows,{key:'recErrorPct',title:'Error de recepción (-)',color:'#dc2626',tone:'negative'}),
    chartHtml(rows,{key:'attackEfficiencyPct',title:'Efectividad de ataque',color:'#2563eb',tone:'info'})
  ].join('');
}

function uniqueRows(ids){
  const out=[];
  ids.forEach(id=>{
    const row=document.getElementById(id)?.closest('.form-row');
    if(row&&!out.includes(row))out.push(row);
  });
  return out;
}

function makeAccordion(key,label,ids){
  const details=document.createElement('details');
  details.className='stats-app-accordion';details.dataset.section=key;
  if(key==='reception')details.open=true;
  const body=document.createElement('div');body.className='stats-app-accordion-body';
  const summary=document.createElement('summary');
  summary.innerHTML=`<strong>${label}</strong><span>${ids.length} campos</span>`;
  details.append(summary,body);
  return {details,body};
}

function updateAccordionMeta(details,ids){
  const meta=details.querySelector('summary span');if(!meta)return;
  const filled=ids.filter(id=>String(document.getElementById(id)?.value??'').trim()!=='').length;
  meta.textContent=filled?`${filled}/${ids.length} registrados`:`${ids.length} campos`;
}
function bindSingleOpen(stack){
  stack.querySelectorAll('.stats-app-accordion').forEach(details=>{
    if(details.dataset.singleOpenBound==='1')return;
    details.dataset.singleOpenBound='1';
    details.addEventListener('toggle',()=>{
      if(!details.open)return;
      stack.querySelectorAll('.stats-app-accordion[open]').forEach(other=>{if(other!==details)other.open=false;});
    });
  });
}

function buildFormAccordions(){
  if(!isCoach())return;
  const form=document.getElementById('form-match-stats');
  if(!form||form.dataset.coachAppAccordions==='1')return;
  try{
    const matchId=document.getElementById('match-stats-id-input')?.value;
    const match=findMatch(matchId);
    window.hydrateExtendedMatchStatsForm?.(matchId,match?.stats||{});
  }catch(_){}

  const actions=form.querySelector('.stats-modal-actions')||form.querySelector('button[type="submit"]')?.parentElement;
  if(!actions)return;
  const configs=[
    ['reception','Recepción',['stats-rec-perfect-pct','stats-rec-exclam-pct','stats-rec-error-pct','stats-rec-total']],
    ['attack','Ataque',['stats-attack-efficiency','stats-attack-total','stats-attack-errors']],
    ['serve','Saque',['stats-aces','stats-serve-errors','stats-serve-total']],
    ['block','Bloqueo',['stats-bloqueos','stats-block-total']],
    ['balance','Balance de errores',['stats-own-errors','stats-opponent-errors']]
  ];
  if(configs.some(([, ,ids])=>ids.some(id=>!document.getElementById(id))))return;

  const stack=document.createElement('div');stack.id='stats-accordion-stack';
  form.insertBefore(stack,actions);
  configs.forEach(([key,label,ids])=>{
    const {details,body}=makeAccordion(key,label,ids);
    uniqueRows(ids).forEach(row=>body.appendChild(row));
    stack.appendChild(details);
    updateAccordionMeta(details,ids);
    ids.forEach(id=>document.getElementById(id)?.addEventListener('input',()=>updateAccordionMeta(details,ids),{passive:true}));
  });

  const publication=document.getElementById('stats-publication-status')?.closest('.publication-state-control');
  const visibility=form.querySelector('.stats-visibility-fieldset');
  if(publication||visibility){
    const {details,body}=makeAccordion('publication','Publicación',[]);
    const meta=details.querySelector('summary span');if(meta)meta.textContent='Jugadoras';
    if(publication)body.appendChild(publication);
    if(visibility)body.appendChild(visibility);
    stack.appendChild(details);
  }
  bindSingleOpen(stack);
  form.dataset.coachAppAccordions='1';
}

async function remoteEventId(match){
  for(const value of [match?.id,match?.supabaseId,match?.supabase_id])if(isUuid(value))return String(value);
  const legacy=match?.legacyId||match?.legacy_id||match?.id;
  const client=db();if(!client||!legacy)return null;
  const {data,error}=await client.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  return data?.id||null;
}

async function deleteStatistics(matchId){
  if(deleting||!isCoach())return;
  const match=findMatch(matchId);if(!match?.stats)return;
  const ok=confirm('¿Eliminar esta estadística? Se borrará de Supabase y dejará de estar visible para las jugadoras. El partido y su resultado se mantendrán.');
  if(!ok)return;
  deleting=true;
  try{
    const client=db();if(!client)throw new Error('Supabase no está disponible.');
    const eventId=await remoteEventId(match);if(!eventId)throw new Error('No se ha encontrado el partido en Supabase.');
    const {error}=await client.from('match_statistics').delete().eq('event_id',eventId);
    if(error)throw error;
    match.stats=null;
    try{if(typeof saveAppData==='function')saveAppData(state(),{immediate:true});}catch(_){}
    toast('Estadística eliminada. El resultado del partido se conserva.');
    await Promise.resolve(window.renderStats?.());
  }catch(error){
    console.error('[CoachStatsUX] delete',error);
    toast(error?.message||'No se ha podido eliminar la estadística.','error');
  }finally{deleting=false;}
}
window.deleteMatchStatistics=deleteStatistics;

function polishCoachView(){
  if(!isCoach())return;
  ensureStyles();
  ensureHero();
  tonePriorityCards();
  collapseSeasonTotals();
  polishCards();
  renderLeagueBarCharts();
}

function wrapEnhancer(){
  const current=window.enhanceCoachMatchStatistics;
  if(current?.__coachAppUxWrapped)return;
  previousEnhancer=typeof current==='function'?current:null;
  const wrapped=function(){
    try{previousEnhancer?.apply(this,arguments);}finally{requestAnimationFrame(polishCoachView);}
  };
  wrapped.__coachAppUxWrapped=true;
  window.enhanceCoachMatchStatistics=wrapped;
}

function observeModal(){
  const modal=document.getElementById('modal-edit-match-stats');if(!modal||modal.dataset.coachAppObserver==='1')return;
  modal.dataset.coachAppObserver='1';
  let wasActive=modal.classList.contains('active');
  if(wasActive)requestAnimationFrame(buildFormAccordions);
  new MutationObserver(()=>{
    const active=modal.classList.contains('active');
    if(active&&!wasActive)requestAnimationFrame(buildFormAccordions);
    wasActive=active;
  }).observe(modal,{attributes:true,attributeFilter:['class']});
}

function install(){
  ensureStyles();
  wrapEnhancer();
  observeModal();
  requestAnimationFrame(polishCoachView);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
