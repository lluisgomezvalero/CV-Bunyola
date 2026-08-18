(function(){
'use strict';

const FLAG='__matchStatisticsAuthoritative20260817';
if(window[FLAG])return;
window[FLAG]=true;

const ROW_SELECT='id,event_id,club_id,team_id,status,visible_metrics,payload,published_at,created_by,created_at,updated_at';
const DEFAULT_VISIBLE=['recPerfectPct','recExclamPct','recErrorPct','recTotal','attackEfficiencyPct','attackErrors','attackTotal','aces','serveErrorPct','serveTotal','bloqueos','blockTotal'];
const rowByEvent=new Map();
const remoteIdByLocal=new Map();
let baseRenderStats=null;
let baseOpenPlayerMatchStats=null;
let baseOpenMatchStatsModal=null;
let installed=false;
let renderSeq=0;
let busy=false;

function db(){return window.VolleySupabase?.getClient?.()||null;}
function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function isUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));}
function matches(){return (state()?.events||[]).filter(e=>e&&['Partido','Amistoso'].includes(String(e.type||'')));}
function toast(message,type){try{showToast(message,type);}catch(_){}}
function clone(v){try{return v==null?v:JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function statusOf(value){return ['draft','published','archived'].includes(String(value||''))?String(value):'draft';}
function visibleArray(value){return Array.isArray(value)?value.map(String):[];}

async function identity(){
  const result=await window.VolleySupabase?.getIdentity?.();
  if(result?.error)throw result.error;
  if(!result?.data?.profile?.id)throw new Error('No se ha podido identificar al usuario.');
  return result.data;
}
async function remoteEventId(match){
  if(!match)return null;
  const localKey=String(match.id||match.legacyId||match.legacy_id||'');
  if(localKey&&remoteIdByLocal.has(localKey))return remoteIdByLocal.get(localKey);
  for(const value of [match.id,match.supabaseId,match.supabase_id]){
    if(isUuid(value)){
      const id=String(value);if(localKey)remoteIdByLocal.set(localKey,id);return id;
    }
  }
  const legacy=match.legacyId||match.legacy_id||match.id;
  const client=db();if(!client||!legacy)return null;
  const {data,error}=await client.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  const id=data?.id||null;if(localKey&&id)remoteIdByLocal.set(localKey,id);return id;
}
function statsFromRow(row){
  if(!row)return null;
  const payload=clone(row.payload)||{};
  return {
    ...payload,
    visibleToPlayers:visibleArray(row.visible_metrics),
    publicationStatus:statusOf(row.status),
    publishedAt:row.published_at||null,
    statsSupabaseId:row.id||null,
    statsUpdatedAt:row.updated_at||null
  };
}
function payloadFromStats(stats){
  const out={...(clone(stats)||{})};
  ['visibleToPlayers','publicationStatus','publishedAt','archivedAt','statsSupabaseId','statsUpdatedAt'].forEach(k=>delete out[k]);
  return out;
}
function applyCoachRows(){
  for(const match of matches()){
    const rid=remoteIdByLocal.get(String(match.id||''))||(isUuid(match.id)?String(match.id):null);
    const row=rid?rowByEvent.get(rid):null;
    if(row){match.stats=statsFromRow(row);match.status='Finalizado';}
  }
}
function withPlayerSafeRows(callback){
  const snapshots=[];
  for(const match of matches()){
    snapshots.push([match,match.stats,match.status]);
    const rid=remoteIdByLocal.get(String(match.id||''))||(isUuid(match.id)?String(match.id):null);
    const row=rid?rowByEvent.get(rid):null;
    match.stats=row?statsFromRow(row):null;
    if(row)match.status='Finalizado';
  }
  try{return callback();}
  finally{for(const [match,stats,status] of snapshots){match.stats=stats;match.status=status;}}
}
async function resolveMatchIds(list){
  for(const match of list){
    try{await remoteEventId(match);}catch(error){console.warn('[MatchStats] resolve event',error);}
  }
}
async function fetchRows(){
  const client=db();if(!client)return;
  const list=matches();await resolveMatchIds(list);
  rowByEvent.clear();
  if(coach()){
    const ids=[...new Set(list.map(m=>remoteIdByLocal.get(String(m.id||''))||(isUuid(m.id)?String(m.id):null)).filter(Boolean))];
    if(!ids.length)return;
    const {data,error}=await client.from('match_statistics').select(ROW_SELECT).in('event_id',ids);
    if(error)throw error;
    for(const row of data||[])rowByEvent.set(String(row.event_id),row);
  }else{
    const {data,error}=await client.rpc('get_published_match_statistics');
    if(error)throw error;
    for(const row of data||[])rowByEvent.set(String(row.event_id),row);
  }
}
function paintLoading(){
  const container=document.getElementById('stats-matches-list');
  if(container)container.innerHTML='<div style="padding:1rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#64748b;font-size:.85rem;">Cargando estadísticas…</div>';
}
async function renderAuthoritative(){
  const seq=++renderSeq;paintLoading();
  try{
    await fetchRows();if(seq!==renderSeq)return;
    if(coach()){
      applyCoachRows();baseRenderStats?.();setTimeout(()=>window.enhanceCoachMatchStatistics?.(),0);
    }else{
      withPlayerSafeRows(()=>baseRenderStats?.());
    }
  }catch(error){
    console.error('[MatchStats] load',error);
    if(coach()){baseRenderStats?.();setTimeout(()=>window.enhanceCoachMatchStatistics?.(),0);}
    else withPlayerSafeRows(()=>baseRenderStats?.());
  }
}

function formNumber(id,{integer=false,percent=false}={}){
  const el=document.getElementById(id);let value=integer?parseInt(el?.value,10):parseFloat(el?.value);
  if(!Number.isFinite(value))value=0;value=Math.max(0,value);if(percent)value=Math.min(100,value);return value;
}
function optionalPercent(id){
  const raw=String(document.getElementById(id)?.value??'').trim();
  if(raw==='')return null;
  const value=parseFloat(raw);if(!Number.isFinite(value))return null;
  return Math.max(0,Math.min(100,value));
}
function statsFromForm(match){
  const serveTotal=formNumber('stats-serve-total',{integer:true});
  let serveErrorPct=optionalPercent('stats-serve-errors');
  if(serveErrorPct==null){
    const existingPct=Number(match?.stats?.serveErrorPct);
    if(Number.isFinite(existingPct))serveErrorPct=Math.max(0,Math.min(100,existingPct));
    else{
      const legacyErrors=Number(match?.stats?.serveErrors??match?.stats?.saquesError);
      if(serveTotal>0&&Number.isFinite(legacyErrors))serveErrorPct=Math.max(0,Math.min(100,(legacyErrors/serveTotal)*100));
    }
  }
  const out={
    ...(clone(match?.stats)||{}),
    recPerfectPct:formNumber('stats-rec-perfect-pct',{percent:true}),
    recExclamPct:formNumber('stats-rec-exclam-pct',{percent:true}),
    recErrorPct:formNumber('stats-rec-error-pct',{percent:true}),
    recTotal:formNumber('stats-rec-total',{integer:true}),
    attackEfficiencyPct:formNumber('stats-attack-efficiency',{percent:true}),
    attackErrors:formNumber('stats-attack-errors',{integer:true}),
    attackTotal:formNumber('stats-attack-total',{integer:true}),
    aces:formNumber('stats-aces',{integer:true}),
    serveTotal,
    bloqueos:formNumber('stats-bloqueos',{integer:true}),
    blockTotal:formNumber('stats-block-total',{integer:true}),
    ownErrors:formNumber('stats-own-errors',{integer:true}),
    opponentErrors:formNumber('stats-opponent-errors',{integer:true})
  };
  if(serveErrorPct!=null)out.serveErrorPct=serveErrorPct;
  return out;
}
async function persist(match,stats,nextStatus,visibleMetrics){
  if(!coach())throw new Error('Solo el cuerpo técnico puede modificar estadísticas.');
  const client=db();if(!client)throw new Error('Supabase no está disponible.');
  const who=await identity();
  const eid=await remoteEventId(match);if(!eid)throw new Error('No se ha encontrado el partido en Supabase.');
  const existing=rowByEvent.get(String(eid))||null;
  const now=new Date().toISOString();
  const status=statusOf(nextStatus);
  const record={
    event_id:eid,
    club_id:who.profile.club_id,
    team_id:match.teamId||match.team_id||who.teams?.[0]?.id||null,
    status,
    visible_metrics:visibleArray(visibleMetrics),
    payload:payloadFromStats(stats),
    published_at:status==='published'?now:(existing?.published_at||null),
    created_by:who.profile.id,
    updated_at:now
  };
  const {data,error}=await client.from('match_statistics').upsert(record,{onConflict:'event_id'}).select(ROW_SELECT).single();
  if(error)throw error;
  rowByEvent.set(String(eid),data);
  match.stats=statsFromRow(data);match.status='Finalizado';
  try{saveAppData(state());}catch(_){}
  return data;
}
async function saveForm(){
  if(busy)return;busy=true;
  try{
    const matchId=document.getElementById('match-stats-id-input')?.value;
    const match=matches().find(m=>String(m.id)===String(matchId));if(!match)throw new Error('No se ha encontrado el partido.');
    const stats=statsFromForm(match);
    const visible=[...document.querySelectorAll('[data-stats-visible]:checked')].map(x=>String(x.dataset.statsVisible||'')).filter(Boolean);
    const nextStatus=statusOf(document.getElementById('stats-publication-status')?.value||'draft');
    await persist(match,stats,nextStatus,visible);
    document.getElementById('modal-edit-match-stats')?.classList.remove('active');
    toast(nextStatus==='published'?'Estadística guardada y publicada.':'Estadística guardada correctamente.');
    await renderAuthoritative();
  }catch(error){console.error('[MatchStats] save',error);toast(error?.message||'No se ha podido guardar la estadística.','error');}
  finally{busy=false;}
}
async function quickPublish(matchId){
  if(busy||!coach())return;busy=true;
  try{
    await fetchRows();applyCoachRows();
    const match=matches().find(m=>String(m.id)===String(matchId));if(!match?.stats)throw new Error('No hay una estadística guardada para publicar.');
    const visible=Array.isArray(match.stats.visibleToPlayers)?match.stats.visibleToPlayers:[...DEFAULT_VISIBLE];
    await persist(match,match.stats,'published',visible);
    toast('Estadística publicada para las jugadoras.');await renderAuthoritative();
  }catch(error){console.error('[MatchStats] publish',error);toast(error?.message||'No se ha podido publicar.','error');}
  finally{busy=false;}
}
async function archive(matchId){
  if(busy||!coach())return;
  if(!confirm('¿Archivar estas estadísticas? Dejarán de estar visibles para las jugadoras.'))return;
  busy=true;
  try{
    await fetchRows();applyCoachRows();
    const match=matches().find(m=>String(m.id)===String(matchId));if(!match?.stats)throw new Error('No hay una estadística guardada.');
    const visible=Array.isArray(match.stats.visibleToPlayers)?match.stats.visibleToPlayers:[...DEFAULT_VISIBLE];
    await persist(match,match.stats,'archived',visible);
    toast('Estadística archivada.');await renderAuthoritative();
  }catch(error){console.error('[MatchStats] archive',error);toast(error?.message||'No se ha podido archivar.','error');}
  finally{busy=false;}
}

function openCoachModalWithBlocks(matchId){
  baseOpenMatchStatsModal?.(matchId);
  const match=matches().find(m=>String(m.id)===String(matchId));
  const input=document.getElementById('stats-bloqueos');
  if(input)input.value=match?.stats?.bloqueos??'';
  window.hydrateExtendedMatchStatsForm?.(matchId,match?.stats||{});
}

async function openPlayerSafe(matchId){
  try{
    await fetchRows();
    const match=matches().find(m=>String(m.id)===String(matchId));if(!match)return;
    const rid=remoteIdByLocal.get(String(match.id||''))||(isUuid(match.id)?String(match.id):null);
    const row=rid?rowByEvent.get(rid):null;if(!row)return;
    const oldStats=match.stats,oldStatus=match.status;
    match.stats=statsFromRow(row);match.status='Finalizado';
    try{
      baseOpenPlayerMatchStats?.(matchId);
      window.enhancePlayerMatchStatsModal?.(matchId,match.stats);
    }finally{match.stats=oldStats;match.status=oldStatus;}
  }catch(error){console.error('[MatchStats] player detail',error);}
}
function bindFormCapture(){
  if(document.documentElement.dataset.matchStatsAuthoritativeBound==='1')return;
  document.documentElement.dataset.matchStatsAuthoritativeBound='1';
  document.addEventListener('submit',event=>{
    if(event.target?.id!=='form-match-stats'||!coach())return;
    event.preventDefault();event.stopImmediatePropagation();void saveForm();
  },true);
}
function install(){
  if(installed)return;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const renderFn=window.renderStats||(typeof renderStats==='function'?renderStats:null);
    const playerFn=window.openPlayerMatchStats||(typeof openPlayerMatchStats==='function'?openPlayerMatchStats:null);
    const coachModalFn=window.openMatchStatsModal||(typeof openMatchStatsModal==='function'?openMatchStatsModal:null);
    if(typeof renderFn==='function'&&typeof playerFn==='function'&&typeof coachModalFn==='function'){
      clearInterval(timer);installed=true;baseRenderStats=renderFn;baseOpenPlayerMatchStats=playerFn;baseOpenMatchStatsModal=coachModalFn;
      window.renderStats=renderAuthoritative;try{renderStats=renderAuthoritative;}catch(_){}
      window.openPlayerMatchStats=function(id){void openPlayerSafe(id);};try{openPlayerMatchStats=window.openPlayerMatchStats;}catch(_){}
      window.openMatchStatsModal=openCoachModalWithBlocks;try{openMatchStatsModal=openCoachModalWithBlocks;}catch(_){}
      window.quickPublishMatchStats=function(id){void quickPublish(id);};
      window.archiveMatchStats=function(id){void archive(id);};
      bindFormCapture();
    }else if(tries>180)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
