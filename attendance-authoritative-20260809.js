(function(){
'use strict';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let installing=false;
let loading=false;
let savingRollCall=false;
let realtimeChannel=null;
let refreshTimer=null;
let allowRollCallOpen=false;
let attendanceReady=false;
let modalObserver=null;

const db=()=>window.VolleySupabase?.getClient?.()||null;
const state=()=>typeof appState!=='undefined'?appState:null;

function localPlayerByAny(id,username){
  const st=state(); if(!st)return null;
  const sid=String(id??''); const uname=String(username??'').toLowerCase();
  return (st.players||[]).find(p=>{
    const ids=[p.id,p.supabaseId,p.legacy_id,p.legacyId,p.profile_id,p.authId].filter(Boolean).map(String);
    return ids.includes(sid)||(uname&&String(p.username||'').toLowerCase()===uname);
  })||null;
}

function localEventByAny(id){
  const st=state(); if(!st)return null;
  const sid=String(id??'');
  return (st.events||[]).find(e=>[e.id,e.legacy_id,e.legacyId].filter(Boolean).map(String).includes(sid))||null;
}

async function resolveEventUuid(id){
  const c=db(); if(!c||!id)return null;
  const sid=String(id);
  if(UUID.test(sid)){
    const {data,error}=await c.from('events').select('id').eq('id',sid).maybeSingle();
    if(!error&&data?.id)return data.id;
  }
  const ev=localEventByAny(id);
  const legacy=ev?.legacy_id||ev?.legacyId||(!UUID.test(sid)?sid:null);
  if(!legacy)return null;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  return error?null:(data?.id||null);
}

async function syncMappings(){
  const c=db(),st=state(); if(!c||!st)return new Map();
  const {data,error}=await c.from('players').select('id,legacy_id,profile_id,profiles:profile_id(username,full_name)');
  const map=new Map(); if(error)return map;
  for(const row of data||[]){
    const local=localPlayerByAny(row.id,row.profiles?.username)||localPlayerByAny(row.legacy_id,row.profiles?.username);
    if(local){
      local.supabaseId=row.id;
      if(row.legacy_id){local.legacy_id=row.legacy_id;local.legacyId=local.legacyId||row.legacy_id;}
      if(row.profile_id)local.profile_id=row.profile_id;
      map.set(String(row.id),local);
    }
  }
  return map;
}

function snapshotAttendance(st){
  return JSON.stringify({
    c:(st.trainingConfirmations||[]).map(x=>[x.eventId,x.playerId,x.status]).sort(),
    a:(st.attendanceData||[]).map(x=>[x.eventId,x.playerId,x.status]).sort()
  });
}

function markAttendanceReady(){
  attendanceReady=true;
  document.documentElement.classList.add('attendance-ready');
}

async function loadAuthoritativeAttendance(opts={}){
  if(loading)return;
  const c=db(),st=state(); if(!c||!st)return;
  loading=true;
  try{
    const before=snapshotAttendance(st);
    const pmap=await syncMappings();
    const {data,error}=await c.from('attendance').select('id,event_id,player_id,player_response,official_status,validated_at,created_at,updated_at');
    if(error){console.warn('[AttendanceAuthoritative] load',error);return;}
    const confirmations=[]; const official=[];
    for(const row of data||[]){
      const p=pmap.get(String(row.player_id))||localPlayerByAny(row.player_id);
      const ev=localEventByAny(row.event_id);
      if(!p||!ev)continue;
      if(row.player_response==='yes'||row.player_response==='no'){
        confirmations.push({id:row.id,eventId:ev.id,eventIdLegacy:ev.legacy_id||ev.legacyId||null,playerId:p.id,playerIdLegacy:p.legacy_id||p.legacyId||null,status:row.player_response,timestamp:row.updated_at||row.created_at,supabaseEventId:row.event_id,supabasePlayerId:row.player_id});
      }
      if(row.official_status){
        official.push({id:row.id,eventId:ev.id,eventIdLegacy:ev.legacy_id||ev.legacyId||null,playerId:p.id,playerIdLegacy:p.legacy_id||p.legacyId||null,playerName:p.name||p.username||'Jugadora',status:row.official_status,source:'supabase',validatedAt:row.validated_at||row.updated_at||row.created_at,supabaseEventId:row.event_id,supabasePlayerId:row.player_id});
      }
    }
    st.trainingConfirmations=confirmations;
    st.attendanceData=official;
    try{saveAppData(st)}catch(_){}
    markAttendanceReady();
    const changed=before!==snapshotAttendance(st);
    if(changed&&!opts.silent){
      try{if(typeof renderHomeDashboard==='function')renderHomeDashboard()}catch(_){}
      try{if(typeof renderHomePortalRSVP==='function')renderHomePortalRSVP()}catch(_){}
      try{if(typeof renderTraining==='function')renderTraining()}catch(_){}
      try{if(typeof renderCoachAttendanceList==='function')renderCoachAttendanceList()}catch(_){}
      try{if(typeof activeSessionId!=='undefined'&&activeSessionId&&typeof renderSessionCenterDetail==='function')renderSessionCenterDetail()}catch(_){}
    }
    return {confirmations,official};
  }finally{loading=false;}
}

async function confirmAttendance(eventId,status,btn){
  if(status!=='yes'&&status!=='no')return;
  const c=db(); if(!c)return;
  if(btn){btn.disabled=true;btn.dataset.originalText=btn.innerHTML;}
  try{
    const eid=await resolveEventUuid(eventId); if(!eid)throw new Error('No se encuentra este entrenamiento en Supabase.');
    const ident=await window.VolleySupabase?.getIdentity?.();
    const pid=ident?.data?.player?.id; if(!pid)throw new Error('No se encuentra la ficha Supabase de la jugadora.');
    const {data:existing,error:findErr}=await c.from('attendance').select('id').eq('event_id',eid).eq('player_id',pid).maybeSingle();
    if(findErr)throw findErr;
    let error=null;
    if(existing?.id)({error}=await c.from('attendance').update({player_response:status,updated_at:new Date().toISOString()}).eq('id',existing.id));
    else ({error}=await c.from('attendance').insert({event_id:eid,player_id:pid,player_response:status}));
    if(error)throw error;
    await loadAuthoritativeAttendance({silent:true});
    try{if(typeof renderHomeDashboard==='function')renderHomeDashboard()}catch(_){}
    try{if(typeof renderHomePortalRSVP==='function')renderHomePortalRSVP()}catch(_){}
    try{if(typeof renderTraining==='function')renderTraining()}catch(_){}
    try{if(typeof activeSessionId!=='undefined'&&String(activeSessionId)===String(eventId)&&typeof renderSessionCenterDetail==='function')renderSessionCenterDetail()}catch(_){}
    if(typeof showToast==='function')showToast(status==='yes'?'Asistencia confirmada.':'Ausencia comunicada.');
  }catch(err){
    console.error('[AttendanceAuthoritative] confirm',err);
    if(typeof showToast==='function')showToast('Error al guardar en Supabase: '+(err.message||err),'error');
  }finally{
    if(btn){btn.disabled=false;if(btn.dataset.originalText)btn.innerHTML=btn.dataset.originalText;}
  }
}

function forceCloseRollCall(){
  allowRollCallOpen=false;
  const modal=document.getElementById('modal-verify-attendance');
  if(modal)modal.classList.remove('active');
}

function drawRollCall(eventId){
  const st=state(); if(!st)return;
  const modal=document.getElementById('modal-verify-attendance');
  const container=document.getElementById('verify-attendance-list-container');
  const input=document.getElementById('verify-attendance-event-id');
  if(!modal||!container||!input)return;
  const ev=localEventByAny(eventId); input.value=ev?.id||eventId;
  const title=document.getElementById('verify-attendance-title');
  if(title&&ev)title.innerHTML=`<i data-lucide="clipboard-check"></i> Pasar Lista: ${ev.title} (${ev.date})`;
  container.innerHTML='';
  const confirmations=st.trainingConfirmations||[],official=st.attendanceData||[];
  for(const p of st.players||[]){
    const rsvp=confirmations.find(x=>String(x.eventId)===String(ev?.id||eventId)&&String(x.playerId)===String(p.id));
    const log=official.find(x=>String(x.eventId)===String(ev?.id||eventId)&&String(x.playerId)===String(p.id));
    const checked=log?['present','late','attended'].includes(log.status):(rsvp?.status==='yes');
    const tag=rsvp?.status==='yes'?'<span class="rsvp-tag-yes">✓ Dijo que Sí</span>':rsvp?.status==='no'?'<span class="rsvp-tag-no">✗ Dijo que No</span>':'<span class="rsvp-tag-none">Sin responder</span>';
    const row=document.createElement('div'); row.className=`verify-attendance-item ${checked?'is-checked':''}`;
    row.innerHTML=`<div style="display:flex;align-items:center;gap:.75rem"><input type="checkbox" id="verify-p-${p.id}" value="${p.id}" ${checked?'checked':''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer"><label for="verify-p-${p.id}" style="cursor:pointer;font-weight:700;color:#0f172a">#${p.number??''} ${p.name}</label></div><div>${tag}</div>`;
    const cb=row.querySelector('input'); cb?.addEventListener('change',()=>row.classList.toggle('is-checked',cb.checked));
    container.appendChild(row);
  }
  if(allowRollCallOpen)modal.classList.add('active');
  try{if(window.lucide)window.lucide.createIcons()}catch(_){}
}

async function openRollCall(eventId){
  allowRollCallOpen=true;
  await loadAuthoritativeAttendance({silent:true});
  if(!allowRollCallOpen)return;
  drawRollCall(eventId);
}

async function saveRollCall(event){
  if(event.target?.id!=='form-verify-attendance')return;
  event.preventDefault(); event.stopImmediatePropagation();
  if(savingRollCall)return;
  savingRollCall=true;
  const form=event.target,btn=form.querySelector('button[type="submit"]');
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  try{
    const st=state(),c=db(),localEventId=document.getElementById('verify-attendance-event-id')?.value;
    const eid=await resolveEventUuid(localEventId); if(!eid)throw new Error('No se encuentra el entrenamiento en Supabase.');
    const pmap=await syncMappings(); let present=0;
    for(const p of st?.players||[]){
      const cb=document.getElementById(`verify-p-${p.id}`); if(!cb)continue;
      const remote=[...pmap.entries()].find(([,lp])=>lp===p)?.[0]||p.supabaseId; if(!remote)continue;
      const status=cb.checked?'present':'unjustified'; if(cb.checked)present++;
      const {data:existing,error:ferr}=await c.from('attendance').select('id').eq('event_id',eid).eq('player_id',remote).maybeSingle(); if(ferr)throw ferr;
      const payload={official_status:status,validated_at:new Date().toISOString()}; let error=null;
      if(existing?.id)({error}=await c.from('attendance').update(payload).eq('id',existing.id));
      else ({error}=await c.from('attendance').insert({event_id:eid,player_id:remote,...payload}));
      if(error)throw error;
    }
    forceCloseRollCall();
    await loadAuthoritativeAttendance({silent:true});
    try{if(typeof renderTraining==='function')renderTraining()}catch(_){}
    try{if(typeof renderHomeDashboard==='function')renderHomeDashboard()}catch(_){}
    try{if(typeof renderCoachAttendanceList==='function')renderCoachAttendanceList()}catch(_){}
    if(typeof showToast==='function')showToast(`Lista validada: ${present} asistencias oficiales computadas.`);
  }catch(err){
    console.error('[AttendanceAuthoritative] roll call',err);
    if(typeof showToast==='function')showToast(err.message||'No se pudo guardar la lista.','error');
  }finally{savingRollCall=false;if(btn){btn.disabled=false;btn.textContent='Confirmar Lista';}}
}

document.addEventListener('submit',saveRollCall,true);

document.addEventListener('click',event=>{
  const modal=document.getElementById('modal-verify-attendance');
  if(!modal)return;
  const button=event.target?.closest?.('button');
  const text=String(button?.textContent||'').trim().toLowerCase();
  const isCancel=button&&modal.contains(button)&&(text.includes('cancelar')||button.classList.contains('modal-close')||button.dataset?.dismiss==='modal');
  const overlayClose=event.target===modal;
  if(isCancel||overlayClose){
    event.preventDefault();
    event.stopImmediatePropagation();
    forceCloseRollCall();
  }
},true);

function installModalGuard(){
  const modal=document.getElementById('modal-verify-attendance');
  if(!modal||modalObserver)return;
  modalObserver=new MutationObserver(()=>{
    if(modal.classList.contains('active')&&!allowRollCallOpen){
      modal.classList.remove('active');
    }
  });
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});
}

function subscribe(){
  const c=db(); if(!c||realtimeChannel)return;
  realtimeChannel=c.channel('attendance-authoritative-live').on('postgres_changes',{event:'*',schema:'public',table:'attendance'},()=>{void loadAuthoritativeAttendance({silent:false})}).subscribe();
}

function installOverrides(){
  if(installing)return; installing=true;
  const wait=()=>{
    if(!window.VolleySupabase||typeof window.renderHomePortalRSVP!=='function'||typeof window.openVerifyAttendanceModal!=='function'){
      setTimeout(wait,150);return;
    }
    window.loadAttendanceFromSupabase=loadAuthoritativeAttendance;
    window.confirmTrainingAttendance=confirmAttendance;
    window.openVerifyAttendanceModal=openRollCall;
    installModalGuard();
    subscribe();
    void loadAuthoritativeAttendance({silent:false});
    if(refreshTimer)clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{void loadAuthoritativeAttendance({silent:false})},5000);
    if(!document.getElementById('attendance-authoritative-css')){
      const style=document.createElement('style');style.id='attendance-authoritative-css';
      style.textContent=`button[onclick*="openVerifyAttendanceModal"]{position:relative!important;z-index:2!important;pointer-events:auto!important}button[onclick*="openVerifyAttendanceModal"] *{pointer-events:none!important}html:not(.attendance-ready) button[onclick*="confirmTrainingAttendance"]{visibility:hidden!important}`;
      document.head.appendChild(style);
    }
    console.info('[AttendanceAuthoritative] Supabase es la única fuente de verdad para asistencia.');
  };
  setTimeout(wait,1200);
}

installOverrides();
})();