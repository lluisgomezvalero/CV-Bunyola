(function(){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let installed=false,saving=false;
const db=()=>window.VolleySupabase?.getClient?.()||null;
const toast=(msg,type)=>{try{if(typeof showToast==='function')showToast(msg,type);}catch(_){}};

function localEventByAny(id){
  try{
    const sid=String(id??'');
    return (appState?.events||[]).find(e=>[e.id,e.supabaseId,e.supabase_id,e.legacy_id,e.legacyId].filter(Boolean).map(String).includes(sid))||null;
  }catch(_){return null;}
}

async function resolveEventUuid(value){
  const c=db(); if(!c||!value)return null;
  const raw=String(value);
  if(UUID.test(raw))return raw;
  const ev=localEventByAny(raw);
  const direct=ev?.supabaseId||ev?.supabase_id;
  if(UUID.test(String(direct||'')))return String(direct);
  const legacy=ev?.legacy_id||ev?.legacyId||raw;
  const {data,error}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  return data?.id||null;
}

function durationFromEvent(row){
  if(!row)return null;
  const start=row.starts_at?new Date(row.starts_at):null;
  const end=row.ends_at?new Date(row.ends_at):null;
  if(start&&end&&!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&end>start){
    return Math.round((end-start)/60000);
  }
  const fallback=Number(row.payload?.duration);
  return Number.isFinite(fallback)&&fallback>0?Math.round(fallback):null;
}

async function loadRollCallContext(){
  const c=db(); if(!c)throw new Error('Supabase no está disponible.');
  const hidden=document.getElementById('verify-attendance-event-id');
  const eid=await resolveEventUuid(hidden?.value);
  if(!UUID.test(String(eid||'')))throw new Error('No se encuentra el entrenamiento en Supabase.');
  const [{data:event,error:eventError},{data:attendance,error:attendanceError}]=await Promise.all([
    c.from('events').select('id,starts_at,ends_at,payload').eq('id',eid).maybeSingle(),
    c.from('attendance').select('player_id,official_status,effective_minutes').eq('event_id',eid)
  ]);
  if(eventError)throw eventError;
  if(attendanceError)throw attendanceError;
  const duration=durationFromEvent(event);
  if(!duration)throw new Error('No se ha podido determinar la duración del entrenamiento.');
  return{eid,duration,attendance:attendance||[]};
}

function setLateVisibility(select){
  const row=select.closest('.verify-attendance-item');
  const wrap=row?.querySelector('.roll-call-effective-minutes-wrap');
  const input=wrap?.querySelector('.roll-call-effective-minutes');
  const late=select.value==='late';
  if(wrap)wrap.hidden=!late;
  if(input)input.required=late;
}

async function enhanceModal(){
  const modal=document.getElementById('modal-verify-attendance');
  if(!modal?.classList.contains('active'))return;
  let ctx;
  try{ctx=await loadRollCallContext();}catch(error){console.warn('[RollCallEffectiveMinutes] context',error);return;}
  modal.dataset.sessionDuration=String(ctx.duration);
  const byPlayer=new Map(ctx.attendance.map(r=>[String(r.player_id),r]));
  const selects=[...modal.querySelectorAll('.roll-call-status-select')];
  for(const select of selects){
    const row=select.closest('.verify-attendance-item'); if(!row)continue;
    let statusArea=select.closest('.roll-call-status-area');
    if(!statusArea){
      statusArea=document.createElement('div');
      statusArea.className='roll-call-status-area';
      select.parentNode.insertBefore(statusArea,select);
      statusArea.appendChild(select);
    }
    let wrap=statusArea.querySelector('.roll-call-effective-minutes-wrap');
    if(!wrap){
      wrap=document.createElement('label');
      wrap.className='roll-call-effective-minutes-wrap';
      wrap.innerHTML=`<span>Minutos realizados</span><input class="roll-call-effective-minutes" type="number" inputmode="numeric" min="1" step="1"><small></small>`;
      statusArea.appendChild(wrap);
    }
    const input=wrap.querySelector('.roll-call-effective-minutes');
    const help=wrap.querySelector('small');
    input.max=String(ctx.duration);
    input.placeholder=`Máx. ${ctx.duration}`;
    help.textContent=`de ${ctx.duration} min programados`;
    const remote=byPlayer.get(String(select.dataset.playerUuid||''));
    if(remote?.effective_minutes!=null&&!input.value)input.value=String(remote.effective_minutes);
    if(select.dataset.effectiveMinutesBound!=='1'){
      select.dataset.effectiveMinutesBound='1';
      select.addEventListener('change',()=>{
        if(select.value!=='late')input.value='';
        setLateVisibility(select);
      });
    }
    setLateVisibility(select);
  }
}

async function saveAuthoritative(){
  if(saving)return;
  saving=true;
  const form=document.getElementById('form-verify-attendance');
  const btn=form?.querySelector('button[data-rollcall-save],button[type="button"].btn-primary,button[type="submit"]');
  const original=btn?.innerHTML;
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  try{
    const c=db(); if(!c)throw new Error('Supabase no está disponible.');
    const ctx=await loadRollCallContext();
    const identity=await window.VolleySupabase?.getIdentity?.();
    const profileId=identity?.data?.profile?.id;
    const coachId=UUID.test(String(profileId||''))?profileId:null;
    const now=new Date().toISOString();
    const rows=[],clearIds=[];
    const counts={present:0,late:0,justified:0,unjustified:0};
    const selects=[...document.querySelectorAll('#verify-attendance-list-container .roll-call-status-select')];
    if(!selects.length)throw new Error('No se han encontrado jugadoras en la lista.');

    for(const select of selects){
      const pid=String(select.dataset.playerUuid||'');
      if(!UUID.test(pid))throw new Error('Hay una jugadora sin vínculo válido con Supabase. Recarga la página e inténtalo de nuevo.');
      const status=String(select.value||'');
      if(['present','late','justified','unjustified'].includes(status)){
        let effectiveMinutes=null;
        if(status==='late'){
          const input=select.closest('.verify-attendance-item')?.querySelector('.roll-call-effective-minutes');
          const value=Number(input?.value);
          if(!Number.isFinite(value)||value<=0)throw new Error('Indica los minutos realizados de todas las jugadoras marcadas como Tarde.');
          if(value>ctx.duration)throw new Error(`Los minutos realizados no pueden superar los ${ctx.duration} min programados.`);
          effectiveMinutes=Math.round(value);
        }
        counts[status]++;
        rows.push({event_id:ctx.eid,player_id:pid,official_status:status,effective_minutes:effectiveMinutes,validated_by:coachId,validated_at:now,updated_at:now});
      }else{
        clearIds.push(pid);
      }
    }

    if(rows.length){
      const {data,error}=await c.from('attendance').upsert(rows,{onConflict:'event_id,player_id'}).select('id,event_id,player_id,official_status,effective_minutes');
      if(error)throw error;
      if((data||[]).length!==rows.length)throw new Error(`Supabase solo confirmó ${(data||[]).length} de ${rows.length} estados.`);
    }
    if(clearIds.length){
      const {error}=await c.from('attendance').update({official_status:null,effective_minutes:null,validated_by:null,validated_at:null,updated_at:now}).eq('event_id',ctx.eid).in('player_id',clearIds);
      if(error)throw error;
    }

    const {data:verified,error:verifyError}=await c.from('attendance').select('player_id,official_status,effective_minutes').eq('event_id',ctx.eid);
    if(verifyError)throw verifyError;
    const verifiedByPlayer=new Map((verified||[]).map(r=>[String(r.player_id),r]));
    for(const expected of rows){
      const got=verifiedByPlayer.get(String(expected.player_id));
      if(got?.official_status!==expected.official_status)throw new Error('La lista no se confirmó correctamente en Supabase.');
      if(expected.official_status==='late'&&Number(got?.effective_minutes)!==Number(expected.effective_minutes))throw new Error('Los minutos de una llegada tarde no se guardaron correctamente.');
      if(expected.official_status!=='late'&&got?.effective_minutes!=null)throw new Error('Se detectaron minutos parciales en una asistencia que no está marcada como Tarde.');
    }

    await window.loadAttendanceFromSupabase?.({silent:true});
    window.forceCloseRollCallAuthoritative?.();
    try{renderTraining();}catch(_){}
    try{renderHomeDashboard();}catch(_){}
    toast(`Lista guardada · ${counts.present} presentes · ${counts.late} tarde · ${counts.justified} justificadas · ${counts.unjustified} no justificadas.`);
  }catch(error){
    console.error('[RollCallEffectiveMinutes] save',error);
    toast(error.message||'No se pudo guardar la lista.','error');
    throw error;
  }finally{
    saving=false;
    if(btn){btn.disabled=false;btn.innerHTML=original||'Guardar y validar asistencia';}
  }
}

function injectStyles(){
  if(document.getElementById('roll-call-effective-minutes-css'))return;
  const style=document.createElement('style');
  style.id='roll-call-effective-minutes-css';
  style.textContent=`
.roll-call-status-area{display:flex;flex-direction:column;gap:.5rem;min-width:0}
.roll-call-effective-minutes-wrap{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:.2rem .55rem;align-items:center;padding:.6rem .7rem;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#854d0e}
.roll-call-effective-minutes-wrap[hidden]{display:none!important}
.roll-call-effective-minutes-wrap span{font-size:.76rem;font-weight:800}
.roll-call-effective-minutes-wrap small{grid-column:1/-1;font-size:.68rem;color:#a16207}
.roll-call-effective-minutes{width:100%;box-sizing:border-box;padding:.45rem .5rem;border:1px solid #facc15;border-radius:8px;background:#fff;font-weight:800;color:#422006;text-align:center}
@media(max-width:640px){.roll-call-effective-minutes{font-size:16px}.roll-call-effective-minutes-wrap{grid-template-columns:minmax(0,1fr) 105px}}
`;
  document.head.appendChild(style);
}

function install(){
  if(installed)return;
  if(typeof window.openVerifyAttendanceModal!=='function'||typeof window.saveRollCallAuthoritative!=='function'||!window.VolleySupabase){
    setTimeout(install,180);return;
  }
  installed=true;
  injectStyles();
  const baseOpen=window.openVerifyAttendanceModal;
  window.openVerifyAttendanceModal=async function(eventId){
    const result=await baseOpen.call(this,eventId);
    await enhanceModal();
    return result;
  };
  window.saveRollCallAuthoritative=saveAuthoritative;
  const modal=document.getElementById('modal-verify-attendance');
  if(modal){
    new MutationObserver(()=>{if(modal.classList.contains('active'))setTimeout(()=>void enhanceModal(),0);}).observe(modal,{attributes:true,attributeFilter:['class']});
    if(modal.classList.contains('active'))void enhanceModal();
  }
  console.info('[RollCallEffectiveMinutes] Minutos efectivos para llegadas tarde activos.');
}

setTimeout(install,0);
})();
