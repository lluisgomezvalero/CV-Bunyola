(function(){
'use strict';

const FLAG='__matchResultPersistence20260819';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso','Torneo']);
let pending=null;
let lastActive=false;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function toast(message,type){try{if(typeof showToast==='function')showToast(message,type);}catch(_){}}
function normalize(value){
  const text=String(value??'').trim().replace(/[–—:]/g,'-').replace(/\s+/g,'');
  const match=text.match(/^(\d+)-(\d+)$/);
  if(!match)return null;
  const own=Number(match[1]),rival=Number(match[2]);
  if(!Number.isInteger(own)||!Number.isInteger(rival)||own<0||rival<0||own>5||rival>5||own===rival)return null;
  return `${own}-${rival}`;
}
function splitResult(value){
  const result=normalize(value);if(!result)return {own:'',rival:''};
  const [own,rival]=result.split('-');return {own,rival};
}
function findEvent(id){
  if(!id)return null;
  return (state()?.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id].filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
}
function currentMatch(){return findEvent(document.getElementById('match-stats-id-input')?.value);}
function isMatchType(type){return MATCH_TYPES.has(String(type||''));}
function isLeagueEvent(evt){return String(evt?.type||'')==='Partido';}
function resultOf(evt){return normalize(evt?.result||evt?.rawPayload?.result||evt?.payload?.result);}
function opponentOf(evt){
  const direct=String(evt?.opponent||evt?.rawPayload?.opponent||'').trim();if(direct)return direct;
  const title=String(evt?.title||'').trim();
  const parts=title.split(/\s+(?:vs\.?|contra)\s+/i).map(v=>v.trim()).filter(Boolean);
  if(parts.length===2){
    const own=String(state()?.teamInfo?.name||'CV BUNYOLA').toLowerCase();
    if(parts[0].toLowerCase().includes('bunyola')||parts[0].toLowerCase()===own)return parts[1];
    if(parts[1].toLowerCase().includes('bunyola')||parts[1].toLowerCase()===own)return parts[0];
  }
  return 'Rival';
}
window.isLeagueClassificationEvent=isLeagueEvent;
window.getStandingsEligibleMatches=function(events){
  return (Array.isArray(events)?events:state()?.events||[]).filter(evt=>isLeagueEvent(evt)&&resultOf(evt));
};

function ensureStyles(){
  if(document.getElementById('match-result-persistence-style'))return;
  const style=document.createElement('style');
  style.id='match-result-persistence-style';
  style.textContent=`
    #stats-result-block{margin:0 0 .78rem;padding:.8rem;border:1px solid #dbeafe;border-radius:14px;background:linear-gradient(135deg,#f8fbff,#fff)}
    #stats-result-block .stats-result-heading{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.65rem}
    #stats-result-block .stats-result-heading strong{font-size:.78rem;color:#0f172a;text-transform:uppercase;letter-spacing:.025em}
    #stats-result-block .stats-result-scope{display:inline-flex;align-items:center;padding:.24rem .45rem;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:.58rem;font-weight:800;white-space:nowrap}
    #stats-result-block .stats-result-scope.is-league{background:#ecfdf5;color:#047857}
    #stats-result-block .stats-scoreboard{display:grid;grid-template-columns:minmax(0,1fr) 66px 18px 66px minmax(0,1fr);align-items:center;gap:.36rem}
    #stats-result-block .stats-score-team{min-width:0;font-size:.68rem;font-weight:800;color:#334155;line-height:1.15}
    #stats-result-block .stats-score-team.is-rival{text-align:right}
    #stats-result-block input{width:66px!important;height:52px!important;min-height:52px!important;padding:.3rem!important;text-align:center!important;border-radius:12px!important;font-size:1.2rem!important;font-weight:900!important;font-variant-numeric:tabular-nums!important}
    #stats-result-block .stats-score-dash{text-align:center;font-size:1.15rem;font-weight:900;color:#94a3b8}
    #stats-result-block .stats-result-help{display:block;margin-top:.48rem;font-size:.61rem;line-height:1.3;color:#64748b}
    @media(max-width:560px){
      #stats-result-block{padding:.68rem;margin-bottom:.65rem}
      #stats-result-block .stats-scoreboard{grid-template-columns:minmax(0,1fr) 58px 16px 58px minmax(0,1fr);gap:.28rem}
      #stats-result-block input{width:58px!important;height:48px!important;min-height:48px!important;font-size:1.12rem!important}
      #stats-result-block .stats-score-team{font-size:.62rem}
    }
  `;
  document.head.appendChild(style);
}
function ensureStatsField(){
  const form=document.getElementById('form-match-stats');if(!form)return null;
  let block=document.getElementById('stats-result-block');
  if(block)return block;
  block=document.createElement('section');
  block.id='stats-result-block';
  block.innerHTML=`<div class="stats-result-heading"><strong>Resultado del partido</strong><span class="stats-result-scope"></span></div><div class="stats-scoreboard"><span class="stats-score-team">CV Bunyola</span><input id="stats-result-own" type="number" inputmode="numeric" min="0" max="5" step="1" aria-label="Sets CV Bunyola"><span class="stats-score-dash">–</span><input id="stats-result-rival" type="number" inputmode="numeric" min="0" max="5" step="1" aria-label="Sets rival"><span id="stats-result-rival-name" class="stats-score-team is-rival">Rival</span></div><small class="stats-result-help">El marcador se guarda junto con la estadística y actualiza automáticamente el balance de victorias y derrotas.</small>`;
  const intro=form.querySelector('.stats-entry-intro');
  if(intro)intro.insertAdjacentElement('afterend',block);else form.prepend(block);
  return block;
}
function hydrateStatsField(){
  const block=ensureStatsField();const match=currentMatch();if(!block||!match)return;
  const parts=splitResult(resultOf(match));
  const own=document.getElementById('stats-result-own'),rival=document.getElementById('stats-result-rival');
  if(own)own.value=parts.own;if(rival)rival.value=parts.rival;
  const rivalName=document.getElementById('stats-result-rival-name');if(rivalName)rivalName.textContent=opponentOf(match);
  const badge=block.querySelector('.stats-result-scope');
  if(badge){const league=isLeagueEvent(match);badge.classList.toggle('is-league',league);badge.textContent=league?'Liga · cuenta para clasificación':'No afecta a la clasificación';}
}
function readStatsResult(){
  const own=String(document.getElementById('stats-result-own')?.value??'').trim();
  const rival=String(document.getElementById('stats-result-rival')?.value??'').trim();
  return normalize(`${own}-${rival}`);
}
function onStatsSubmit(event){
  if(event.target?.id!=='form-match-stats')return;
  const match=currentMatch();if(!match||!isMatchType(match.type))return;
  const result=readStatsResult();
  if(!result){
    event.preventDefault();event.stopImmediatePropagation();
    toast('Introduce un resultado válido antes de guardar la estadística.','error');
    const own=document.getElementById('stats-result-own');
    const rival=document.getElementById('stats-result-rival');
    (own?.value===''?own:rival)?.focus();
    return;
  }
  pending={match,result,previous:resultOf(match),previousStatsUpdatedAt:match?.stats?.statsUpdatedAt||null,submittedAt:Date.now()};
  match.result=result;
  match.rawPayload={...(match.rawPayload||{}),result};
  updateRecord();
}
async function persistPending(){
  const job=pending;if(!job)return;
  const changed=job.match?.stats?.statsUpdatedAt&&job.match.stats.statsUpdatedAt!==job.previousStatsUpdatedAt;
  const created=!job.previousStatsUpdatedAt&&job.match?.stats?.statsSupabaseId;
  if(!changed&&!created){
    if(Date.now()-job.submittedAt<2500){setTimeout(persistPending,180);return;}
    job.match.result=job.previous||null;job.match.rawPayload={...(job.match.rawPayload||{}),result:job.previous||null};pending=null;updateRecord();return;
  }
  pending=null;
  try{
    const api=window.VolleySupabase;if(!api?.saveEvent)throw new Error('No se puede guardar el resultado.');
    const identity=await api.getIdentity?.();if(identity?.error)throw identity.error;
    const who=identity?.data||{};
    const clubId=who.profile?.club_id||api.config?.clubId||window.VOLLEY_SUPABASE_CONFIG?.clubId;
    const teamId=job.match.teamId||job.match.team_id||who.teams?.[0]?.id||null;
    const userId=who.profile?.id||null;
    const response=await api.saveEvent(job.match,clubId,teamId,userId);
    if(response?.error)throw response.error;
    if(response?.data)Object.assign(job.match,response.data,{result:job.result,rawPayload:{...(response.data.rawPayload||job.match.rawPayload||{}),result:job.result}});
    try{if(typeof saveAppData==='function')saveAppData(state(),{immediate:true});}catch(_){}
    updateRecord();
  }catch(error){
    console.error('[MatchResultStats] save',error);
    job.match.result=job.previous||null;job.match.rawPayload={...(job.match.rawPayload||{}),result:job.previous||null};
    updateRecord();toast('La estadística se guardó, pero no se pudo guardar el marcador. Vuelve a intentarlo.','error');
  }
}
function updateRecord(){
  const el=document.getElementById('stats-record');if(!el)return;
  let wins=0,losses=0;
  for(const match of state()?.events||[]){
    if(!isMatchType(match?.type))continue;
    const result=resultOf(match);if(!result)continue;
    const [own,rival]=result.split('-').map(Number);
    if(own>rival)wins++;else if(rival>own)losses++;
  }
  el.textContent=`${wins}V · ${losses}D`;
}
function observeModal(){
  const modal=document.getElementById('modal-edit-match-stats');if(!modal||modal.dataset.resultObserver==='1')return;
  modal.dataset.resultObserver='1';lastActive=modal.classList.contains('active');
  new MutationObserver(()=>{
    const active=modal.classList.contains('active');
    if(active&&!lastActive)setTimeout(hydrateStatsField,0);
    if(!active&&lastActive&&pending)setTimeout(persistPending,0);
    lastActive=active;
  }).observe(modal,{attributes:true,attributeFilter:['class']});
}
function install(){
  ensureStyles();
  document.addEventListener('submit',onStatsSubmit,true);
  let tries=0;
  const timer=setInterval(()=>{
    tries++;ensureStatsField();observeModal();updateRecord();
    if(document.getElementById('modal-edit-match-stats')?.classList.contains('active'))hydrateStatsField();
    if(tries>180)clearInterval(timer);
  },120);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
