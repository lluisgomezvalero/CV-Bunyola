(function(){
'use strict';

const db=()=>window.VolleySupabase?.getClient?.()||null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureField(){
  const form=document.getElementById('form-event');
  if(!form||document.getElementById('event-duration-input')) return;
  const time=document.getElementById('event-time-input')?.closest('.form-group');
  if(!time) return;
  const g=document.createElement('div');
  g.className='form-group event-duration-group';
  g.innerHTML='<label for="event-duration-input">Duración del entrenamiento</label><select id="event-duration-input" class="form-control"><option value="60">1 h (60 min)</option><option value="90">1 h 30 min (90 min)</option><option value="120" selected>2 h (120 min)</option></select>';
  time.parentElement?.appendChild(g);
}

function localDateInMallorca(iso){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
    const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return `${o.year}-${o.month}-${o.day}`;
  }catch(_){return '';}
}

async function resolveRemoteEvent(snapshot){
  const c=db(); if(!c) return null;
  if(snapshot.editingId&&UUID.test(String(snapshot.editingId))){
    const {data}=await c.from('events').select('id,starts_at,payload').eq('id',snapshot.editingId).maybeSingle();
    if(data) return data;
  }
  const {data,error}=await c.from('events').select('id,starts_at,payload,event_type,updated_at').eq('event_type','training').order('updated_at',{ascending:false}).limit(25);
  if(error) throw error;
  return (data||[]).find(row=>{
    const rowTime=String(row.payload?.time||'').slice(0,5);
    return localDateInMallorca(row.starts_at)===snapshot.date && (!snapshot.time||rowTime===String(snapshot.time).slice(0,5));
  })||null;
}

async function persist(snapshot){
  const c=db(); if(!c||snapshot.type!=='Entrenamiento') return;
  let row=null;
  for(let i=0;i<8&&!row;i++){
    if(i) await new Promise(r=>setTimeout(r,400));
    row=await resolveRemoteEvent(snapshot);
  }
  if(!row?.id||!row.starts_at) throw new Error('No se pudo localizar el entrenamiento recién guardado en Supabase.');
  const duration=Number(snapshot.duration);
  const endsAt=new Date(new Date(row.starts_at).getTime()+duration*60000).toISOString();
  const payload={...(row.payload||{}),duration};
  const {error}=await c.from('events').update({ends_at:endsAt,payload,updated_at:new Date().toISOString()}).eq('id',row.id);
  if(error) throw error;
  const st=typeof appState!=='undefined'?appState:null;
  const ev=(st?.events||[]).find(e=>String(e.id)===String(snapshot.editingId)||String(e.supabaseId||'')===String(row.id)||(e.type==='Entrenamiento'&&e.date===snapshot.date&&String(e.time||'').slice(0,5)===String(snapshot.time||'').slice(0,5)));
  if(ev){ev.duration=duration;ev.ends_at=endsAt;ev.endsAt=endsAt;ev.rawPayload={...(ev.rawPayload||{}),duration};try{saveAppData(st)}catch(_){}}
  console.info('[TrainingDuration] guardada',duration,'min',row.id);
}

document.addEventListener('focusin',e=>{if(e.target?.closest?.('#form-event')) ensureField();},true);
document.addEventListener('click',()=>setTimeout(ensureField,0),true);

document.addEventListener('submit',e=>{
  if(e.target?.id!=='form-event') return;
  ensureField();
  const type=document.getElementById('event-type-input')?.value;
  if(type!=='Entrenamiento') return;
  let editingId=null;try{editingId=typeof currentEditingEventId!=='undefined'?currentEditingEventId:null}catch(_){}
  const snapshot={
    type,
    duration:Number(document.getElementById('event-duration-input')?.value||120),
    editingId,
    date:document.getElementById('event-date-input')?.value||'',
    time:document.getElementById('event-time-input')?.value||''
  };
  setTimeout(()=>{persist(snapshot).catch(err=>{console.error('[TrainingDuration]',err);try{showToast('El entrenamiento se guardó, pero no se pudo guardar su duración.','error')}catch(_){}})},250);
},true);

const baseEdit=window.editEventFromModal;
function patchEdit(){
  if(typeof window.editEventFromModal!=='function'||window.editEventFromModal.__durationAuthoritative) return;
  const original=window.editEventFromModal;
  const wrapped=function(eventId){
    const r=original.apply(this,arguments);
    setTimeout(()=>{
      ensureField();
      const st=typeof appState!=='undefined'?appState:null;
      const ev=(st?.events||[]).find(e=>String(e.id)===String(eventId)||String(e.supabaseId||'')===String(eventId));
      const duration=Number(ev?.duration||ev?.rawPayload?.duration||120);
      const select=document.getElementById('event-duration-input');
      if(select&&[60,90,120].includes(duration)) select.value=String(duration);
    },0);
    return r;
  };
  wrapped.__durationAuthoritative=true;
  window.editEventFromModal=wrapped;
}

let tries=0;const timer=setInterval(()=>{ensureField();patchEdit();if(++tries>40)clearInterval(timer)},250);
})();