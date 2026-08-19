(function(){
'use strict';

const FLAG='__leagueStandingsAuthoritative20260819';
if(window[FLAG])return;
window[FLAG]=true;

const TABLE='league_standings';
const DEFAULT_SEASON='2026 - 2027';
const DEFAULT_LOGO='assets/default_avatar.svg';
let contextCache=null;
let loadingPromise=null;
let lastLoadedAt=0;
let remoteReady=false;
let baseRenderCompetition=null;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function client(){return window.VolleySupabase?.getClient?.()||null;}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function season(){return String(state()?.teamInfo?.season||DEFAULT_SEASON);}
function normalizeResult(value){
  const text=String(value??'').trim().replace(/[–—:]/g,'-').replace(/\s+/g,'');
  const match=text.match(/^(\d+)-(\d+)$/);
  if(!match)return null;
  const own=Number(match[1]),rival=Number(match[2]);
  if(!Number.isInteger(own)||!Number.isInteger(rival)||own<0||rival<0||own===rival)return null;
  return {own,rival};
}
function isLeagueMatch(evt){return String(evt?.type||'')==='Partido';}
function resultOf(evt){return normalizeResult(evt?.result||evt?.rawPayload?.result||evt?.payload?.result);}
function ownTeam(){
  const rows=state()?.leagueTable||[];
  return rows.find(row=>row?.isOwn)||rows.find(row=>String(row?.name||'').toLowerCase().includes('bunyola'))||null;
}
function pointsForResult(own,rival){
  const won=own>rival;
  const winner=Math.max(own,rival);
  const loser=Math.min(own,rival);
  let winnerPoints=0,loserPoints=0;
  if(winner>=3){
    winnerPoints=loser===2?2:3;
    loserPoints=loser===2?1:0;
  }else if(winner===2){
    winnerPoints=2;
    loserPoints=1;
  }else{
    winnerPoints=1;
    loserPoints=0;
  }
  return won?{own:winnerPoints,rival:loserPoints}:{own:loserPoints,rival:winnerPoints};
}
function calculateOwnStanding(){
  const summary={points:0,pj:0,pg:0,pp:0,sf:0,sc:0};
  for(const evt of state()?.events||[]){
    if(!isLeagueMatch(evt))continue;
    const result=resultOf(evt);if(!result)continue;
    summary.pj++;
    summary.sf+=result.own;
    summary.sc+=result.rival;
    if(result.own>result.rival)summary.pg++;else summary.pp++;
    summary.points+=pointsForResult(result.own,result.rival).own;
  }
  return summary;
}
function applyOwnDerived(){
  const row=ownTeam();if(!row)return null;
  Object.assign(row,calculateOwnStanding());
  return row;
}
function rowFromRemote(row){
  return {
    id:row.team_key,
    name:row.name,
    logo:row.logo||DEFAULT_LOGO,
    isOwn:Boolean(row.is_own),
    points:Number(row.points)||0,
    pj:Number(row.pj)||0,
    pg:Number(row.pg)||0,
    pp:Number(row.pp)||0,
    sf:Number(row.sf)||0,
    sc:Number(row.sc)||0
  };
}
function keyNumber(value){
  const n=Number(String(value||'').replace(/\D+/g,''));
  return Number.isFinite(n)?n:999;
}
function rowChangedFromSeed(row){
  if(!row)return false;
  const nonZero=['points','pj','pg','pp','sf','sc'].some(key=>Number(row[key])>0);
  const customLogo=Boolean(row.logo&&row.logo!==DEFAULT_LOGO&&!(row.isOwn&&row.logo==='assets/club_logo.png'));
  return nonZero||customLogo;
}
async function resolveContext(){
  if(contextCache?.clubId&&contextCache?.teamId)return contextCache;
  const st=state();
  let clubId=window.VolleySupabase?.config?.clubId||window.VOLLEY_SUPABASE_CONFIG?.clubId||null;
  let teamId=null;
  try{
    const user=typeof getCurrentUser==='function'?getCurrentUser():null;
    clubId=user?.clubId||user?.club_id||clubId;
    teamId=user?.teamId||user?.team_id||null;
  }catch(_){}
  if(!teamId){
    const evt=(st?.events||[]).find(e=>e?.teamId||e?.team_id);
    teamId=evt?.teamId||evt?.team_id||null;
  }
  if((!clubId||!teamId)&&window.VolleySupabase?.getIdentity){
    try{
      const identity=await window.VolleySupabase.getIdentity();
      if(!identity?.error){
        clubId=identity?.data?.profile?.club_id||clubId;
        teamId=identity?.data?.teams?.[0]?.id||identity?.data?.player?.team_id||teamId;
      }
    }catch(error){
      console.warn('[LeagueStandings] No se pudo resolver el contexto de equipo.',error);
    }
  }
  if(!clubId||!teamId)return null;
  contextCache={clubId,teamId};
  return contextCache;
}
function dbRow(team,ctx){
  return {
    club_id:ctx.clubId,
    context_team_id:ctx.teamId,
    season:season(),
    team_key:String(team.id||''),
    name:String(team.isOwn?'CV BUNYOLA':team.name||'Equipo'),
    logo:team.logo||DEFAULT_LOGO,
    is_own:Boolean(team.isOwn),
    points:Number(team.points)||0,
    pj:Number(team.pj)||0,
    pg:Number(team.pg)||0,
    pp:Number(team.pp)||0,
    sf:Number(team.sf)||0,
    sc:Number(team.sc)||0,
    updated_at:new Date().toISOString()
  };
}
async function upsertTeams(teams){
  const db=client();if(!db||!Array.isArray(teams)||!teams.length)return false;
  const ctx=await resolveContext();if(!ctx)return false;
  const rows=teams.filter(team=>team?.id).map(team=>dbRow(team,ctx));
  if(!rows.length)return false;
  const {error}=await db.from(TABLE).upsert(rows,{onConflict:'club_id,context_team_id,season,team_key'});
  if(error){
    console.error('[LeagueStandings] No se pudo guardar la clasificación.',error);
    return false;
  }
  return true;
}
async function maybeImportLocal(remoteRows){
  if(!isCoach()||!Array.isArray(remoteRows)||!remoteRows.length)return remoteRows;
  const remoteHasData=remoteRows.some(row=>['points','pj','pg','pp','sf','sc'].some(key=>Number(row[key])>0));
  if(remoteHasData)return remoteRows;
  const local=(state()?.leagueTable||[]).filter(rowChangedFromSeed);
  if(!local.length)return remoteRows;
  applyOwnDerived();
  await upsertTeams(state()?.leagueTable||[]);
  return null;
}
function renderBase(){
  applyOwnDerived();
  if(typeof baseRenderCompetition==='function'){
    baseRenderCompetition();
    decorateOwnRow();
  }
}
async function loadRemote(force=false){
  const now=Date.now();
  if(!force&&remoteReady&&now-lastLoadedAt<30000)return true;
  if(loadingPromise)return loadingPromise;
  loadingPromise=(async()=>{
    const db=client();if(!db)return false;
    const ctx=await resolveContext();if(!ctx)return false;
    let query=db.from(TABLE)
      .select('team_key,name,logo,is_own,points,pj,pg,pp,sf,sc')
      .eq('club_id',ctx.clubId)
      .eq('context_team_id',ctx.teamId)
      .eq('season',season());
    const {data,error}=await query;
    if(error){
      console.error('[LeagueStandings] No se pudo cargar la clasificación compartida.',error);
      return false;
    }
    let rows=Array.isArray(data)?data:[];
    const imported=await maybeImportLocal(rows);
    if(imported===null){
      const refreshed=await db.from(TABLE)
        .select('team_key,name,logo,is_own,points,pj,pg,pp,sf,sc')
        .eq('club_id',ctx.clubId)
        .eq('context_team_id',ctx.teamId)
        .eq('season',season());
      if(refreshed.error){
        console.error('[LeagueStandings] No se pudo recargar la clasificación importada.',refreshed.error);
        return false;
      }
      rows=refreshed.data||[];
    }
    if(rows.length){
      rows.sort((a,b)=>keyNumber(a.team_key)-keyNumber(b.team_key));
      state().leagueTable=rows.map(rowFromRemote);
      applyOwnDerived();
      try{if(typeof saveAppData==='function')saveAppData(state(),{immediate:true});}catch(_){}
    }
    remoteReady=true;
    lastLoadedAt=Date.now();
    renderBase();
    return true;
  })().finally(()=>{loadingPromise=null;});
  return loadingPromise;
}
function decorateOwnRow(){
  const tbody=document.getElementById('league-table-tbody');if(!tbody)return;
  const own=ownTeam();if(!own)return;
  const rows=[...tbody.querySelectorAll('tr')];
  const row=rows.find(tr=>tr.classList.contains('league-own-team-row')||tr.textContent.includes('CV Bunyola'));
  if(!row)return;
  const button=row.querySelector('button[onclick*="openEditTeamModal"]');
  if(button){
    button.disabled=true;
    button.removeAttribute('onclick');
    button.innerHTML='<i data-lucide="lock-keyhole" style="width:13px;"></i> Automático';
    button.title='La fila de CV Bunyola se calcula a partir de los resultados de Liga.';
  }
  if(window.lucide?.createIcons){try{window.lucide.createIcons();}catch(_){}}
}
async function syncOwnStanding(){
  const own=applyOwnDerived();if(!own)return false;
  renderBase();
  if(!isCoach())return true;
  return upsertTeams([own]);
}
async function saveManualTeam(teamId){
  const team=(state()?.leagueTable||[]).find(row=>String(row.id)===String(teamId));
  if(!team||team.isOwn)return false;
  const ok=await upsertTeams([team]);
  if(ok){
    lastLoadedAt=Date.now();
    remoteReady=true;
  }
  return ok;
}
function bindCompetitionForm(){
  const form=document.getElementById('form-edit-team');
  if(!form||form.dataset.leagueStandingsBound==='1')return;
  form.dataset.leagueStandingsBound='1';
  form.addEventListener('submit',()=>{
    const id=document.getElementById('edit-team-id')?.value;
    if(!id)return;
    setTimeout(()=>void saveManualTeam(id),0);
  });
}
function patchSaveEvent(){
  const api=window.VolleySupabase;
  if(!api||typeof api.saveEvent!=='function')return false;
  if(api.saveEvent.__leagueStandingsAuthoritative20260819)return true;
  const base=api.saveEvent;
  const wrapped=async function(evt){
    const response=await base.apply(this,arguments);
    if(!response?.error&&['Partido','Amistoso','Torneo'].includes(String(evt?.type||''))){
      try{await syncOwnStanding();}catch(error){console.warn('[LeagueStandings] No se pudo refrescar la fila automática.',error);}
    }
    return response;
  };
  wrapped.__leagueStandingsAuthoritative20260819=true;
  api.saveEvent=wrapped;
  return true;
}

function patchRender(){
  const current=window.renderCompetition;
  if(typeof current!=='function'||current.__leagueStandingsAuthoritative20260819)return false;
  baseRenderCompetition=current;
  const wrapped=function(){
    applyOwnDerived();
    const out=current.apply(this,arguments);
    decorateOwnRow();
    void loadRemote(false);
    return out;
  };
  wrapped.__leagueStandingsAuthoritative20260819=true;
  window.renderCompetition=wrapped;
  try{renderCompetition=wrapped;}catch(_){}
  return true;
}
window.refreshLeagueStandingsFromMatches=syncOwnStanding;
window.reloadLeagueStandings=()=>loadRemote(true);

function install(){
  let tries=0;
  const boot=()=>{
    tries++;
    const patchedRender=patchRender();
    const patchedSave=patchSaveEvent();
    bindCompetitionForm();
    if((patchedRender&&patchedSave)||tries>=20)return;
    setTimeout(boot,250);
  };
  setTimeout(boot,0);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
