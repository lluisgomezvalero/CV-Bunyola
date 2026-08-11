(function () {
  'use strict';

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const HIGH_RPE = 8;
  const WEEKLY_HIGH_MEAN = 7.5;
  let feedbackChannel = null;
  let planReadsChannel = null;
  let wellnessSyncBusy = false;
  let planHydrateBusy = false;

  function client(){ return window.VolleySupabase?.getClient?.() || null; }
  function state(){ return typeof appState !== 'undefined' ? appState : null; }
  function user(){ try { return typeof getCurrentUser === 'function' ? getCurrentUser() : null; } catch (_) { return null; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function localPlayerByAnyId(value){
    const s = String(value ?? '');
    return (state()?.players || []).find(p => [p.id,p.supabaseId,p.legacy_id,p.legacyId,p.profile_id,p.authId].filter(Boolean).map(String).includes(s)) || null;
  }
  function eventByAnyId(value){
    const s = String(value ?? '');
    return (state()?.events || []).find(e => [e.id,e.legacyId,e.legacy_id].filter(Boolean).map(String).includes(s)) || null;
  }
  async function eventUuid(eventId){
    if (!eventId) return null;
    if (UUID_RE.test(String(eventId))) return String(eventId);
    const c=client(); if(!c) return null;
    const {data,error}=await c.from('events').select('id').eq('legacy_id',String(eventId)).maybeSingle();
    if(error){ console.warn('[Corrections] event UUID',error); return null; }
    return data?.id||null;
  }
  async function playerUuid(playerId){
    const p=localPlayerByAnyId(playerId);
    if(p?.supabaseId && UUID_RE.test(String(p.supabaseId))) return p.supabaseId;
    const u=user();
    if(u?.supabasePlayerId && (!playerId || String(playerId)===String(u.playerId))) return u.supabasePlayerId;
    if(UUID_RE.test(String(playerId||''))) return String(playerId);
    const identity=await window.VolleySupabase?.getIdentity?.();
    if(!playerId || String(playerId)===String(u?.playerId)) return identity?.data?.player?.id||null;
    return null;
  }

  function injectStyles(){
    if(document.getElementById('app-corrections-style')) return;
    const style=document.createElement('style'); style.id='app-corrections-style';
    style.textContent=`
      @media (min-width: 769px){ .session-detail-hero .session-back-button{display:none!important;} }
      .correction-completed{display:flex;gap:.75rem;align-items:flex-start;padding:1rem;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;color:#166534;margin-top:.75rem}.correction-completed i{width:20px;flex:0 0 auto}.correction-completed strong{display:block;color:#166534}.correction-completed span,.correction-completed p{display:block;margin:.15rem 0 0;color:#475569;white-space:pre-wrap}.session-delete-btn{border-color:#fecaca!important;color:#b91c1c!important}.wellness-coach-inspector{margin-top:2rem}.wellness-inspector-toolbar{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem}.wellness-inspector-toolbar select{max-width:320px}.wellness-detail-table{width:100%;border-collapse:collapse;font-size:.86rem}.wellness-detail-table th,.wellness-detail-table td{padding:.7rem;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}.wellness-detail-table th{color:#475569;background:#f8fafc}.load-alerts{display:grid;gap:.7rem;margin:1rem 0}.load-alert{padding:.85rem 1rem;border-radius:12px;border:1px solid #fed7aa;background:#fff7ed}.load-alert strong{display:block;color:#9a3412}.load-alert small{color:#78716c}.load-clear{padding:.85rem 1rem;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;color:#166534}.sleep-required-note{font-size:.78rem;color:#64748b;margin-top:.35rem}.wellness-sleep-hours-correction{margin-top:.9rem}.wellness-sleep-hours-correction input{max-width:180px}.plan-read-live-note{font-size:.75rem;color:#64748b;margin-top:.4rem}
    `;
    document.head.appendChild(style);
  }

        async function hydrateSessionFeedback(eventId){
    const c=client(), st=state(); if(!c||!st) return;
    const evId=await eventUuid(eventId); if(!evId) return;
    const {data,error}=await c.from('session_feedback').select('id,event_id,player_id,coach_profile_id,kind,comment_text,assessment,continuity_notes,created_at,updated_at,players(id,legacy_id,profile_id)').eq('event_id',evId);
    if(error){console.warn('[Corrections] feedback fetch',error);return;}
    st.sessionPlayerComments=Array.isArray(st.sessionPlayerComments)?st.sessionPlayerComments:[];
    for(const row of data||[]){
      if(row.kind==='coach_assessment'){
        const ev=eventByAnyId(eventId); if(ev){ev.coachAssessment=row.assessment||'';ev.coachNotes=row.continuity_notes||'';ev._coachFeedbackSaved=true;ev._coachFeedbackSavedAt=row.updated_at||row.created_at;}
      }else if(row.kind==='player_comment'){
        const p=localPlayerByAnyId(row.player_id)||localPlayerByAnyId(row.players?.legacy_id); if(!p) continue;
        const existing=st.sessionPlayerComments.find(x=>String(x.eventId)===String(eventByAnyId(eventId)?.id||eventId)&&String(x.playerId)===String(p.id));
        const mapped={id:row.id,eventId:eventByAnyId(eventId)?.id||eventId,playerId:p.id,text:row.comment_text||'',createdAt:row.created_at,updatedAt:row.updated_at,supabase:true};
        if(existing) Object.assign(existing,mapped); else st.sessionPlayerComments.push(mapped);
      }
    }
  }

  async function saveCoachFeedback(eventId,assessment,notes){
    const c=client(),u=user(); if(!c||!u) throw new Error('Supabase no disponible.');
    const evId=await eventUuid(eventId), coachId=u.authId||u.id; if(!evId||!coachId) throw new Error('No se pudo resolver la sesión.');
    const {data:existing,error:rerr}=await c.from('session_feedback').select('id').eq('event_id',evId).eq('coach_profile_id',coachId).eq('kind','coach_assessment').maybeSingle(); if(rerr) throw rerr;
    const payload={assessment,continuity_notes:notes,updated_at:new Date().toISOString()};
    const q=existing?c.from('session_feedback').update(payload).eq('id',existing.id):c.from('session_feedback').insert({event_id:evId,coach_profile_id:coachId,player_id:null,kind:'coach_assessment',...payload});
    const {error}=await q; if(error) throw error;
  }

  async function savePlayerCommentRemote(eventId,text){
    const c=client(),u=user(); if(!c||!u?.playerId) throw new Error('Supabase no disponible.');
    const evId=await eventUuid(eventId), pid=await playerUuid(u.playerId); if(!evId||!pid) throw new Error('No se pudo resolver la sesión o jugadora.');
    const {data:existing,error:rerr}=await c.from('session_feedback').select('id').eq('event_id',evId).eq('player_id',pid).eq('kind','player_comment').maybeSingle(); if(rerr) throw rerr;
    const payload={comment_text:text,updated_at:new Date().toISOString()};
    const q=existing?c.from('session_feedback').update(payload).eq('id',existing.id):c.from('session_feedback').insert({event_id:evId,player_id:pid,coach_profile_id:null,kind:'player_comment',...payload});
    const {error}=await q; if(error) throw error;
  }

  function postProcessSession(){
    const st=state(); if(!st||typeof activeSessionId==='undefined'||!activeSessionId) return;
    const session=eventByAnyId(activeSessionId); if(!session) return;
    const root=document.getElementById('session-center-detail'); if(!root) return;
    const coach=typeof isCoachUser==='function'&&isCoachUser();
    const sections=[...root.querySelectorAll('.session-panel')];
    if(coach && Number.isFinite(Number(session.coachRpe))){
      const sec=sections.find(s=>s.querySelector('h3')?.textContent.includes('Percepción del esfuerzo'));
      const slider=sec?.querySelector('.training-rpe-slider-wrap');
      if(slider) slider.outerHTML=`<div class="correction-completed"><i data-lucide="circle-check"></i><div><strong>RPE ya contestada</strong><span>Tu valoración quedó registrada con ${Number(session.coachRpe)}/10.</span></div></div>`;
    }
    if(coach && (session._coachFeedbackSaved || String(session.coachAssessment||'').trim() || String(session.coachNotes||'').trim())){
      const sec=sections.find(s=>s.querySelector('h3')?.textContent.includes('Valoración y continuidad'));
      if(sec){sec.innerHTML=`<div class="session-panel-title"><i data-lucide="circle-check"></i><div><span>Solo cuerpo técnico</span><h3>Valoración y continuidad</h3></div></div><div class="correction-completed"><i data-lucide="circle-check"></i><div><strong>Valoración guardada</strong>${session.coachAssessment?`<p><b>Valoración:</b> ${esc(session.coachAssessment)}</p>`:''}${session.coachNotes?`<p><b>Próxima sesión:</b> ${esc(session.coachNotes)}</p>`:''}</div></div>`;}
    }
    if(!coach){
      const u=user(); const comment=(st.sessionPlayerComments||[]).find(c=>String(c.eventId)===String(session.id)&&String(c.playerId)===String(u?.playerId)&&String(c.text||'').trim());
      if(comment){const sec=sections.find(s=>s.querySelector('h3')?.textContent.includes('Mi comentario'));if(sec)sec.innerHTML=`<div class="session-panel-title"><i data-lucide="message-square-check"></i><div><span>Opcional y privado</span><h3>Mi comentario</h3></div></div><div class="correction-completed"><i data-lucide="circle-check"></i><div><strong>Comentario enviado</strong><p>${esc(comment.text)}</p></div></div>`;}
    }
    if(coach){
      const hero=root.querySelector('.session-detail-hero');
      if(hero&&!hero.querySelector('.session-delete-btn')){const b=document.createElement('button');b.className='btn btn-outline btn-sm session-delete-btn';b.innerHTML='<i data-lucide="trash-2"></i> Eliminar';b.onclick=()=>window.deleteTrainingSessionCorrected(session.id);hero.appendChild(b);}
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  async function syncWellness(){
    const c=client(),st=state(); if(!c||!st||wellnessSyncBusy)return;
    wellnessSyncBusy=true;
    try{
      const {data,error}=await c.from('wellness_entries').select('id,player_id,entry_date,general_state,fatigue,soreness,stress,sleep,sleep_hours,pain_score,notes,created_at,updated_at,players(id,legacy_id,profile_id)');
      if(error){console.warn('[Corrections] wellness fetch',error);return;}
      st.wellnessLogs=Array.isArray(st.wellnessLogs)?st.wellnessLogs:[];
      for(const row of data||[]){const p=localPlayerByAnyId(row.player_id)||localPlayerByAnyId(row.players?.legacy_id);if(!p)continue;const existing=st.wellnessLogs.find(l=>String(l.playerId)===String(p.id)&&String(l.dateKey||l.date)===String(row.entry_date));const mapped={id:row.id,playerId:p.id,playerName:p.name,dateKey:row.entry_date,date:row.entry_date,generalState:Number(row.general_state),fatigue:Number(row.fatigue??row.general_state),soreness:row.soreness==null?null:Number(row.soreness),stress:row.stress==null?null:Number(row.stress),sleepQuality:Number(row.sleep),sleep:Number(row.sleep),sleepHours:row.sleep_hours==null?null:Number(row.sleep_hours),painScore:row.pain_score==null?null:Number(row.pain_score),notes:row.notes||'',createdAt:row.created_at,supabase:true};if(existing)Object.assign(existing,mapped);else st.wellnessLogs.push(mapped);}
    }finally{wellnessSyncBusy=false;}
  }

  async function saveWellnessRemote(){
    const c=client(); if(!c)return;
    const localPid=document.getElementById('wellness-player-select')?.value||user()?.playerId;
    const pid=await playerUuid(localPid); if(!pid)return;
    const fatigue=Number(document.getElementById('wellness-fatigue-val')?.value||0);
    const sleep=Number(document.getElementById('wellness-sleep-quality')?.value||0);
    const hours=Number(document.getElementById('wellness-sleep-hours')?.value||0);
    const notes=document.getElementById('wellness-notes')?.value||'';
    const date=typeof getLocalDateKey==='function'?getLocalDateKey():new Date().toLocaleDateString('en-CA');
    const payload={player_id:pid,entry_date:date,general_state:fatigue||3,fatigue:fatigue||null,sleep:sleep||3,sleep_hours:hours||null,notes,updated_at:new Date().toISOString()};
    const {error}=await c.from('wellness_entries').upsert(payload,{onConflict:'player_id,entry_date'});if(error)throw error;
  }

  function ensureSleepHoursField(){
    const group=document.querySelector('#form-wellness .wellness-sleep-question'); if(!group||document.getElementById('wellness-sleep-hours'))return;
    const wrap=document.createElement('div');wrap.className='wellness-sleep-hours-correction';wrap.innerHTML='<label for="wellness-sleep-hours">¿Cuántas horas has dormido?</label><input id="wellness-sleep-hours" class="form-control" type="number" min="0" max="14" step="0.25" placeholder="Ej. 7.5"><div class="sleep-required-note">Obligatorio para poder guardar el cuestionario.</div>';group.appendChild(wrap);
  }

  function removeCoachSleepAverageColumn(){
    if(!(typeof isCoachUser==='function'&&isCoachUser()))return;
    const table=document.querySelector('.borg-matrix-table'); if(!table)return;
    const header=[...table.querySelectorAll('thead th')];const idx=header.findIndex(th=>/sueño medio/i.test(th.textContent));if(idx<0)return;
    header[idx].remove();table.querySelectorAll('tbody tr').forEach(tr=>tr.children[idx]?.remove());
  }

  function computeLoadAlerts(){
    const st=state(); if(!st)return[];
    const now=Date.now(), sevenDays=7*86400000;
    return (st.players||[]).map(p=>{
      const rows=(st.trainingRPEs||[]).filter(r=>String(r.playerId)===String(p.id)&&Number.isFinite(Number(r.rpeVal))).map(r=>{const ev=eventByAnyId(r.eventId);const ts=ev?.date?new Date(ev.date+'T12:00:00').getTime():0;return{score:Number(r.rpeVal),ts,date:ev?.date||r.date};}).filter(x=>x.ts&&now-x.ts<=sevenDays).sort((a,b)=>a.ts-b.ts);
      if(!rows.length)return null;
      const mean=rows.reduce((s,x)=>s+x.score,0)/rows.length;
      let streak=0,maxStreak=0;rows.forEach(x=>{streak=x.score>=HIGH_RPE?streak+1:0;maxStreak=Math.max(maxStreak,streak);});
      if(maxStreak>=3|| (rows.length>=3&&mean>=WEEKLY_HIGH_MEAN))return{player:p,mean,maxStreak,count:rows.length};
      return null;
    }).filter(Boolean);
  }

  async function renderCoachWellnessInspector(){
    if(!(typeof isCoachUser==='function'&&isCoachUser()))return;
    const view=document.getElementById('view-wellness');if(!view)return;
    let panel=document.getElementById('wellness-coach-inspector');if(!panel){panel=document.createElement('section');panel.id='wellness-coach-inspector';panel.className='card wellness-coach-inspector';view.appendChild(panel);}
    const players=state()?.players||[];const selected=panel.dataset.playerId||players[0]?.id||'';
    const logs=(state()?.wellnessLogs||[]).filter(l=>String(l.playerId)===String(selected)).sort((a,b)=>String(b.dateKey||b.date).localeCompare(String(a.dateKey||a.date))).slice(0,30);
    const alerts=computeLoadAlerts();
    panel.innerHTML=`<div class="card-header"><div><h3>Seguimiento individual de bienestar</h3><p>Consulta el cuestionario de cada jugadora. El sueño se muestra por día, no como media del equipo.</p></div></div><div class="load-alerts">${alerts.length?alerts.map(a=>`<div class="load-alert"><strong>${esc(a.player.name)} · revisar carga</strong><small>${a.maxStreak>=3?`${a.maxStreak} sesiones consecutivas con RPE ≥ ${HIGH_RPE}`:''}${a.maxStreak>=3&&a.mean>=WEEKLY_HIGH_MEAN?' · ':''}${a.mean>=WEEKLY_HIGH_MEAN?`media 7 días ${a.mean.toFixed(1)}/10 (${a.count} sesiones)`:''}</small></div>`).join(''):'<div class="load-clear">Sin alertas de carga alta con los criterios actuales.</div>'}</div><div class="wellness-inspector-toolbar"><label for="wellness-player-inspector">Jugadora</label><select id="wellness-player-inspector" class="form-control">${players.map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(selected)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div style="overflow-x:auto"><table class="wellness-detail-table"><thead><tr><th>Fecha</th><th>Estado</th><th>Fatiga</th><th>Sueño del día</th><th>Dolor</th><th>Notas</th></tr></thead><tbody>${logs.length?logs.map(l=>`<tr><td>${esc(l.dateKey||l.date)}</td><td>${l.generalState??l.fatigue??'—'}/5</td><td>${l.fatigue??'—'}/5</td><td>${l.sleepQuality?`${l.sleepQuality}/5`: '—'}</td><td>${l.painScore==null?'—':`${l.painScore}/10`}</td><td>${esc(l.notes||'')}</td></tr>`).join(''):'<tr><td colspan="6">No hay registros para esta jugadora.</td></tr>'}</tbody></table></div>`;
    panel.querySelector('#wellness-player-inspector')?.addEventListener('change',e=>{panel.dataset.playerId=e.target.value;renderCoachWellnessInspector();});
  }

  async function markPlanReadDirect(){
    if(typeof isCoachUser==='function'&&isCoachUser())return;
    const st=state();if(!st||typeof activeScoutingMatchId==='undefined'||!activeScoutingMatchId)return;
    let record;try{record=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return;}
    if(!record||record.status!=='published'||!record.publishedPlan)return;
    const c=client(),evId=await eventUuid(activeScoutingMatchId),pid=await playerUuid(user()?.playerId);if(!c||!evId||!pid)return;
    const version=String(record.publicationVersion||record.publishedAt||'published');
    const {error}=await c.from('game_plan_reads').insert({game_plan_id:null,event_id:evId,player_id:pid,publication_version:version,read_at:new Date().toISOString()});
    if(error&&error.code!=='23505')console.warn('[Corrections] plan read',error);
  }

  async function hydratePlanReadsDirect(rerender){
    if(planHydrateBusy||!(typeof isCoachUser==='function'&&isCoachUser())||typeof activeScoutingMatchId==='undefined'||!activeScoutingMatchId)return;
    let record;try{record=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return;}if(!record||record.status!=='published')return;
    const c=client(),evId=await eventUuid(activeScoutingMatchId);if(!c||!evId)return;planHydrateBusy=true;
    try{const version=String(record.publicationVersion||record.publishedAt||'published');const {data,error}=await c.from('game_plan_reads').select('player_id,read_at,publication_version').eq('event_id',evId).eq('publication_version',version);if(error){console.warn('[Corrections] plan reads fetch',error);return;}const receipts={};for(const row of data||[]){const p=localPlayerByAnyId(row.player_id);if(p)receipts[p.id]={version,viewedAt:row.read_at};}const changed=JSON.stringify(record.readReceipts||{})!==JSON.stringify(receipts);record.readReceipts=receipts;if(state()?.matchScouting)state().matchScouting[activeScoutingMatchId]=record;if(changed&&rerender)rerender();}finally{planHydrateBusy=false;}
  }

  function subscribePlanReads(){
    const c=client();if(!c||planReadsChannel)return;planReadsChannel=c.channel('direct-game-plan-reads').on('postgres_changes',{event:'INSERT',schema:'public',table:'game_plan_reads'},()=>hydratePlanReadsDirect(()=>window.__correctionsBaseRenderTactics?.())).subscribe();
  }

  async function deleteTrainingSession(eventId){
    if(!(typeof isCoachUser==='function'&&isCoachUser()))return;
    const ev=eventByAnyId(eventId);if(!ev)return;if(!confirm(`¿Eliminar el entrenamiento del ${ev.date||''}? Esta acción borrará también asistencia, RPE y feedback asociados.`))return;
    try{const res=await window.VolleySupabase?.deleteEvent?.(eventId);if(res?.error)throw res.error;const st=state();st.events=(st.events||[]).filter(e=>String(e.id)!==String(ev.id));st.trainingConfirmations=(st.trainingConfirmations||[]).filter(r=>String(r.eventId)!==String(ev.id));st.trainingRPEs=(st.trainingRPEs||[]).filter(r=>String(r.eventId)!==String(ev.id));st.attendanceData=(st.attendanceData||[]).filter(r=>String(r.eventId)!==String(ev.id));st.sessionPlayerComments=(st.sessionPlayerComments||[]).filter(r=>String(r.eventId)!==String(ev.id));try{saveAppData(st,{immediate:true});}catch(_){}if(typeof closeSessionCenter==='function')closeSessionCenter(true);if(typeof renderTraining==='function')renderTraining();if(typeof renderGoogleCalendar==='function')renderGoogleCalendar();showToast('Entrenamiento eliminado correctamente.');}catch(error){console.error(error);showToast('No se pudo eliminar el entrenamiento: '+(error.message||'error'),'error');}
  }
  window.deleteTrainingSessionCorrected=deleteTrainingSession;

  function install(){
    if(window.__appCorrections20260809Installed)return;
    if(typeof window.renderSessionCenterDetail!=='function'||typeof window.renderTraining!=='function'||typeof window.renderWellness!=='function'){setTimeout(install,150);return;}
    window.__appCorrections20260809Installed=true;injectStyles();ensureSleepHoursField();

    const baseSessionRender=window.renderSessionCenterDetail;
    window.renderSessionCenterDetail=function(){const r=baseSessionRender.apply(this,arguments);postProcessSession();return r;};
    const baseOpenSession=window.openSessionCenter;
    window.openSessionCenter=function(eventId,returnTarget){const r=baseOpenSession.call(this,eventId,returnTarget);Promise.resolve(hydrateSessionFeedback(eventId)).then(()=>window.renderSessionCenterDetail());return r;};

    window.saveSessionCoachNotes=async function(eventId){if(!(typeof isCoachUser==='function'&&isCoachUser()))return;const session=eventByAnyId(eventId);if(!session)return;const assessment=document.getElementById('session-coach-assessment')?.value.trim()||'';const notes=document.getElementById('session-coach-notes')?.value.trim()||'';try{await saveCoachFeedback(eventId,assessment,notes);session.coachAssessment=assessment;session.coachNotes=notes;session._coachFeedbackSaved=true;session._coachFeedbackSavedAt=new Date().toISOString();try{saveAppData(state());}catch(_){}showToast('Valoración de la sesión guardada');window.renderSessionCenterDetail();}catch(error){console.error(error);showToast(error.message||'No se pudo guardar la valoración.','error');}};

    window.saveSessionPlayerComment=async function(eventId){const u=user();if(!u?.playerId)return;const text=document.getElementById('session-player-comment')?.value.trim()||'';if(!text){showToast('Escribe un comentario antes de guardarlo.','error');return;}try{await savePlayerCommentRemote(eventId,text);await hydrateSessionFeedback(eventId);try{saveAppData(state());}catch(_){}showToast('Comentario guardado');window.renderSessionCenterDetail();}catch(error){console.error(error);showToast(error.message||'No se pudo guardar el comentario.','error');}};

    const form=document.getElementById('form-wellness');
    form?.addEventListener('submit',event=>{const sleep=document.getElementById('wellness-sleep-quality')?.value;const hours=document.getElementById('wellness-sleep-hours')?.value;if(!sleep){event.preventDefault();event.stopImmediatePropagation();showToast('Te falta indicar cómo has dormido.','error');return;}if(hours===''||hours==null||!Number.isFinite(Number(hours))){event.preventDefault();event.stopImmediatePropagation();showToast('Te falta indicar cuántas horas has dormido.','error');return;}setTimeout(()=>saveWellnessRemote().then(syncWellness).catch(error=>{console.error(error);showToast('El bienestar se guardó localmente, pero no se pudo sincronizar con Supabase.','error');}),0);},true);

    const wellnessModal=document.getElementById('modal-add-wellness');if(wellnessModal){new MutationObserver(()=>{if(wellnessModal.classList.contains('active'))ensureSleepHoursField();}).observe(wellnessModal,{attributes:true,attributeFilter:['class']});}

    const baseWellness=window.renderWellness;
    window.renderWellness=function(){const r=baseWellness.apply(this,arguments);removeCoachSleepAverageColumn();renderCoachWellnessInspector();if(!wellnessSyncBusy)syncWellness().then(()=>{baseWellness();removeCoachSleepAverageColumn();renderCoachWellnessInspector();});return r;};

    const baseTactics=window.renderTactics;
    window.__correctionsBaseRenderTactics=baseTactics;
    window.renderTactics=function(){const r=baseTactics.apply(this,arguments);if(typeof isCoachUser==='function'&&isCoachUser()){hydratePlanReadsDirect(()=>baseTactics());subscribePlanReads();}else markPlanReadDirect();return r;};

    syncWellness().then(()=>{try{if(document.getElementById('view-wellness')?.classList.contains('active'))window.renderWellness();}catch(_){}});
    console.info('[AppCorrections] Correcciones de sesión, bienestar, carga y lectura del plan activadas.');
  }

  if(document.readyState==='complete')setTimeout(install,0);else window.addEventListener('load',()=>setTimeout(install,0),{once:true});
})();
