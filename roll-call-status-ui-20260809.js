(function(){
'use strict';
const st=()=>typeof appState!=='undefined'?appState:null;
const same=(a,b)=>String(a??'')===String(b??'');
function eventByAny(id){return(st()?.events||[]).find(e=>[e.id,e.legacy_id,e.legacyId,e.supabaseId].filter(Boolean).some(v=>same(v,id)))||null;}
function statusLabel(status){return({present:'Presente',late:'Tarde',justified:'Justificada',unjustified:'No justificada'})[status]||'Sin validar';}
function statusClass(status){return status?`is-${status}`:'is-empty';}
function injectCss(){if(document.getElementById('roll-call-status-ui-css'))return;const s=document.createElement('style');s.id='roll-call-status-ui-css';s.textContent=`
.verify-attendance-item.status-row{display:grid!important;grid-template-columns:minmax(170px,1fr) minmax(180px,230px);gap:1rem;align-items:center;padding:.8rem 0}
.roll-call-player{display:flex;flex-direction:column;gap:.25rem}.roll-call-player strong{color:#0f172a}.roll-call-player small{font-size:.75rem}.roll-call-status-select{width:100%;padding:.6rem .7rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:700;color:#0f172a}.roll-call-status-select.is-present{border-color:#86efac;background:#f0fdf4}.roll-call-status-select.is-late{border-color:#fde68a;background:#fffbeb}.roll-call-status-select.is-justified{border-color:#93c5fd;background:#eff6ff}.roll-call-status-select.is-unjustified{border-color:#fca5a5;background:#fef2f2}.roll-call-status-select.is-empty{color:#64748b}
@media(max-width:640px){.verify-attendance-item.status-row{grid-template-columns:1fr}.roll-call-status-select{font-size:16px}}
`;document.head.appendChild(s);}
function render(eventId){
 const state=st(),modal=document.getElementById('modal-verify-attendance'),container=document.getElementById('verify-attendance-list-container'),input=document.getElementById('verify-attendance-event-id');if(!state||!modal||!container||!input)return;
 const ev=eventByAny(eventId);input.value=ev?.id||eventId;const title=document.getElementById('verify-attendance-title');if(title&&ev)title.innerHTML=`<i data-lucide="clipboard-check"></i> Pasar Lista: ${ev.title||'Entrenamiento'} (${ev.date||''})`;
 const confirmations=state.trainingConfirmations||[],official=state.attendanceData||[];container.innerHTML='';
 for(const p of state.players||[]){
  const rsvp=confirmations.find(x=>same(x.eventId,ev?.id||eventId)&&same(x.playerId,p.id));
  const log=official.find(x=>same(x.eventId,ev?.id||eventId)&&same(x.playerId,p.id));
  const current=log?.status||'';
  const rsvpText=rsvp?.status==='yes'?'✓ Dijo que sí':rsvp?.status==='no'?'✗ Dijo que no':'Sin respuesta previa';
  const rsvpClass=rsvp?.status==='yes'?'rsvp-tag-yes':rsvp?.status==='no'?'rsvp-tag-no':'rsvp-tag-none';
  const row=document.createElement('div');row.className='verify-attendance-item status-row';
  row.innerHTML=`<div class="roll-call-player"><strong>#${p.number??''} ${p.name||p.username||'Jugadora'}</strong><small><span class="${rsvpClass}">${rsvpText}</span></small></div><select id="verify-status-${p.id}" class="roll-call-status-select ${statusClass(current)}" aria-label="Estado de ${p.name||'jugadora'}"><option value="" ${!current?'selected':''}>Sin validar</option><option value="present" ${current==='present'?'selected':''}>Presente</option><option value="late" ${current==='late'?'selected':''}>Tarde</option><option value="justified" ${current==='justified'?'selected':''}>Justificada</option><option value="unjustified" ${current==='unjustified'?'selected':''}>No justificada</option></select>`;
  const sel=row.querySelector('select');sel?.addEventListener('change',()=>{sel.className=`roll-call-status-select ${statusClass(sel.value)}`;sel.title=statusLabel(sel.value);});container.appendChild(row);
 }
 modal.classList.add('active');try{window.lucide?.createIcons?.();}catch(_){}
}
async function open(eventId){
 try{if(typeof window.loadAttendanceFromSupabase==='function')await window.loadAttendanceFromSupabase({silent:true,force:true});}catch(e){console.warn('[RollCallStatusUI] hydrate',e);}render(eventId);
}
function install(){injectCss();if(typeof window.openVerifyAttendanceModal!=='function'){setTimeout(install,200);return;}window.openVerifyAttendanceModal=open;console.info('[RollCallStatusUI] Selector Presente/Tarde/Justificada/No justificada activado.');}
setTimeout(install,1500);
})();