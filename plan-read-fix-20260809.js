(function(){
'use strict';

let channel=null;
let hydrating=false;
let rerendering=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const db=()=>window.VolleySupabase?.getClient?.()||null;
const state=()=>typeof appState!=='undefined'?appState:null;

function currentMatchId(){try{return typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null}catch(_){return null}}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null}catch(_){return null}}
function currentRecord(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null}catch(_){return null}}
function normDate(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toISOString()}
function localEvent(id){const s=String(id??'');return(state()?.events||[]).find(e=>[e.id,e.legacy_id,e.legacyId].filter(Boolean).map(String).includes(s))||null}
function localPlayerByAny(id,username){const sid=String(id??'');const uname=String(username??'').toLowerCase();return(state()?.players||[]).find(p=>[p.id,p.supabaseId,p.legacy_id,p.legacyId,p.profile_id,p.authId].filter(Boolean).map(String).includes(sid)||(uname&&String(p.username||'').toLowerCase()===uname))||null}

async function eventUuid(id){
  if(!id)return null;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id)))return String(id);
  const c=db();if(!c)return null;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',String(id)).maybeSingle();
  if(error){console.warn('[PlanReadFix] eventUuid',error);return null}
  return data?.id||null;
}

async function latestPublishedPlan(matchId){
  const c=db();if(!c)return null;
  const eid=await eventUuid(matchId);if(!eid)return null;
  const {data,error}=await c.from('game_plans')
    .select('id,event_id,version,status,payload,published_at')
    .eq('event_id',eid).eq('status','published')
    .order('published_at',{ascending:false}).limit(1).maybeSingle();
  if(error){console.warn('[PlanReadFix] latest plan',error);return null}
  return data?{...data,eventUuid:eid}:null;
}

async function mapPlayersByUuid(ids){
  const c=db();const map=new Map();if(!c||!ids.length)return map;
  const {data,error}=await c.from('players').select('id,legacy_id,profile_id,profiles:profile_id(username,full_name)').in('id',ids);
  if(error){console.warn('[PlanReadFix] players map',error);return map}
  for(const row of data||[]) map.set(String(row.id),row);
  return map;
}

async function hydrateCoachReads(forceRender=false){
  if(hydrating)return false;
  const c=db(),st=state(),matchId=currentMatchId();if(!c||!st||!matchId)return false;
  const coach=typeof isCoachUser==='function'&&isCoachUser();if(!coach)return false;
  hydrating=true;
  try{
    const plan=await latestPublishedPlan(matchId);if(!plan?.id||!plan?.payload?.plan)return false;
    st.matchScouting=st.matchScouting||{};
    const rec=st.matchScouting[matchId]||{};
    const currentVersion=normDate(plan.payload?.publicationVersion||plan.published_at)||String(plan.id);
    Object.assign(rec,{status:'published',publishedPlan:plan.payload.plan,publishedAt:plan.published_at,publicationVersion:currentVersion});

    // Solo cuentan lecturas de la publicación actual: del plan concreto o del evento,
    // siempre posteriores a su published_at. Así evitamos que una lectura antigua
    // aparezca como leída después de republicar el plan.
    const {data:reads,error}=await c.from('game_plan_reads')
      .select('id,game_plan_id,event_id,player_id,publication_version,read_at')
      .or(`game_plan_id.eq.${plan.id},event_id.eq.${plan.eventUuid}`)
      .gte('read_at',plan.published_at)
      .order('read_at',{ascending:false});
    if(error){console.warn('[PlanReadFix] reads',error);return false}

    const latestByPlayer=new Map();
    for(const row of reads||[]){if(!latestByPlayer.has(String(row.player_id)))latestByPlayer.set(String(row.player_id),row)}
    const pmap=await mapPlayersByUuid([...latestByPlayer.keys()]);
    const receipts={};
    for(const [pid,row] of latestByPlayer){
      const remote=pmap.get(pid);
      const local=localPlayerByAny(pid,remote?.profiles?.username);
      if(!local)continue;
      if(remote?.id&&!local.supabaseId)local.supabaseId=remote.id;
      receipts[local.id]={version:currentVersion,viewedAt:row.read_at,remotePlayerId:pid};
    }
    const before=JSON.stringify(rec.readReceipts||{});
    rec.readReceipts=receipts;
    st.matchScouting[matchId]=rec;
    try{saveAppData(st)}catch(_){}
    const changed=before!==JSON.stringify(receipts);
    if((changed||forceRender)&&typeof window.__planReadBaseRender==='function'&&!rerendering){
      rerendering=true;try{window.__planReadBaseRender()}finally{rerendering=false}
    }
    return changed;
  }finally{hydrating=false}
}

async function recordCanonicalRead(record){
  const c=db(),matchId=currentMatchId();if(!c||!matchId)return;
  const coach=typeof isCoachUser==='function'&&isCoachUser();if(coach)return;
  const plan=await latestPublishedPlan(matchId);if(!plan?.id)return;
  const ident=await window.VolleySupabase?.getIdentity?.();
  const pid=ident?.data?.player?.id;if(!pid)return;
  const version=normDate(plan.payload?.publicationVersion||plan.published_at)||String(plan.id);
  const payload={game_plan_id:plan.id,event_id:plan.eventUuid,player_id:pid,publication_version:version,read_at:new Date().toISOString()};

  // No usamos upsert con índices parciales. Buscamos primero la fila canónica
  // del plan actual y después insertamos o actualizamos read_at.
  const {data:existing,error:readErr}=await c.from('game_plan_reads')
    .select('id').eq('game_plan_id',plan.id).eq('player_id',pid).maybeSingle();
  if(readErr){console.warn('[PlanReadFix] existing read',readErr);return}
  let error=null;
  if(existing?.id){
    ({error}=await c.from('game_plan_reads').update({event_id:plan.eventUuid,publication_version:version,read_at:payload.read_at}).eq('id',existing.id));
  }else{
    ({error}=await c.from('game_plan_reads').insert(payload));
  }
  if(error)console.warn('[PlanReadFix] record read',error);
}

function subscribe(){
  const c=db();if(!c||channel)return;
  channel=c.channel('plan-read-fix-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'game_plan_reads'},()=>{void hydrateCoachReads(true)})
    .subscribe();
}

function install(){
  if(window.__planReadFix20260809Installed)return;
  if(typeof window.renderTactics!=='function'||typeof window.markCurrentPlayerPlanRead!=='function'){setTimeout(install,120);return}
  window.__planReadFix20260809Installed=true;

  const baseMark=window.markCurrentPlayerPlanRead;
  window.markCurrentPlayerPlanRead=function(record){
    try{baseMark.call(this,record)}catch(e){console.warn('[PlanReadFix] local mark',e)}
    void recordCanonicalRead(record);
  };

  const baseRender=window.renderTactics;
  window.__planReadBaseRender=baseRender;
  window.renderTactics=function(){
    const result=baseRender.apply(this,arguments);
    const coach=typeof isCoachUser==='function'&&isCoachUser();
    if(coach){subscribe();void hydrateCoachReads(false)}
    else{
      const rec=currentRecord();
      if(rec?.status==='published'&&rec?.publishedPlan)void recordCanonicalRead(rec);
    }
    return result;
  };

  // Si el módulo ya estaba abierto al cargar este parche.
  setTimeout(()=>{
    const coach=typeof isCoachUser==='function'&&isCoachUser();
    if(coach){subscribe();void hydrateCoachReads(true)}
    else{const rec=currentRecord();if(rec?.status==='published'&&rec?.publishedPlan)void recordCanonicalRead(rec)}
  },500);

  console.info('[PlanReadFix] Lecturas de plan conectadas a Supabase y al tracker del entrenador.');
}

install();
})();
