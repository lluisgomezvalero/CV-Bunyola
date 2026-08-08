(function(){
  'use strict';
  let channel=null;
  function c(){return window.VolleySupabase?.getClient?.()||null;}
  function st(){return typeof appState!=='undefined'?appState:null;}
  function playerByRemote(id){return (st()?.players||[]).find(p=>String(p.supabaseId||'')===String(id)||String(p.id)===String(id)||String(p.legacy_id||'')===String(id))||null;}
  function eventByRemote(id){return (st()?.events||[]).find(e=>String(e.id)===String(id)||String(e.legacyId||e.legacy_id||'')===String(id))||null;}
  async function syncRpe(){
    const client=c(),s=st();if(!client||!s)return;
    const {data,error}=await client.from('rpe_entries').select('id,event_id,player_id,coach_profile_id,score,source,created_at');if(error)return;
    s.trainingRPEs=Array.isArray(s.trainingRPEs)?s.trainingRPEs:[];
    (data||[]).forEach(row=>{const ev=eventByRemote(row.event_id);if(!ev)return;if(row.source==='coach'&&!row.player_id){ev.coachRpe=Number(row.score);return;}const p=playerByRemote(row.player_id);if(!p)return;const old=s.trainingRPEs.find(r=>String(r.eventId)===String(ev.id)&&String(r.playerId)===String(p.id));const v={eventId:ev.id,playerId:p.id,rpeVal:Number(row.score),date:ev.date||row.created_at?.slice(0,10),addedByCoach:row.source==='coach_for_player',supabaseId:row.id};if(old)Object.assign(old,v);else s.trainingRPEs.push(v);});
  }
  async function syncFeedback(){
    const client=c(),s=st();if(!client||!s||typeof activeSessionId==='undefined'||!activeSessionId)return;
    const ev=eventByRemote(activeSessionId);if(!ev)return;
    const {data,error}=await client.from('session_feedback').select('id,event_id,player_id,kind,comment_text,assessment,continuity_notes,created_at,updated_at').eq('event_id',ev.id);if(error)return;
    s.sessionPlayerComments=Array.isArray(s.sessionPlayerComments)?s.sessionPlayerComments:[];
    (data||[]).forEach(row=>{if(row.kind==='coach_assessment'){ev.coachAssessment=row.assessment||'';ev.coachNotes=row.continuity_notes||'';ev._coachFeedbackSaved=true;return;}const p=playerByRemote(row.player_id);if(!p)return;const old=s.sessionPlayerComments.find(x=>String(x.eventId)===String(ev.id)&&String(x.playerId)===String(p.id));const v={id:row.id,eventId:ev.id,playerId:p.id,text:row.comment_text||'',createdAt:row.created_at,updatedAt:row.updated_at,supabase:true};if(old)Object.assign(old,v);else s.sessionPlayerComments.push(v);});
  }
  function install(){
    if(window.__appCorrectionsLiveInstalled)return;
    if(typeof window.toggleTrainingHistoryDetail!=='function'){setTimeout(install,180);return;}
    window.__appCorrectionsLiveInstalled=true;
    const baseToggle=window.toggleTrainingHistoryDetail;
    window.toggleTrainingHistoryDetail=async function(eventId){await syncRpe();return baseToggle.call(this,eventId);};
    const client=c();if(client&&!channel){channel=client.channel('app-corrections-live').on('postgres_changes',{event:'*',schema:'public',table:'rpe_entries'},async()=>{await syncRpe();try{if(document.getElementById('view-training')?.classList.contains('active'))renderTraining();if(document.getElementById('view-wellness')?.classList.contains('active'))renderWellness();if(typeof activeSessionId!=='undefined'&&activeSessionId)renderSessionCenterDetail();}catch(_){}}).on('postgres_changes',{event:'*',schema:'public',table:'session_feedback'},async()=>{await syncFeedback();try{if(typeof activeSessionId!=='undefined'&&activeSessionId)renderSessionCenterDetail();}catch(_){}}).on('postgres_changes',{event:'*',schema:'public',table:'wellness_entries'},()=>{try{if(document.getElementById('view-wellness')?.classList.contains('active'))renderWellness();}catch(_){}}).subscribe();}
  }
  if(document.readyState==='complete')setTimeout(install,50);else window.addEventListener('load',()=>setTimeout(install,50),{once:true});
})();
