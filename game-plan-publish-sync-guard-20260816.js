(function(){
'use strict';

const FLAG='__gamePlanPublishSyncGuard20260816';
if(window[FLAG])return;
window[FLAG]=true;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let syncing=false;
let queued=false;

function db(){return window.VolleySupabase?.getClient?.()||null;}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function matchId(){try{return typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;}catch(_){return null;}}
function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function localEvent(id){
  const sid=String(id||'');
  return (state()?.events||[]).find(e=>[e.id,e.supabaseId,e.supabase_id,e.legacy_id,e.legacyId].filter(Boolean).map(String).includes(sid))||null;
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
async function syncNow(){
  if(syncing){queued=true;return;}
  if(!coach())return;
  const c=db(),mid=matchId(),rec=record();
  if(!c||!mid||!rec?.publishedPlan||rec.status!=='published')return;
  syncing=true;
  try{
    const eid=await eventUuid(mid); if(!eid)return;
    const {data:plans,error:listError}=await c.from('game_plans')
      .select('id,version,payload,published_at')
      .eq('event_id',eid)
      .eq('status','published')
      .order('version',{ascending:false});
    if(listError)throw listError;
    const version=rec.publicationVersion||rec.publishedAt||new Date().toISOString();
    const existing=(plans||[]).find(p=>sameMoment(p.payload?.publicationVersion,version)||sameMoment(p.published_at,version));
    if(existing)return;
    const identity=await window.VolleySupabase?.getIdentity?.();
    const profile=identity?.data?.profile;
    if(!profile?.id||!profile.club_id)throw new Error('Identidad de entrenador no disponible');
    const ev=localEvent(mid);
    const nextVersion=Math.max(0,...(plans||[]).map(p=>Number(p.version)||0))+1;
    const payload={
      plan:JSON.parse(JSON.stringify(rec.publishedPlan)),
      publicationVersion:version,
      localPublishedAt:rec.publishedAt||null
    };
    const {error}=await c.from('game_plans').insert({
      event_id:eid,
      club_id:profile.club_id,
      team_id:ev?.teamId||ev?.team_id||identity?.data?.teams?.[0]?.id||null,
      version:nextVersion,
      status:'published',
      payload,
      published_at:rec.publishedAt||new Date().toISOString(),
      created_by:profile.id
    });
    if(error)throw error;
    console.info('[GamePlanPublishSyncGuard] Publicación sincronizada con Supabase.',nextVersion);
  }catch(error){
    console.warn('[GamePlanPublishSyncGuard] sync',error);
  }finally{
    syncing=false;
    if(queued){queued=false;setTimeout(()=>void syncNow(),120);}
  }
}
function isPublishButton(btn){
  if(!btn)return false;
  const text=String(btn.textContent||'').toLowerCase();
  return /publicar|actualizar publicación/.test(text);
}
function install(){
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('button');
    if(!btn||!btn.closest('#scouting-interactive-root')||!isPublishButton(btn))return;
    setTimeout(()=>void syncNow(),120);
  },true);
  window.syncGamePlanPublicationNow=syncNow;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
