(function(){
'use strict';

const db=()=>window.VolleySupabase?.getClient?.()||null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTrainingType(value){
  const v=String(value||'').trim().toLowerCase();
  return v==='training'||v==='entrenamiento'||v.includes('entren');
}

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

  const candidates=[];
  if(snapshot.editingId){
    if(UUID.test(String(snapshot.editingId))){
      const {data}=await c.from('events').select('id,starts_at,payload,event_type,updated_at').eq('id',String(snapshot.editingId)).maybeSingle();
      if(data) return data;
    }
    const local=(typeof appState!=='undefined'?(appState.events||[]):[]).find(e=>String(e.id)===String(snapshot.editingId));
    const remoteId=local?.supabaseId||local?.remoteId;
    if(remoteId&&UUID.test(String(remoteId))){
      const {data}=await c.from('events').select('id,starts_at,payload,event_type,updated_at').eq('id',String(remoteId)).maybeSingle();
      if(data) return data;
    }
  }

  const {data,error}=await c.from('events')
    .select('id,starts_at,payload,event_type,updated_at')
    .eq('event_type','training')
    .order('updated_at',{ascending:false})
    .limit(25);
  if(error) throw error;
  candidates.push(...(data||[]));

  const exact=candidates.find(row=>{
    const rowTime=String(row.payload?.time||'').slice(0,5);
    const sameDate=!snapshot.date||localDateInMallorca(row.starts_at)===snapshot.date;
    const sameTime=!snapshot.time||rowTime===String(snapshot.time).slice(0,5);
    return sameDate&&sameTime;
  });
  return exact||candidates[0]||null;
}

async function persist(snapshot){
  const c=db(); if(!c||!isTrainingType(snapshot.type)) return;
  let row=null;
  for(let i=0;i<10&&!row;i++){
    if(i) await new Promise(r=>setTimeout(r,300));
    row=await resolveRemoteEvent(snapshot);
  }
  if(!row?.id||!row.starts_at) throw new Error('No se pudo localizar el entrenamiento recién guardado en Supabase.');

  const duration=[60,90,120].includes(Number(snapshot.duration))?Number(snapshot.duration):120;
  const endsAt=new Date(new Date(row.starts_at).getTime()+duration*60000).toISOString();
  const payload={...(row.payload||{}),duration};
  const {error}=await c.from('events').update({ends_at:endsAt,payload,updated_at:new Date().toISOString()}).eq('id',row.id);
  if(error) throw error;

  const st=typeof appState!=='undefined'?appState:null;
  const ev=(st?.events||[]).find(e=>String(e.id)===String(snapshot.editingId)||String(e.supabaseId||'')===String(row.id)||(isTrainingType(e.type)&&e.date===snapshot.date&&String(e.time||'').slice(0,5)===String(snapshot.time||'').slice(0,5)));
  if(ev){
    ev.duration=duration;
    ev.ends_at=endsAt;
    ev.endsAt=endsAt;
    ev.rawPayload={...(ev.rawPayload||{}),duration};
    try{saveAppData(st)}catch(_){}
  }
  console.info('[TrainingDuration] guardada',duration,'min',row.id);
}

function captureSnapshot(){
  let editingId=null;try{editingId=typeof currentEditingEventId!=='undefined'?currentEditingEventId:null}catch(_){}
  const type=document.getElementById('event-type-input')?.value||document.getElementById('event-type')?.value||'';
  return {
    type,
    duration:Number(document.getElementById('event-duration-input')?.value||120),
    editingId,
    date:document.getElementById('event-date-input')?.value||document.getElementById('event-date')?.value||'',
    time:document.getElementById('event-time-input')?.value||document.getElementById('event-time')?.value||''
  };
}

function queuePersist(){
  ensureField();
  const snapshot=captureSnapshot();
  if(!isTrainingType(snapshot.type)) return;
  setTimeout(()=>{persist(snapshot).catch(err=>{
    console.error('[TrainingDuration]',err);
    try{showToast('El entrenamiento se guardó, pero no se pudo guardar su duración.','error')}catch(_){}
  })},350);
}

document.addEventListener('focusin',e=>{if(e.target?.closest?.('#form-event')) ensureField();},true);
document.addEventListener('click',e=>{
  setTimeout(ensureField,0);
  const submit=e.target?.closest?.('#form-event button[type="submit"], #form-event .btn-primary');
  if(submit) queuePersist();
},true);
document.addEventListener('submit',e=>{if(e.target?.id==='form-event') queuePersist();},true);

function patchEdit(){
  if(typeof window.editEventFromModal!=='function'||window.editEventFromModal.__durationAuthoritative) return;
  const original=window.editEventFromModal;
  const wrapped=function(eventId){
    const r=original.apply(this,arguments);
    setTimeout(async()=>{
      ensureField();
      const st=typeof appState!=='undefined'?appState:null;
      const ev=(st?.events||[]).find(e=>String(e.id)===String(eventId)||String(e.supabaseId||'')===String(eventId));
      let duration=Number(ev?.duration||ev?.rawPayload?.duration||0);
      if(![60,90,120].includes(duration)){
        try{
          const remote=await resolveRemoteEvent({editingId:eventId,date:ev?.date||'',time:ev?.time||''});
          if(remote?.starts_at){
            const c=db();
            const {data}=await c.from('events').select('starts_at,ends_at,payload').eq('id',remote.id).maybeSingle();
            const fromPayload=Number(data?.payload?.duration||0);
            const fromTimes=data?.starts_at&&data?.ends_at?Math.round((new Date(data.ends_at)-new Date(data.starts_at))/60000):0;
            duration=[60,90,120].includes(fromPayload)?fromPayload:fromTimes;
          }
        }catch(_){}
      }
      if(![60,90,120].includes(duration)) duration=120;
      const select=document.getElementById('event-duration-input');
      if(select) select.value=String(duration);
    },0);
    return r;
  };
  wrapped.__durationAuthoritative=true;
  window.editEventFromModal=wrapped;
}

let tries=0;const timer=setInterval(()=>{ensureField();patchEdit();if(++tries>60)clearInterval(timer)},250);
})();
