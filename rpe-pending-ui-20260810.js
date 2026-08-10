(function(){
'use strict';
let busy=false;
const db=()=>window.VolleySupabase?.getClient?.()||null;
const state=()=>typeof appState!=='undefined'?appState:null;
const isPlayer=()=>{try{return !!getCurrentUser?.()?.playerId}catch(_){return false}};
function refresh(){try{renderHomeDashboard?.()}catch(_){}try{renderTraining?.()}catch(_){} }
async function syncPendingRpe(){
 if(busy||!isPlayer())return; const c=db(),s=state(); if(!c||!s)return; busy=true;
 try{
  const ident=await window.VolleySupabase.getIdentity(); const pid=ident?.data?.player?.id; if(!pid)return;
  const {data:rows,error}=await c.from('rpe_entries').select('event_id,score,source').eq('player_id',pid); if(error)throw error;
  const answered=new Set((rows||[]).filter(r=>r.source==='player'||r.source==='coach_for_player').map(r=>String(r.event_id)));
  for(const e of s.events||[]){
   const remote=String(e.supabaseId||e.supabase_id||e.id||'');
   const local=String(e.id||'');
   const has=answered.has(remote);
   if(has){
    s.trainingRPEs=Array.isArray(s.trainingRPEs)?s.trainingRPEs:[];
    // La capa autoritativa rellena el valor; aquí solo garantizamos que el dashboard no lo marque pendiente.
    e.rpePending=false; e.pendingRpe=false; e.rpeAnswered=true;
   } else { delete e.rpeAnswered; }
  }
  refresh();
 }catch(err){console.warn('[RpePendingUI]',err)}finally{busy=false;}
}
function install(){
 const wait=()=>{if(!window.VolleySupabase||typeof window.loadRpeFromSupabase!=='function'){setTimeout(wait,250);return;} window.syncPendingRpeFromSupabase=syncPendingRpe; void syncPendingRpe(); setInterval(syncPendingRpe,4000);};
 setTimeout(wait,1800);
}
install();
})();