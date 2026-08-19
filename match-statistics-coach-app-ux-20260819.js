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
function extractMatchId(card){
  if(!card)return null;
  const source=[...card.querySelectorAll('[onclick]')].map(el=>el.getAttribute('onclick')||'').find(text=>/(openMatchStatsModal|quickPublishMatchStats|archiveMatchStats)/.test(text))||'';
  const match=source.match(/(?:openMatchStatsModal|quickPublishMatchStats|archiveMatchStats)\(['\"]([^'\"]+)['\"]\)/);
  return match?.[1]||card.dataset.matchId||null;
}

function ensureStyles(){
  if(document.getElementById('match-statistics-coach-app-ux-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-coach-app-ux-style';
  style.textContent=`
    #view-stats{--coach-stats-border:#e6ebf2;--coach-stats-muted:#64748b;--coach-stats-ink:#0f172a}
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
    #view-stats #stats-priority-grid .stats-summary-item{min-height:88px!important;padding:.78rem!important;border:1px solid var(--coach-stats-border)!important;background:#fbfcfe!important;border-radius:13px!important}
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

    #view-stats #coach-stats-charts{gap:.8rem!important}
    #view-stats #coach-stats-charts .card{border:1px solid var(--coach-stats-border)!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(15,23,42,.04)!important}
    #view-stats #coach-stats-charts .card-header h3{font-size:.92rem!important;color:var(--coach-stats-ink)!important}

    #view-stats .stats-season-card{border:1px solid var(--coach-stats-border)!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(15,23,42,.04)!important}
    #view-stats #stats-matches-list .match-stat-card{position:relative;border:1px solid var(--coach-stats-border)!important;border-radius:16px!important;box-shadow:none!important;background:#fff!important;padding:.88rem!important}
    #view-stats #stats-matches-list .match-stat-card .match-stat-title{font-size:.96rem!important;color:var(--coach-stats-ink)!important}
    #view-stats #stats-matches-list .match-stat-card .stats-summary-icon,
    #view-stats #stats-matches-list .match-stat-card .match-extra-metrics i,
    #view-stats #stats-matches-list .match-stat-card .stats-card-actions i{display:none!important}
    #view-stats #stats-matches-list .coach-result-pill{display:inline-flex;align-items:center;min-height:27px;padding:.27rem .5rem;border-radius:999px;background:#f1f5f9;color:#334155;font-size:.66rem;font-weight:850;font-variant-numeric:tabular-nums;white-space:nowrap}
    #view-stats #stats-matches-list .stats-card-actions{gap:.4rem!important}
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
      #view-stats #stats-priority-grid .stats-summary-item{min-height:82px!important;padding:.62rem .5rem!important}
      #view-stats #coach-stats-charts .card{border-radius:16px!important}
      #view-stats #stats-matches-list .match-stat-card{padding:.76rem!important;border-radius:14px!important}
      #view-stats #stats-matches-list .stats-card-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #view-stats #stats-matches-list .coach-delete-stat-btn{grid-column:1/-1!important}
      #form-match-stats #stats-accordion-stack{gap:.45rem;margin:.55rem 0 .7rem}
      #form-match-stats .stats-app-accordion{border-radius:12px}
      #form-match-stats .stats-app-accordion>summary{min-height:47px;padding:.64rem .7rem}
      #form-match-stats .stats-app-accordion-body{padding:.62rem .65rem .1rem}
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

function addResultPill(card,match){
  if(card.querySelector('.coach-result-pill'))return;
  const result=resultOf(match);if(!result)return;
  const header=card.querySelector('.match-stat-header');if(!header)return;
  const pill=document.createElement('span');
  pill.className='coach-result-pill';pill.textContent=result;
  header.appendChild(pill);
}

function addDeleteButton(card,matchId,match){
  if(!match?.stats||card.querySelector('.coach-delete-stat-btn'))return;
  const actions=card.querySelector('.stats-card-actions');if(!actions)return;
  const button=document.createElement('button');
  button.type='button';button.className='btn btn-outline btn-sm coach-delete-stat-btn';
  button.textContent='Eliminar estadística';
  button.addEventListener('click',()=>void deleteStatistics(matchId));
  actions.appendChild(button);
}

function polishCards(){
  if(!isCoach())return;
  const list=document.getElementById('stats-matches-list');if(!list)return;
  list.querySelectorAll('.match-stat-card').forEach(card=>{
    const id=extractMatchId(card);if(!id)return;
    card.dataset.matchId=id;
    const match=findMatch(id);if(!match)return;
    addResultPill(card,match);
    wrapExtendedMetrics(card);
    addDeleteButton(card,id,match);
  });
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
  collapseSeasonTotals();
  polishCards();
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
