(function(){
'use strict';

// Guardado rápido de Pasar Lista.
// IMPORTANTE: una casilla desmarcada NO equivale a ausencia no justificada.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let saving=false;
const db=()=>window.VolleySupabase?.getClient?.()||null;
const st=()=>typeof appState!=='undefined'?appState:null;
async function eventUuid(value){const c=db();if(!c||!value)return null;const id=String(value);if(UUID.test(id))return id;const local=(st()?.events||[]).find(e=>String(e.id)===id||String(e.legacy_id||e.legacyId||'')===id);const direct=local?.supabaseId||local?.supabase_id;if(direct&&UUID.test(String(direct)))return String(direct);const legacy=local?.legacy_id||local?.legacyId||id;const{data,error}=await c.from('events').select('id').eq('legacy_id',String(legacy)).maybeSingle();if(error)throw error;return data?.id||null;}
async function ensureMissingPlayerIds(players){const missing=players.filter(p=>!UUID.test(String(p.supabaseId||'')));if(!missing.length)return;const c=db(),{data,error}=await c.from('players').select('id,legacy_id,profile_id,profiles:profile_id(username)');if(error)throw error;for(const row of data||[]){const username=String(row.profiles?.username||'').toLowerCase(),local=missing.find(p=>String(p.legacy_id||p.legacyId||p.id||'')===String(row.legacy_id||'')||(username&&String(p.username||'').toLowerCase()===username));if(local)local.supabaseId=row.id;}}
async function handleSubmit(event){
 if(event.target?.id!=='form-verify-attendance')return;event.preventDefault();event.stopImmediatePropagation();if(saving)return;saving=true;
 const form=event.target,btn=form.querySelector('button[type="submit"]'),original=btn?.innerHTML;if(btn){btn.disabled=true;btn.textContent='Guardando…';}
 try{
  const c=db(),state=st();if(!c||!state)throw new Error('Supabase no está disponible.');
  const eid=await eventUuid(document.getElementById('verify-attendance-event-id')?.value);if(!eid)throw new Error('No se encuentra el entrenamiento en Supabase.');
  await ensureMissingPlayerIds(state.players||[]);
  const user=typeof getCurrentUser==='function'?getCurrentUser():null,coachCandidate=user?.authId||user?.id||null,coachId=UUID.test(String(coachCandidate||''))?coachCandidate:null,now=new Date().toISOString();
  // Solo escribimos PRESENTE para las marcadas. Las desmarcadas conservan su estado previo
  // (o null). Justificada/no justificada/tarde deben elegirse explícitamente en la UI correspondiente.
  const presentRows=[];let present=0;
  for(const player of state.players||[]){const cb=document.getElementById(`verify-p-${player.id}`);if(!cb||!cb.checked)continue;const playerId=player.supabaseId;if(!UUID.test(String(playerId||'')))continue;present++;presentRows.push({event_id:eid,player_id:playerId,official_status:'present',validated_by:coachId,validated_at:now,updated_at:now});}
  if(presentRows.length){const{error}=await c.from('attendance').upsert(presentRows,{onConflict:'event_id,player_id'});if(error)throw error;}
  if(typeof window.forceCloseRollCallAuthoritative==='function')window.forceCloseRollCallAuthoritative();else document.getElementById('modal-verify-attendance')?.classList.remove('active');
  if(typeof showToast==='function')showToast(`Lista guardada: ${present} presentes. Las no marcadas no se clasifican automáticamente.`);
  try{if(typeof renderTraining==='function')renderTraining()}catch(_){}try{if(typeof renderHomeDashboard==='function')renderHomeDashboard()}catch(_){}
  setTimeout(async()=>{try{if(typeof window.loadAttendanceFromSupabase==='function')await window.loadAttendanceFromSupabase({silent:true,force:true});if(typeof renderCoachAttendanceList==='function')renderCoachAttendanceList();if(typeof renderHomeDashboard==='function')renderHomeDashboard();}catch(error){console.warn('[AttendanceBatchSave] post-refresh',error);}},0);
 }catch(error){console.error('[AttendanceBatchSave]',error);if(typeof showToast==='function')showToast(error.message||'No se pudo guardar la lista.','error');}
 finally{saving=false;if(btn){btn.disabled=false;btn.innerHTML=original||'Confirmar Lista';}}
}
document.addEventListener('submit',handleSubmit,true);
console.info('[AttendanceBatchSave] Lista segura: desmarcado != ausencia.');
})();