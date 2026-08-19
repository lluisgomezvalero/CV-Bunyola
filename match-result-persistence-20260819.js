(function(){
'use strict';

const FLAG='__matchResultPersistence20260819';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso','Torneo']);
let capturedResult=null;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function normalize(value){
  const text=String(value??'').trim().replace(/[–—:]/g,'-').replace(/\s+/g,'');
  if(!text)return null;
  const match=text.match(/^(\d+)-(\d+)$/);
  if(!match)return null;
  const own=Number(match[1]);
  const rival=Number(match[2]);
  if(!Number.isInteger(own)||!Number.isInteger(rival)||own<0||rival<0||own>5||rival>5)return null;
  return `${own}-${rival}`;
}
function findEvent(evtOrId){
  const s=state();if(!s)return null;
  const id=typeof evtOrId==='object'?evtOrId?.id:evtOrId;
  if(!id)return typeof evtOrId==='object'?evtOrId:null;
  return (s.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id].filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
}
function isMatchType(type){return MATCH_TYPES.has(String(type||''));}
function isLeagueEvent(evt){return String(evt?.type||'')==='Partido';}
window.isLeagueClassificationEvent=isLeagueEvent;
window.getStandingsEligibleMatches=function(events){
  return (Array.isArray(events)?events:state()?.events||[]).filter(evt=>isLeagueEvent(evt)&&normalize(evt?.result||evt?.rawPayload?.result));
};

function formIsActive(){
  const form=document.getElementById('form-event');
  if(!form)return false;
  const modal=form.closest('.modal-backdrop');
  return modal?modal.classList.contains('active'):form.offsetParent!==null;
}
function resultFrom(evt){
  const existing=findEvent(evt);
  const values=[
    evt?.result,
    evt?.rawPayload?.result,
    evt?.payload?.result,
    existing?.result,
    existing?.rawPayload?.result,
    existing?.payload?.result,
    formIsActive()?document.getElementById('match-result-input')?.value:null,
    capturedResult
  ];
  for(const value of values){
    const result=normalize(value);
    if(result)return result;
  }
  return null;
}

function ensureStyles(){
  if(document.getElementById('match-result-persistence-style'))return;
  const style=document.createElement('style');
  style.id='match-result-persistence-style';
  style.textContent=`
    #match-result-field{margin-top:.75rem}
    #match-result-field .match-result-label{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.35rem}
    #match-result-field .match-result-label strong{font-size:.8rem;color:#0f172a}
    #match-result-field .match-result-label span{font-size:.61rem;font-weight:750;color:#64748b}
    #match-result-input{font-variant-numeric:tabular-nums;font-weight:800;letter-spacing:.04em}
    #match-result-field .match-result-help{display:block;margin-top:.3rem;font-size:.61rem;line-height:1.3;color:#64748b}
    #match-result-field .match-result-scope{display:inline-flex;align-items:center;gap:.28rem;margin-top:.32rem;padding:.22rem .42rem;border-radius:999px;background:#f8fafc;color:#64748b;font-size:.58rem;font-weight:800}
    #match-result-field .match-result-scope.is-league{background:#ecfdf5;color:#047857}
    @media(max-width:560px){#match-result-field{margin-top:.6rem}#match-result-input{min-height:46px;font-size:1rem}}
  `;
  document.head.appendChild(style);
}
function ensureField(){
  const form=document.getElementById('form-event');
  if(!form||document.getElementById('match-result-field'))return;
  const typeInput=document.getElementById('event-type-input');
  const opponent=document.getElementById('match-opponent-select');
  const condition=document.getElementById('match-condition-select');
  const anchor=condition?.closest('.form-row')||opponent?.closest('.form-row')||condition?.closest('.form-group')||opponent?.closest('.form-group');
  const field=document.createElement('div');
  field.id='match-result-field';
  field.className='form-group';
  field.innerHTML=`<label class="match-result-label" for="match-result-input"><strong>Resultado final</strong><span>Sets CV Bunyola – Rival</span></label><input id="match-result-input" class="form-control" type="text" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="Ej. 3-1" aria-describedby="match-result-help"><small id="match-result-help" class="match-result-help">Introduce el marcador por sets. Ejemplos: 3-0, 3-2 o 2-1.</small><span class="match-result-scope"></span>`;
  if(anchor)anchor.insertAdjacentElement('afterend',field);
  else form.querySelector('.event-form-actions')?.insertAdjacentElement('beforebegin',field);
  const input=field.querySelector('#match-result-input');
  input?.addEventListener('input',()=>{capturedResult=normalize(input.value);});
  input?.addEventListener('blur',()=>{
    const normalized=normalize(input.value);
    if(normalized)input.value=normalized;
  });
  typeInput?.addEventListener('change',syncVisibility);
  syncVisibility();
}
function syncVisibility(){
  const field=document.getElementById('match-result-field');
  const type=document.getElementById('event-type-input')?.value||'';
  if(!field)return;
  field.hidden=!isMatchType(type);
  const badge=field.querySelector('.match-result-scope');
  if(badge){
    const league=type==='Partido';
    badge.classList.toggle('is-league',league);
    badge.textContent=league?'Cuenta para la clasificación':'No afecta a la clasificación';
  }
}
function capture(){
  const type=document.getElementById('event-type-input')?.value||'';
  if(!isMatchType(type)){capturedResult=null;return;}
  const input=document.getElementById('match-result-input');
  const raw=String(input?.value||'').trim();
  if(!raw){capturedResult=null;return;}
  const normalized=normalize(raw);
  if(!normalized){
    input?.setCustomValidity('Usa un marcador por sets, por ejemplo 3-1.');
    return;
  }
  input?.setCustomValidity('');
  input.value=normalized;
  capturedResult=normalized;
}
function installForm(){
  ensureField();
  const form=document.getElementById('form-event');
  const submit=document.getElementById('btn-submit-event');
  if(form&&form.dataset.matchResultPersistence!=='1'){
    form.dataset.matchResultPersistence='1';
    form.addEventListener('submit',capture,true);
  }
  if(submit&&submit.dataset.matchResultPersistence!=='1'){
    submit.dataset.matchResultPersistence='1';
    submit.addEventListener('click',capture,true);
  }
}
function patchSaveEvent(){
  const api=window.VolleySupabase;
  if(!api||typeof api.saveEvent!=='function')return false;
  if(api.saveEvent.__matchResultPersistence20260819)return true;
  const base=api.saveEvent;
  const wrapped=async function(evt){
    if(evt){
      const type=String(evt.type||'');
      if(isMatchType(type)){
        if(formIsActive()){
          const input=document.getElementById('match-result-input');
          const raw=String(input?.value||'').trim();
          evt.result=raw?normalize(raw):null;
        }else{
          evt.result=resultFrom(evt);
        }
        if(evt.rawPayload&&typeof evt.rawPayload==='object')evt.rawPayload.result=evt.result||null;
      }else{
        evt.result=null;
        if(evt.rawPayload&&typeof evt.rawPayload==='object')evt.rawPayload.result=null;
      }
    }
    const response=await base.apply(this,arguments);
    if(evt&&response?.data){
      response.data.result=evt.result||null;
      response.data.rawPayload={...(response.data.rawPayload||{}),result:evt.result||null};
    }
    return response;
  };
  wrapped.__matchResultPersistence20260819=true;
  api.saveEvent=wrapped;
  return true;
}
function restore(eventId){
  ensureField();
  const evt=findEvent(eventId);
  if(!evt)return;
  const type=String(evt.type||'');
  const input=document.getElementById('match-result-input');
  if(input)input.value=isMatchType(type)?(resultFrom(evt)||''):'';
  capturedResult=isMatchType(type)?resultFrom(evt):null;
  syncVisibility();
}
function patchEdit(){
  if(typeof window.editEventFromModal!=='function')return false;
  if(window.editEventFromModal.__matchResultPersistence20260819)return true;
  const base=window.editEventFromModal;
  const wrapped=function(eventId){
    const out=base.apply(this,arguments);
    setTimeout(()=>restore(eventId),0);
    return out;
  };
  wrapped.__matchResultPersistence20260819=true;
  window.editEventFromModal=wrapped;
  try{editEventFromModal=wrapped;}catch(_){}
  return true;
}
function patchComposer(){
  if(typeof window.openCalendarEventComposer!=='function')return false;
  if(window.openCalendarEventComposer.__matchResultPersistence20260819)return true;
  const base=window.openCalendarEventComposer;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    setTimeout(()=>{
      ensureField();
      const input=document.getElementById('match-result-input');
      if(input)input.value='';
      capturedResult=null;
      syncVisibility();
    },0);
    return out;
  };
  wrapped.__matchResultPersistence20260819=true;
  window.openCalendarEventComposer=wrapped;
  try{openCalendarEventComposer=wrapped;}catch(_){}
  return true;
}
function install(){
  ensureStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    installForm();
    patchSaveEvent();
    patchEdit();
    patchComposer();
    syncVisibility();
    if(tries>120)clearInterval(timer);
  },150);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
