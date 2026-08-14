(function(){
'use strict';

// Evita que el sincronizador antiguo se instale encima de esta capa.
window.__gamePlanSyncInstalled=true;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let installing=false;
let ticking=false;
let rendering=false;
let publishWrapped=false;
let readsChannel=null;
let lastPlayerReadKey='';
let lastCoachSignature='';

const db=()=>window.VolleySupabase?.getClient?.()||null;
const state=()=>typeof appState!=='undefined'?appState:null;
const user=()=>{try{return typeof getCurrentUser==='function'?getCurrentUser():null}catch(_){return null}};
const isCoach=()=>{try{return typeof isCoachUser==='function'&&isCoachUser()}catch(_){return false}};

function activeMatchId(){
  try{return typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null}catch(_){return null}
}
function localEvent(id){
  const sid=String(id??'');
  return (state()?.events||[]).find(e=>[e.id,e.supabaseId,e.supabase_id,e.legacy_id,e.legacyId].filter(Boolean).map(String).includes(sid))||null;
}
function currentRecord(){
  try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null}catch(_){return null}
}
function currentVersion(record){
  try{if(typeof getPlanPublicationVersion==='function')return getPlanPublicationVersion(record)}catch(_){}
  return record?.publicationVersion||record?.publishedAt||null;
}
function sameMoment(a,b){
  const aa=Date.parse(a||''),bb=Date.parse(b||'');
  if(Number.isFinite(aa)&&Number.isFinite(bb))return aa===bb;
  return String(a||'')===String(b||'');
}

async function eventUuid(id){
  const c=db(); if(!c||!id)return null;
  const sid=String(id);
  if(UUID.test(sid)){
    const {data}=await c.from('events').select('id').eq('id',sid).maybeSingle();
    if(data?.id)return data.id;
  }
  const ev=localEvent(id);
  const legacy=ev?.legacy_id||ev?.legacyId||(!UUID.test(sid)?sid:null);
  if(!legacy)return null;
  const {data}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  return data?.id||null;
}

async function plansForEvent(eid){
  const c=db();
  const {data,error}=await c.from('game_plans')
    .select('id,event_id,club_id,team_id,version,status,payload,published_at,created_by,created_at,updated_at')
    .eq('event_id',eid)
    .eq('status','published')
    .order('version',{ascending:false});
  if(error)throw error;
  return data||[];
}

function matchingPlan(plans,record){
  const version=currentVersion(record);
  if(!version)return null;
  return plans.find(p=>sameMoment(p.payload?.publicationVersion,version)||sameMoment(p.published_at,version))||null;
}

async function ensurePublication(eid,record){
  if(!record?.publishedPlan||record.status!=='published')return null;
  const c=db();
  const plans=await plansForEvent(eid);
  const existing=matchingPlan(plans,record);
  const version=currentVersion(record);
  if(existing)return existing;

  const identity=await window.VolleySupabase?.getIdentity?.();
  const profile=identity?.data?.profile;
  if(!profile?.id||!profile.club_id)return plans[0]||null;
  const ev=localEvent(activeMatchId());
  const nextVersion=Math.max(0,...plans.map(p=>Number(p.version)||0))+1;
  const payload={plan:record.publishedPlan,publicationVersion:version||new Date().toISOString(),localPublishedAt:record.publishedAt||null};
  const {data,error}=await c.from('game_plans').insert({
    event_id:eid,
    club_id:profile.club_id,
    team_id:ev?.teamId||ev?.team_id||identity?.data?.teams?.[0]?.id||null,
    version:nextVersion,
    status:'published',
    payload,
    published_at:record.publishedAt||new Date().toISOString(),
    created_by:profile.id
  }).select('id,event_id,version,status,payload,published_at').single();
  if(error){console.warn('[GamePlanAuthoritative] publish',error);return plans[0]||null;}
  return data;
}

async function playerId(){
  const identity=await window.VolleySupabase?.getIdentity?.();
  return identity?.data?.player?.id||null;
}

async function recordPlayerRead(eid,plan,record){
  if(!plan?.id)return;
  const pid=await playerId(); if(!pid)return;
  const key=`${plan.id}|${pid}`;
  if(lastPlayerReadKey===key)return;
  const c=db();
  const {data:existing,error:findError}=await c.from('game_plan_reads').select('id,read_at').eq('game_plan_id',plan.id).eq('player_id',pid).maybeSingle();
  if(findError){console.warn('[GamePlanAuthoritative] read lookup',findError);return;}
  if(!existing){
    const {error}=await c.from('game_plan_reads').insert({
      game_plan_id:plan.id,
      event_id:eid,
      player_id:pid,
      publication_version:String(plan.payload?.publicationVersion||plan.published_at||currentVersion(record)||''),
      read_at:new Date().toISOString()
    });
    if(error&&error.code!=='23505'){console.warn('[GamePlanAuthoritative] read insert',error);return;}
  }
  lastPlayerReadKey=key;
}

async function playerMapping(){
  const c=db(),st=state(); const map=new Map();
  if(!c||!st)return map;
  const {data,error}=await c.from('players').select('id,legacy_id,profile_id,profiles:profile_id(username,full_name)');
  if(error)return map;
  for(const row of data||[]){
    const username=String(row.profiles?.username||'').toLowerCase();
    const p=(st.players||[]).find(x=>
      String(x.supabaseId||x.supabase_id||'')===String(row.id)||
      String(x.legacy_id||x.legacyId||x.id||'')===String(row.legacy_id||'')||
      (username&&String(x.username||'').toLowerCase()===username)
    );
    if(p){p.supabaseId=row.id;map.set(String(row.id),p);}
  }
  return map;
}

async function hydrateCoachReads(eid,plan,record){
  if(!plan?.id||!record)return;
  const c=db();
  const map=await playerMapping();
  // Las lecturas pertenecen estrictamente a la publicación vigente.
  // Una republicación comienza con su propio seguimiento limpio.
  const {data,error}=await c.from('game_plan_reads')
    .select('id,game_plan_id,event_id,player_id,publication_version,read_at')
    .eq('game_plan_id',plan.id)
    .order('read_at',{ascending:true});
  if(error){console.warn('[GamePlanAuthoritative] coach reads',error);return;}

  const firstByPlayer=new Map();
  for(const row of data||[]){
    const key=String(row.player_id||'');
    if(!key||firstByPlayer.has(key))continue;
    firstByPlayer.set(key,row);
  }

  const version=plan.payload?.publicationVersion||plan.published_at||currentVersion(record)||null;
  const receipts={};
  for(const [remoteId,row] of firstByPlayer){
    const p=map.get(remoteId);
    if(p)receipts[p.id]={version,viewedAt:row.read_at};
  }
  record.readReceipts=receipts;
  const mid=activeMatchId();
  if(mid&&state()?.matchScouting)state().matchScouting[mid]=record;

  const signature=`${plan.id}|${JSON.stringify(Object.entries(receipts).sort())}`;
  if(signature===lastCoachSignature)return;
  lastCoachSignature=signature;
  try{saveAppData(state())}catch(_){}

  // Actualiza solo el tracker; no re-renderiza toda la aplicación ni toca otros módulos.
  const tracker=document.querySelector('.plan-read-tracker');
  if(tracker&&typeof renderPlanReadTracker==='function'){
    const shell=document.createElement('div');
    shell.innerHTML=renderPlanReadTracker(record).trim();
    const fresh=shell.firstElementChild;
    if(fresh)tracker.replaceWith(fresh);
    try{if(window.lucide)window.lucide.createIcons()}catch(_){}
  }else if(!rendering&&typeof renderTactics==='function'){
    rendering=true;
    try{renderTactics()}catch(_){}
    finally{setTimeout(()=>{rendering=false;},0);}
  }
}

async function hydratePublishedRecord(mid,plan){
  const st=state(); if(!st||!mid||!plan?.payload?.plan)return currentRecord();
  st.matchScouting=st.matchScouting||{};
  let record=st.matchScouting[mid]||currentRecord()||{};
  const oldVersion=currentVersion(record);
  const newVersion=plan.payload?.publicationVersion||plan.published_at;
  const publicationChanged=!sameMoment(oldVersion,newVersion);
  const wasPublished=record.status==='published'&&!!record.publishedPlan;
  record.status='published';
  record.publishedPlan=plan.payload.plan;
  record.publishedAt=plan.published_at;
  record.publicationVersion=newVersion;
  // Nunca arrastrar confirmaciones de una publicación anterior.
  if(publicationChanged)record.readReceipts={};
  else record.readReceipts=record.readReceipts&&typeof record.readReceipts==='object'?record.readReceipts:{};
  st.matchScouting[mid]=record;
  if((!wasPublished||publicationChanged)&&!rendering&&typeof renderTactics==='function'){
    rendering=true;
    try{renderTactics()}catch(_){}
    finally{setTimeout(()=>{rendering=false;},0);}
  }
  return record;
}

async function tick(){
  if(ticking)return;
  const c=db(),mid=activeMatchId();
  if(!c||!mid)return;
  ticking=true;
  try{
    const eid=await eventUuid(mid); if(!eid)return;
    let record=currentRecord();
    const plans=await plansForEvent(eid);
    // Supabase es autoritativo: siempre hidratar la publicación más reciente.
    // Una copia local antigua nunca puede fijar al usuario en una versión previa.
    const plan=plans[0]||null;
    if(!plan)return;
    record=await hydratePublishedRecord(mid,plan);
    if(!record||record.status!=='published')return;
    if(isCoach())await hydrateCoachReads(eid,plan,record);
    else if(user()?.role==='player')await recordPlayerRead(eid,plan,record);
  }catch(error){console.warn('[GamePlanAuthoritative] tick',error);}
  finally{ticking=false;}
}

function wrapPublish(){
  if(publishWrapped||typeof window.publishScoutingPlan!=='function')return;
  const base=window.publishScoutingPlan;
  window.publishScoutingPlan=function(){
    const result=base.apply(this,arguments);
    setTimeout(async()=>{
      try{
        const mid=activeMatchId(),record=currentRecord();
        const eid=await eventUuid(mid);
        if(eid&&record)await ensurePublication(eid,record);
        await tick();
      }catch(error){console.warn('[GamePlanAuthoritative] publish sync',error);}
    },0);
    return result;
  };
  publishWrapped=true;
}

function subscribe(){
  const c=db(); if(!c||readsChannel)return;
  readsChannel=c.channel('game-plan-authoritative-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'game_plan_reads'},()=>{void tick();})
    .on('postgres_changes',{event:'*',schema:'public',table:'game_plans'},()=>{void tick();})
    .subscribe();
}

function install(){
  if(installing)return; installing=true;
  const wait=()=>{
    if(!window.VolleySupabase||typeof window.renderTactics!=='function'){
      setTimeout(wait,150);return;
    }
    wrapPublish();
    subscribe();
    void tick();
    setInterval(()=>{wrapPublish();void tick();},2000);
    console.info('[GamePlanAuthoritative] Lecturas y publicación conectadas a Supabase.');
  };
  // Se instala después de los hotfixes para no ser reemplazado por ellos.
  setTimeout(wait,1800);
}

install();
})();