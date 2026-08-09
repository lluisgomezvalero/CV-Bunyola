(function(){
'use strict';
const st=()=>typeof appState!=='undefined'?appState:null;
const same=(a,b)=>String(a??'')===String(b??'');
function eventByAny(id){return(st()?.events||[]).find(e=>[e.id,e.legacy_id,e.legacyId,e.supabaseId].filter(Boolean).some(v=>same(v,id)))||null;}
function statusClass(status){return status?`is-${status}`:'is-empty';}
function injectCss(){if(document.getElementById('roll-call-status-ui-css'))return;const s=document.createElement('style');s.id='roll-call-status-ui-css';s.textContent=`
.verify-attendance-item.status-row{display:grid!important;grid-template-columns:minmax(170px,1fr) minmax(180px,230px);gap:1rem;align-items:center;padding:.8rem 0}
.roll-call-player{display:flex;flex-direction:column;gap:.25rem}.roll-call-player strong{color:#0f172a}.roll-call-player small{font-size:.75rem}.roll-call-status-select{width:100%;padding:.6rem .7rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:700;color:#0f172a}.roll-call-status-select.is-present{border-color:#86efac;background:#f0fdf4}.roll-call-status-select.is-late{border-color:#fde68a;background:#fffbeb}.roll-call-status-select.is-justified{border-color:#93c5fd;background:#eff6ff}.roll-call-status-select.is-unjustified{border-color:#fca5a5;background:#fef2f2}.roll-call-status-select.is-empty{color:#64748b}
@media(max-width:640px){.verify-attendance-item.status-row{grid-template-columns:1fr}.roll-call-status-select{font-size:16px}}
`;document.head.appendChild(s);}
function renderSelectors(){
 const state=st(),modal=document.getElementById('modal-verify-attendance'),container=document.getElementById('verify-attendance-list-container'),input=document.getElementById('verify-attendance-event-id');
 if(!state||!modal||!container||!input||!modal.classList.contains('active'))return;
 const eventId=input.value,ev=eventByAny(eventId),confirmations=state.trainingConfirmations||[],official=state.attendanceData||[];
 container.innerHTML='';
 for(const p of (state.players||[]).filter(p=>p.active!==false)){
  const eventIds=[ev?.id,ev?.legacy_id,ev?.legacyId,ev?.supabaseId,eventId].filter(Boolean).map(String);
  const playerIds=[p.id,p.legacy_id,p.legacyId,p.supabaseId,p.profile_id].filter(Boolean).map(String);
  const rsvp=confirmations.find(x=>(eventIds.includes(String(x.eventId??''))||eventIds.includes(String(x.eventIdLegacy??'')))&&(playerIds.includes(String(x.playerId??''))||playerIds.includes(String(x.playerIdLegacy??''))));
  const log=official.find(x=>(eventIds.includes(String(x.eventId??''))||eventIds.includes(String(x.eventIdLegacy??'')))&&(playerIds.includes(String(x.playerId??''))||playerIds.includes(String(x.playerIdLegacy??''))));
  const current=log?.status||'';
  const rsvpText=rsvp?.status==='yes'?'✓ Dijo que sí':rsvp?.status==='no'?'✗ Dijo que no':'Sin respuesta previa';
  const rsvpClass=rsvp?.status==='yes'?'rsvp-tag-yes':rsvp?.status==='no'?'rsvp-tag-no':'rsvp-tag-none';
  const row=document.createElement('div');row.className='verify-attendance-item status-row';
  row.innerHTML=`<div class="roll-call-player"><strong>#${p.number??''} ${p.name||p.username||'Jugadora'}</strong><small><span class="${rsvpClass}">${rsvpText}</span></small></div><select id="verify-status-${p.id}" class="roll-call-status-select ${statusClass(current)}"><option value="" ${!current?'selected':''}>Sin validar</option><option value="present" ${current==='present'?'selected':''}>Presente</option><option value="late" ${current==='late'?'selected':''}>Tarde</option><option value="justified" ${current==='justified'?'selected':''}>Justificada</option><option value="unjustified" ${current==='unjustified'?'selected':''}>No justificada</option></select>`;
  const sel=row.querySelector('select');sel?.addEventListener('change',()=>{sel.className=`roll-call-status-select ${statusClass(sel.value)}`;});container.appendChild(row);
 }
 try{window.lucide?.createIcons?.();}catch(_){}
}
function install(){
 injectCss();
 const modal=document.getElementById('modal-verify-attendance');
 if(!modal){setTimeout(install,200);return;}
 // No sustituye openVerifyAttendanceModal. La capa autoritativa conserva el control total de apertura/cierre.
 const observer=new MutationObserver(()=>{if(modal.classList.contains('active'))requestAnimationFrame(renderSelectors);});
 observer.observe(modal,{attributes:true,attributeFilter:['class']});
 console.info('[RollCallStatusUI] Solo transforma el contenido del modal estable; no intercepta el botón.');
}
setTimeout(install,1800);
})();