(function(){
'use strict';

const FLAG='__matchOpponentPersistence20260814';
if(window[FLAG])return;
window[FLAG]=true;

const MATCH_TYPES=new Set(['Partido','Amistoso']);
let captured={opponent:'',condition:''};

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function clean(value){
  const text=String(value||'').trim();
  return text&&text.toLocaleLowerCase('es')!=='rival'?text:'';
}
function norm(value){
  return String(value||'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
}
function liveMeta(){
  const type=document.getElementById('event-type-input')?.value||'';
  if(!MATCH_TYPES.has(type))return {opponent:'',condition:''};
  return {
    opponent:clean(document.getElementById('match-opponent-select')?.value),
    condition:String(document.getElementById('match-condition-select')?.value||'').trim()
  };
}
function captureMeta(){
  const meta=liveMeta();
  if(meta.opponent)captured.opponent=meta.opponent;
  if(meta.condition)captured.condition=meta.condition;
}
function findEvent(evtOrId){
  const s=state();
  if(!s)return null;
  const id=typeof evtOrId==='object'?evtOrId?.id:evtOrId;
  if(!id)return typeof evtOrId==='object'?evtOrId:null;
  return (s.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id].filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
}
function titleOpponent(title){
  const text=String(title||'').trim();
  if(!text)return '';
  const parts=text.split(/\s+(?:vs\.?|contra)\s+/i).map(part=>part.trim()).filter(Boolean);
  if(parts.length!==2)return '';
  const own=norm(state()?.teamInfo?.name||'CV BUNYOLA');
  if(norm(parts[0])===own)return clean(parts[1]);
  if(norm(parts[1])===own)return clean(parts[0]);
  return '';
}
function opponentFrom(evt){
  const existing=findEvent(evt);
  const live=liveMeta();
  const candidates=[
    live.opponent,
    captured.opponent,
    evt?.opponent,
    evt?.rawPayload?.opponent,
    evt?.payload?.opponent,
    evt?.matchOpponent,
    evt?.opponentName,
    evt?.rival,
    evt?.rivalName,
    existing?.opponent,
    existing?.rawPayload?.opponent,
    existing?.payload?.opponent,
    existing?.matchOpponent,
    existing?.opponentName,
    existing?.rival,
    existing?.rivalName,
    titleOpponent(evt?.title||existing?.title)
  ];
  for(const value of candidates){const out=clean(value);if(out)return out;}
  return '';
}
function conditionFrom(evt){
  const existing=findEvent(evt);
  const live=liveMeta();
  const explicit=String(live.condition||captured.condition||evt?.matchCondition||evt?.condition||existing?.matchCondition||existing?.condition||'').trim();
  if(/visit|fuera|away/i.test(explicit))return 'Visitante';
  if(/local|casa|home/i.test(explicit))return 'Local';
  return String(evt?.location||existing?.location||'').toLocaleLowerCase('es').includes('bunyola')?'Local':'Visitante';
}
function patchSaveEvent(){
  const api=window.VolleySupabase;
  if(!api||typeof api.saveEvent!=='function')return false;
  if(api.saveEvent.__matchOpponentPersistence20260814)return true;
  const base=api.saveEvent;
  const wrapped=async function(evt){
    if(evt&&MATCH_TYPES.has(String(evt.type||''))){
      const opponent=opponentFrom(evt);
      const condition=conditionFrom(evt);
      evt.opponent=opponent;
      evt.matchCondition=condition;
      if(evt.rawPayload&&typeof evt.rawPayload==='object')evt.rawPayload.opponent=opponent;
    }
    const result=await base.apply(this,arguments);
    if(evt&&MATCH_TYPES.has(String(evt.type||''))&&result?.data){
      const opponent=clean(evt.opponent);
      if(opponent){
        result.data.opponent=opponent;
        result.data.rawPayload={...(result.data.rawPayload||{}),opponent};
      }
      result.data.matchCondition=evt.matchCondition||conditionFrom(evt);
    }
    return result;
  };
  wrapped.__matchOpponentPersistence20260814=true;
  api.saveEvent=wrapped;
  return true;
}
function installFormCapture(){
  const form=document.getElementById('form-event');
  const submit=document.getElementById('btn-submit-event');
  const opponent=document.getElementById('match-opponent-select');
  const condition=document.getElementById('match-condition-select');
  if(form&&form.dataset.matchOpponentPersistence!=='1'){
    form.dataset.matchOpponentPersistence='1';
    form.addEventListener('submit',captureMeta,true);
  }
  if(submit&&submit.dataset.matchOpponentPersistence!=='1'){
    submit.dataset.matchOpponentPersistence='1';
    submit.addEventListener('click',captureMeta,true);
  }
  [opponent,condition].filter(Boolean).forEach(el=>{
    if(el.dataset.matchOpponentPersistence==='1')return;
    el.dataset.matchOpponentPersistence='1';
    el.addEventListener('change',captureMeta);
  });
}
function restoreEditMeta(eventId){
  const evt=findEvent(eventId);
  if(!evt||!MATCH_TYPES.has(String(evt.type||'')))return;
  const opponent=opponentFrom(evt);
  const opponentSelect=document.getElementById('match-opponent-select');
  const conditionSelect=document.getElementById('match-condition-select');
  if(opponentSelect&&opponent){
    const option=[...opponentSelect.options].find(opt=>norm(opt.value)===norm(opponent));
    if(option)opponentSelect.value=option.value;
  }
  if(conditionSelect)conditionSelect.value=conditionFrom(evt);
  captured={opponent,condition:conditionFrom(evt)};
}
function patchEditEvent(){
  if(typeof window.editEventFromModal!=='function')return false;
  if(window.editEventFromModal.__matchOpponentPersistence20260814)return true;
  const base=window.editEventFromModal;
  const wrapped=function(eventId){
    const out=base.apply(this,arguments);
    setTimeout(()=>restoreEditMeta(eventId),0);
    return out;
  };
  wrapped.__matchOpponentPersistence20260814=true;
  window.editEventFromModal=wrapped;
  try{editEventFromModal=wrapped;}catch(_){}
  return true;
}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null;}catch(_){return null;}}
function coach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function activePlanEvent(){
  try{
    const id=typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;
    return id?findEvent(id):null;
  }catch(_){return null;}
}
async function persistOpponentForEvent(evt,opponent){
  if(!evt||!clean(opponent))return false;
  evt.opponent=clean(opponent);
  evt.matchCondition=conditionFrom(evt);
  evt.rawPayload={...(evt.rawPayload||{}),opponent:evt.opponent};
  const api=window.VolleySupabase;
  if(api&&typeof api.saveEvent==='function'&&api.getClient?.()){
    const user=currentUser();
    const clubId=user?.clubId||api.config?.clubId||window.VOLLEY_SUPABASE_CONFIG?.clubId;
    const teamId=user?.teamId||evt.teamId||evt.team_id||null;
    const userId=user?.id||null;
    const result=await api.saveEvent(evt,clubId,teamId,userId);
    if(result?.error)throw result.error;
    if(result?.data)Object.assign(evt,result.data,{opponent:clean(opponent),matchCondition:evt.matchCondition});
  }
  try{
    if(typeof saveAppData==='function'){
      saveAppData(state(),{immediate:true});
      if(typeof flushAppDataSave==='function')flushAppDataSave();
    }
  }catch(_){}
  return true;
}
function ensureRepairPicker(){
  if(!coach())return;
  const root=document.getElementById('scouting-interactive-root');
  const hero=root?.querySelector('.game-plan-match-hero');
  const evt=activePlanEvent();
  if(!root||!hero||!evt)return;
  const existing=root.querySelector('.game-plan-opponent-repair');
  if(opponentFrom(evt)){existing?.remove();return;}
  if(existing)return;
  const teams=(state()?.leagueTable||[]).filter(team=>!team?.isOwn&&clean(team?.name));
  if(!teams.length)return;
  const repair=document.createElement('div');
  repair.className='game-plan-opponent-repair';
  repair.innerHTML=`<span><i data-lucide="shield-question"></i> Falta guardar el rival de este partido</span><div><select aria-label="Seleccionar rival"><option value="">Selecciona rival</option>${teams.map(team=>`<option value="${String(team.name).replace(/"/g,'&quot;')}">${String(team.name)}</option>`).join('')}</select><button type="button">Guardar rival</button></div>`;
  repair.querySelector('button')?.addEventListener('click',async()=>{
    const select=repair.querySelector('select');
    const opponent=clean(select?.value);
    if(!opponent)return;
    const button=repair.querySelector('button');
    button.disabled=true;button.textContent='Guardando…';
    try{
      await persistOpponentForEvent(evt,opponent);
      repair.remove();
      try{if(typeof renderTactics==='function')renderTactics();}catch(_){}
      try{if(typeof showToast==='function')showToast(`Rival guardado: ${opponent}`);}catch(_){}
    }catch(error){
      console.error('[MatchOpponentPersistence] No se pudo guardar el rival:',error);
      button.disabled=false;button.textContent='Guardar rival';
      try{if(typeof showToast==='function')showToast('No se ha podido guardar el rival.');}catch(_){}
    }
  });
  hero.insertAdjacentElement('afterend',repair);
  try{window.lucide?.createIcons?.();}catch(_){}
}
function observePlan(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.dataset.matchOpponentPersistenceObserved==='1')return;
  root.dataset.matchOpponentPersistenceObserved='1';
  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;ensureRepairPicker();});
  }).observe(root,{childList:true,subtree:true});
}
function injectStyles(){
  if(document.getElementById('match-opponent-persistence-20260814-css'))return;
  const style=document.createElement('style');
  style.id='match-opponent-persistence-20260814-css';
  style.textContent=`
.game-plan-opponent-repair{display:flex;align-items:center;justify-content:space-between;gap:.65rem;margin:-.45rem 0 .7rem;padding:.55rem .65rem;border:1px solid #fde68a;border-radius:12px;background:#fffbeb;color:#78350f;font-size:.69rem;font-weight:750}.game-plan-opponent-repair>span{display:inline-flex;align-items:center;gap:.35rem}.game-plan-opponent-repair>span svg{width:15px;height:15px}.game-plan-opponent-repair>div{display:flex;gap:.4rem;min-width:0}.game-plan-opponent-repair select{min-width:150px;max-width:220px;border:1px solid #fcd34d;border-radius:9px;background:#fff;padding:.38rem .45rem;font-size:.7rem;color:#334155}.game-plan-opponent-repair button{border:0;border-radius:9px;background:#0f172a;color:#fff;padding:.4rem .58rem;font-size:.68rem;font-weight:850;cursor:pointer}.game-plan-opponent-repair button:disabled{opacity:.55;cursor:wait}@media(max-width:720px){.game-plan-opponent-repair{align-items:stretch;flex-direction:column;margin:-.25rem 0 .55rem}.game-plan-opponent-repair>div{width:100%}.game-plan-opponent-repair select{flex:1;min-width:0;max-width:none}.game-plan-opponent-repair button{flex:0 0 auto}}
`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    installFormCapture();
    patchSaveEvent();
    patchEditEvent();
    observePlan();
    ensureRepairPicker();
    if(tries>120)clearInterval(timer);
  },150);
  document.addEventListener('change',event=>{
    if(event.target?.id==='scouting-match-select')setTimeout(ensureRepairPicker,0);
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
