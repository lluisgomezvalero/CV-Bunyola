(function(){
'use strict';

const FLAG='__wellnessCoachPain20260811';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let busy=false;
let debounce=null;

function db(){return window.VolleySupabase?.getClient?.()||null;}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}

async function resolvePlayerUuid(value){
  const raw=String(value||'').trim();
  if(UUID.test(raw))return raw;

  const local=(state()?.players||[]).find(p=>
    [p.id,p.supabaseId,p.supabase_id,p.legacy_id,p.legacyId,p.profile_id,p.authId]
      .filter(Boolean).map(String).includes(raw)
  );
  const localUuid=[local?.supabaseId,local?.supabase_id,local?.id,local?.profile_id]
    .find(v=>UUID.test(String(v||'')));
  if(localUuid){
    if(UUID.test(String(local?.id||''))||UUID.test(String(local?.supabaseId||''))||UUID.test(String(local?.supabase_id||''))) {
      return String([local?.supabaseId,local?.supabase_id,local?.id].find(v=>UUID.test(String(v||''))));
    }
  }

  const client=db();
  if(!client||!raw)return null;

  let result=await client.from('players').select('id').eq('legacy_id',raw).maybeSingle();
  if(!result.error&&result.data?.id)return result.data.id;

  if(UUID.test(raw)){
    result=await client.from('players').select('id').eq('profile_id',raw).maybeSingle();
    if(!result.error&&result.data?.id)return result.data.id;
  }
  return null;
}

function findTargetTable(){
  return document.querySelector('#wellness-coach-inspector .wellness-detail-table');
}

async function patchCoachPainColumn(){
  if(busy)return;
  const table=findTargetTable();
  const selector=document.getElementById('wellness-player-inspector');
  if(!table||!selector?.value)return;

  const headers=[...table.querySelectorAll('thead th')];
  let painIndex=headers.findIndex(th=>/^dolor$/i.test(th.textContent.trim()));
  if(painIndex<0)painIndex=headers.findIndex(th=>/hora/i.test(th.textContent.trim()));
  if(painIndex<0)return;

  busy=true;
  try{
    const pid=await resolvePlayerUuid(selector.value);
    if(!pid)return;
    const client=db();if(!client)return;
    const {data,error}=await client
      .from('wellness_entries')
      .select('entry_date,pain_score')
      .eq('player_id',pid)
      .order('entry_date',{ascending:false})
      .limit(60);
    if(error){console.warn('[WellnessCoachPain] No se pudo leer dolor',error);return;}

    if(headers[painIndex].textContent.trim()!=='Dolor')headers[painIndex].textContent='Dolor';
    headers[painIndex].title='Dolor / molestias físicas (0–10)';

    const byDate=new Map((data||[]).map(row=>[String(row.entry_date),row.pain_score]));
    table.querySelectorAll('tbody tr').forEach(row=>{
      const cells=[...row.querySelectorAll('td')];
      if(cells.length<=painIndex)return;
      const date=String(cells[0]?.textContent||'').trim();
      const pain=byDate.get(date);
      const text=(pain===null||pain===undefined)?'—':`${Number(pain)}/10`;
      if(cells[painIndex].textContent.trim()!==text)cells[painIndex].textContent=text;
      cells[painIndex].title='0 = sin dolor · 10 = dolor máximo';
    });
  }finally{busy=false;}
}

function schedule(){
  clearTimeout(debounce);
  debounce=setTimeout(()=>void patchCoachPainColumn(),100);
}

function hookRenderWellness(){
  const base=window.renderWellness;
  if(typeof base!=='function'||base.__wellnessCoachPain)return;
  const wrapped=function(){
    const result=base.apply(this,arguments);
    setTimeout(schedule,0);
    setTimeout(schedule,180);
    setTimeout(schedule,500);
    return result;
  };
  wrapped.__wellnessCoachPain=true;
  window.renderWellness=wrapped;
}

function install(){
  if(window[FLAG])return;
  if(!window.VolleySupabase){setTimeout(install,120);return;}
  window[FLAG]=true;
  hookRenderWellness();
  document.addEventListener('change',event=>{
    if(event.target?.id==='wellness-player-inspector')schedule();
  });
  const view=document.getElementById('view-wellness');
  if(view){
    new MutationObserver(()=>schedule()).observe(view,{childList:true,subtree:true});
  }
  setTimeout(()=>{hookRenderWellness();schedule();},500);
  setTimeout(schedule,1500);
  console.info('[WellnessCoachPain] Columna Dolor autoritativa activa.');
}

setTimeout(install,0);
})();
