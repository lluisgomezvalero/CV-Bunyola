(function(){
'use strict';

const FLAG='__competitionTeamAtomicSave20260820';
if(window[FLAG])return;
window[FLAG]=true;

const TABLE='league_standings';
const DEFAULT_LOGO='assets/default_avatar.svg';
const DEFAULT_SEASON='2026 - 2027';
let contextCache=null;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function client(){return window.VolleySupabase?.getClient?.()||null;}
function numberFrom(id){const n=parseInt(document.getElementById(id)?.value,10);return Number.isFinite(n)?n:0;}
function toast(message,type){try{if(typeof showToast==='function')showToast(message,type);}catch(_){} }
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}

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
      console.warn('[CompetitionSave] No se pudo resolver el contexto.',error);
    }
  }
  if(!clubId||!teamId)return null;
  contextCache={clubId,teamId};
  return contextCache;
}

function pendingLogo(currentTeam){
  try{
    if(typeof activeEditingTeamLogo!=='undefined'&&activeEditingTeamLogo)return activeEditingTeamLogo;
  }catch(_){}
  const preview=document.getElementById('edit-team-logo-preview');
  const previewSrc=String(preview?.getAttribute('src')||'').trim();
  if(previewSrc&&previewSrc!==DEFAULT_LOGO)return previewSrc;
  return currentTeam?.logo||DEFAULT_LOGO;
}

function snapshotFromForm(){
  const st=state();
  const id=String(document.getElementById('edit-team-id')?.value||'');
  if(!st||!id)return null;
  const current=(st.leagueTable||[]).find(row=>String(row?.id)===id);
  if(!current)return null;
  return {
    id,
    isOwn:Boolean(current.isOwn),
    name:String(document.getElementById('edit-team-name')?.value||current.name||'').trim(),
    logo:pendingLogo(current),
    points:numberFrom('edit-team-points'),
    pj:numberFrom('edit-team-pj'),
    pg:numberFrom('edit-team-pg'),
    pp:numberFrom('edit-team-pp'),
    sf:numberFrom('edit-team-sf'),
    sc:numberFrom('edit-team-sc')
  };
}

function applyLocal(snapshot){
  const st=state();if(!st||!snapshot)return null;
  const team=(st.leagueTable||[]).find(row=>String(row?.id)===String(snapshot.id));
  if(!team)return null;
  team.name=snapshot.name;
  team.logo=snapshot.logo||DEFAULT_LOGO;
  team.points=snapshot.points;
  team.pj=snapshot.pj;
  team.pg=snapshot.pg;
  team.pp=snapshot.pp;
  team.sf=snapshot.sf;
  team.sc=snapshot.sc;
  if(team.isOwn&&st.teamInfo){
    st.teamInfo.customLogo=team.logo;
    try{if(typeof updateTeamHeaderInfo==='function')updateTeamHeaderInfo();}catch(_){}
  }
  try{if(typeof saveAppData==='function')saveAppData(st,{immediate:true});}catch(_){try{saveAppData(st);}catch(__){}}
  return team;
}

async function persist(snapshot){
  const db=client();
  if(!db)throw new Error('Supabase no está disponible.');
  const ctx=await resolveContext();
  if(!ctx)throw new Error('No se ha podido identificar el equipo.');
  const row={
    club_id:ctx.clubId,
    context_team_id:ctx.teamId,
    season:String(state()?.teamInfo?.season||DEFAULT_SEASON),
    team_key:String(snapshot.id),
    name:String(snapshot.isOwn?'CV BUNYOLA':snapshot.name||'Equipo'),
    logo:snapshot.logo||DEFAULT_LOGO,
    is_own:Boolean(snapshot.isOwn),
    points:Number(snapshot.points)||0,
    pj:Number(snapshot.pj)||0,
    pg:Number(snapshot.pg)||0,
    pp:Number(snapshot.pp)||0,
    sf:Number(snapshot.sf)||0,
    sc:Number(snapshot.sc)||0,
    updated_at:new Date().toISOString()
  };
  const {error}=await db.from(TABLE).upsert([row],{onConflict:'club_id,context_team_id,season,team_key'});
  if(error)throw error;
}

async function forceFreshStanding(){
  if(typeof window.reloadLeagueStandings!=='function')return false;
  // Si había una lectura anterior en curso, la primera llamada puede unirse a ella.
  // La segunda fuerza una lectura posterior al upsert y evita que un dato antiguo pise el logo.
  try{await window.reloadLeagueStandings();}catch(_){}
  try{await window.reloadLeagueStandings();return true;}catch(_){return false;}
}

function closeEditor(){
  document.getElementById('modal-edit-team')?.classList.remove('active');
  try{if(typeof activeEditingTeamLogo!=='undefined')activeEditingTeamLogo=null;}catch(_){}
}

async function saveAtomic(event){
  if(!isCoach())return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const snapshot=snapshotFromForm();
  if(!snapshot){toast('No se ha podido leer el equipo.','error');return;}

  const form=event.currentTarget;
  const submit=form?.querySelector('button[type="submit"]');
  const oldHtml=submit?.innerHTML||'';
  if(submit){submit.disabled=true;submit.textContent='Guardando…';}

  try{
    // Mantener la edición visible localmente mientras se realiza el guardado remoto.
    applyLocal(snapshot);
    await persist(snapshot);

    const reloaded=await forceFreshStanding();
    if(!reloaded){
      // Si no se puede recargar, conservamos como mínimo el snapshot confirmado por Supabase.
      applyLocal(snapshot);
      try{if(typeof renderCompetition==='function')renderCompetition();}catch(_){}
    }

    closeEditor();
    toast(`Equipo "${snapshot.name}" actualizado en la clasificación`);
  }catch(error){
    console.error('[CompetitionSave] No se pudo guardar el equipo.',error);
    // Conservamos el editor abierto para que el usuario no pierda la imagen elegida.
    applyLocal(snapshot);
    toast('No se ha podido guardar el equipo. Inténtalo de nuevo.','error');
  }finally{
    if(submit){submit.disabled=false;submit.innerHTML=oldHtml||'Guardar';}
  }
}

function bind(){
  const form=document.getElementById('form-edit-team');
  if(!form||form.dataset.atomicCompetitionSave==='1')return false;
  form.dataset.atomicCompetitionSave='1';
  // Capture=true: intercepta el submit antes que el guardado base y el listener autoritativo antiguos.
  form.addEventListener('submit',saveAtomic,true);
  return true;
}

function install(){
  let tries=0;
  const boot=()=>{
    tries++;
    if(bind()||tries>=20)return;
    setTimeout(boot,250);
  };
  boot();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
