(function(){
'use strict';

// Se registra antes que cualquier listener antiguo de Pasar Lista.
// Guarda toda la lista con un solo UPSERT en vez de 2 consultas por jugadora.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let saving=false;
const db=()=>window.VolleySupabase?.getClient?.()||null;
const st=()=>typeof appState!=='undefined'?appState:null;

async function eventUuid(value){
  const c=db(); if(!c||!value)return null;
  const id=String(value);
  if(UUID.test(id)){
    const {data}=await c.from('events').select('id').eq('id',id).maybeSingle();
    if(data?.id)return data.id;
  }
  const local=(st()?.events||[]).find(e=>String(e.id)===id||String(e.legacy_id||e.legacyId||'')===id);
  const legacy=local?.legacy_id||local?.legacyId||(!UUID.test(id)?id:null);
  if(!legacy)return null;
  const {data}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();
  return data?.id||null;
}

async function remotePlayerMap(){
  const c=db(),state=st();
  const map=new Map();
  if(!c||!state)return map;
  const {data,error}=await c.from('players').select('id,legacy_id,profile_id,profiles:profile_id(username)');
  if(error)throw error;
  for(const row of data||[]){
    const username=String(row.profiles?.username||'').toLowerCase();
    const local=(state.players||[]).find(p=>
      String(p.supabaseId||'')===String(row.id)||
      String(p.legacy_id||p.legacyId||p.id||'')===String(row.legacy_id||'')||
      (username&&String(p.username||'').toLowerCase()===username)
    );
    if(local){local.supabaseId=row.id;map.set(String(local.id),row.id);}
  }
  return map;
}

async function handleSubmit(event){
  if(event.target?.id!=='form-verify-attendance')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(saving)return;
  saving=true;

  const form=event.target;
  const btn=form.querySelector('button[type="submit"]');
  const original=btn?.innerHTML;
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}

  try{
    const c=db(),state=st();
    if(!c||!state)throw new Error('Supabase no está disponible.');
    const localEventId=document.getElementById('verify-attendance-event-id')?.value;
    const eid=await eventUuid(localEventId);
    if(!eid)throw new Error('No se encuentra el entrenamiento en Supabase.');

    const [playersMap,identity]=await Promise.all([
      remotePlayerMap(),
      window.VolleySupabase?.getIdentity?.()
    ]);
    const coachId=identity?.data?.profile?.id||null;
    const now=new Date().toISOString();
    const rows=[];
    let present=0;

    for(const player of state.players||[]){
      const cb=document.getElementById(`verify-p-${player.id}`);
      if(!cb)continue;
      const playerId=playersMap.get(String(player.id))||player.supabaseId;
      if(!playerId)continue;
      const officialStatus=cb.checked?'present':'unjustified';
      if(cb.checked)present++;
      rows.push({
        event_id:eid,
        player_id:playerId,
        official_status:officialStatus,
        validated_by:UUID.test(String(coachId||''))?coachId:null,
        validated_at:now,
        updated_at:now
      });
    }

    if(!rows.length)throw new Error('No se han encontrado jugadoras vinculadas a Supabase.');

    // Una sola petición para toda la plantilla. Los campos no incluidos, como
    // player_response, se conservan al actualizar las filas existentes.
    const {error}=await c.from('attendance').upsert(rows,{onConflict:'event_id,player_id'});
    if(error)throw error;

    if(typeof window.forceCloseRollCallAuthoritative==='function')window.forceCloseRollCallAuthoritative();
    else document.getElementById('modal-verify-attendance')?.classList.remove('active');

    if(typeof window.loadAttendanceFromSupabase==='function'){
      await window.loadAttendanceFromSupabase({silent:true,force:true});
    }
    try{if(typeof renderTraining==='function')renderTraining()}catch(_){}
    try{if(typeof renderHomeDashboard==='function')renderHomeDashboard()}catch(_){}
    try{if(typeof renderCoachAttendanceList==='function')renderCoachAttendanceList()}catch(_){}
    if(typeof showToast==='function')showToast(`Lista validada: ${present} asistencias oficiales computadas.`);
  }catch(error){
    console.error('[AttendanceBatchSave]',error);
    if(typeof showToast==='function')showToast(error.message||'No se pudo guardar la lista.','error');
  }finally{
    saving=false;
    if(btn){btn.disabled=false;btn.innerHTML=original||'Confirmar Lista';}
  }
}

document.addEventListener('submit',handleSubmit,true);
console.info('[AttendanceBatchSave] Guardado en lote activado.');
})();