(function(){
'use strict';

const FLAG='__matchOpponentLegacyRepair20260814';
if(window[FLAG])return;
window[FLAG]=true;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function norm(value){return String(value||'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function clean(value){const text=String(value||'').trim();return text&&norm(text)!=='rival'?text:'';}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null;}catch(_){return null;}}
function isCoachContext(){
  try{if(typeof isCoachUser==='function'&&isCoachUser())return true;}catch(_){}
  const role=norm(currentUser()?.role);
  if(['coach','admin','administrator','entrenador'].includes(role))return true;
  const view=document.getElementById('view-tactics');
  return Boolean(view?.querySelector('.scouting-publish-bar,.game-plan-coach-actions,.coach-board-kicker,button[onclick*="publishScoutingPlan"],button[onclick*="saveScoutingData"]'));
}
function activeEvent(){
  try{
    const id=typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;
    const s=state();
    if(!id||!s)return null;
    return (s.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id].filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
  }catch(_){return null;}
}
function storedOpponent(evt){
  const candidates=[evt?.opponent,evt?.rawPayload?.opponent,evt?.payload?.opponent,evt?.matchOpponent,evt?.opponentName,evt?.rival,evt?.rivalName];
  for(const value of candidates){const out=clean(value);if(out)return out;}
  return '';
}
function leagueTeams(){return (state()?.leagueTable||[]).filter(team=>!team?.isOwn&&clean(team?.name));}
function inferOpponent(evt){
  const existing=storedOpponent(evt);
  if(existing)return existing;
  const title=norm(evt?.title);
  if(!title)return '';
  const matches=leagueTeams().filter(team=>title.includes(norm(team.name)));
  return matches.length===1?clean(matches[0].name):'';
}
function conditionFor(evt){
  const explicit=String(evt?.matchCondition||evt?.condition||evt?.rawPayload?.matchCondition||evt?.rawPayload?.condition||'');
  if(/visit|fuera|away/i.test(explicit))return 'Visitante';
  if(/local|casa|home/i.test(explicit))return 'Local';
  return /bunyola/i.test(String(evt?.location||''))?'Local':'Visitante';
}
function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function saveLocal(evt,opponent){
  evt.opponent=opponent;
  evt.matchOpponent=opponent;
  evt.matchCondition=conditionFor(evt);
  evt.rawPayload={...(evt.rawPayload||{}),opponent,matchCondition:evt.matchCondition};
  try{
    if(typeof saveAppData==='function'){
      saveAppData(state(),{immediate:true});
      if(typeof flushAppDataSave==='function')flushAppDataSave();
    }
  }catch(error){console.warn('[LegacyOpponentRepair] local save warning',error);}
}
async function saveRemote(evt,opponent){
  const api=window.VolleySupabase;
  if(!api||typeof api.saveEvent!=='function'||!api.getClient?.())return null;
  const user=currentUser();
  const clubId=user?.clubId||user?.club_id||api.config?.clubId||window.VOLLEY_SUPABASE_CONFIG?.clubId;
  const teamId=user?.teamId||user?.team_id||evt?.teamId||evt?.team_id||null;
  const userId=user?.id||null;

  // El wrapper histórico de saveEvent también mira el formulario. Si el modal está
  // conservando una selección antigua, hacemos que coincida temporalmente con la
  // reparación elegida para que nunca pueda sobrescribirla.
  const typeEl=document.getElementById('event-type-input');
  const oppEl=document.getElementById('match-opponent-select');
  const condEl=document.getElementById('match-condition-select');
  const previous={type:typeEl?.value,opponent:oppEl?.value,condition:condEl?.value};
  try{
    if(typeEl)typeEl.value=evt.type||'Partido';
    if(oppEl){
      const option=[...oppEl.options].find(opt=>norm(opt.value)===norm(opponent));
      if(option)oppEl.value=option.value;
    }
    if(condEl)condEl.value=conditionFor(evt);
    const result=await api.saveEvent(evt,clubId,teamId,userId);
    if(result?.error)throw result.error;
    return result?.data||null;
  }finally{
    if(typeEl&&previous.type!=null)typeEl.value=previous.type;
    if(oppEl&&previous.opponent!=null)oppEl.value=previous.opponent;
    if(condEl&&previous.condition!=null)condEl.value=previous.condition;
  }
}
async function persist(evt,opponent){
  const value=clean(opponent);
  if(!evt||!value)return false;
  saveLocal(evt,value);
  try{
    const remote=await saveRemote(evt,value);
    if(remote){
      const oldLegacy=evt.legacyId||evt.legacy_id||(!/^[0-9a-f-]{36}$/i.test(String(evt.id||''))?evt.id:null);
      Object.assign(evt,remote);
      evt.opponent=value;
      evt.matchOpponent=value;
      evt.matchCondition=conditionFor(evt);
      evt.rawPayload={...(evt.rawPayload||{}),opponent:value,matchCondition:evt.matchCondition};
      if(oldLegacy&&!evt.legacyId)evt.legacyId=oldLegacy;
      saveLocal(evt,value);
    }
  }catch(error){
    // La reparación local sigue siendo útil para eventos muy antiguos que todavía
    // no existen en Supabase; mostramos el error solo en consola y no perdemos el dato.
    console.warn('[LegacyOpponentRepair] No se pudo sincronizar el evento antiguo en Supabase:',error);
  }
  return true;
}
function hero(){return document.getElementById('scouting-interactive-root')?.querySelector('.game-plan-match-hero')||null;}
function updateHero(evt,opponent){
  const box=hero();
  if(!box)return;
  const own=state()?.teamInfo?.name||'CV BUNYOLA';
  const row=leagueTeams().find(team=>norm(team.name)===norm(opponent));
  const ownRow=(state()?.leagueTable||[]).find(team=>team?.isOwn);
  const ownLogo=state()?.teamInfo?.customLogo||ownRow?.logo||'assets/club_logo.png';
  const rivalLogo=row?.logo||'assets/default_avatar.svg';
  const isHome=conditionFor(evt)==='Local';
  const teams=[...box.querySelectorAll('.game-plan-team')];
  if(teams.length<2)return;
  const set=(el,name,logo,condition)=>{
    const img=el.querySelector('img'); const strong=el.querySelector('strong'); const small=el.querySelector('small');
    if(img){img.src=logo;img.alt=`Escudo de ${name}`;img.onerror=function(){this.onerror=null;this.src='assets/default_avatar.svg';};}
    if(strong)strong.textContent=name;
    if(small)small.textContent=condition;
  };
  if(isHome){set(teams[0],own,ownLogo,'Local');set(teams[1],row?.name||opponent,rivalLogo,'Visitante');}
  else{set(teams[0],row?.name||opponent,rivalLogo,'Local');set(teams[1],own,ownLogo,'Visitante');}
}
function renderRepair(){
  if(!isCoachContext())return;
  const root=document.getElementById('scouting-interactive-root');
  const box=hero();
  const evt=activeEvent();
  if(!root||!box||!evt)return;

  let opponent=inferOpponent(evt);
  const existing=root.querySelector('.game-plan-legacy-opponent-repair');
  if(opponent){
    existing?.remove();
    if(!storedOpponent(evt)){
      // Si se ha podido rescatar inequívocamente del título, lo aplicamos localmente
      // y lo sincronizamos sin pedir una acción extra al entrenador.
      saveLocal(evt,opponent);
      saveRemote(evt,opponent).catch(()=>{});
    }
    updateHero(evt,opponent);
    return;
  }
  if(existing)return;

  const teams=leagueTeams();
  if(!teams.length)return;
  const repair=document.createElement('div');
  repair.className='game-plan-legacy-opponent-repair';
  repair.innerHTML=`<div class="legacy-opponent-copy"><i data-lucide="shield-question"></i><div><strong>Partido antiguo sin rival guardado</strong><small>Asígnalo una vez y quedará vinculado al plan.</small></div></div><div class="legacy-opponent-actions"><select aria-label="Rival del partido"><option value="">Selecciona rival</option>${teams.map(team=>`<option value="${escapeHtml(team.name)}">${escapeHtml(team.name)}</option>`).join('')}</select><button type="button">Guardar</button></div>`;
  repair.querySelector('button')?.addEventListener('click',async()=>{
    const select=repair.querySelector('select');
    const value=clean(select?.value);
    if(!value)return;
    const button=repair.querySelector('button');
    button.disabled=true;button.textContent='Guardando…';
    await persist(evt,value);
    updateHero(evt,value);
    repair.remove();
    try{if(typeof showToast==='function')showToast(`Rival vinculado: ${value}`);}catch(_){}
  });
  box.insertAdjacentElement('afterend',repair);
  try{window.lucide?.createIcons?.();}catch(_){}
}
function installStyles(){
  if(document.getElementById('match-opponent-legacy-repair-20260814-css'))return;
  const style=document.createElement('style');
  style.id='match-opponent-legacy-repair-20260814-css';
  style.textContent=`
.game-plan-legacy-opponent-repair{display:flex;align-items:center;justify-content:space-between;gap:.65rem;margin:-.4rem 0 .7rem;padding:.6rem .7rem;border:1px solid #fcd34d;border-radius:12px;background:#fffbeb;color:#78350f}.legacy-opponent-copy{display:flex;align-items:center;gap:.45rem;min-width:0}.legacy-opponent-copy>i,.legacy-opponent-copy>svg{width:17px;height:17px;flex:0 0 auto}.legacy-opponent-copy>div{display:grid;gap:.08rem}.legacy-opponent-copy strong{font-size:.72rem}.legacy-opponent-copy small{font-size:.62rem;color:#92400e}.legacy-opponent-actions{display:flex;gap:.4rem;min-width:0}.legacy-opponent-actions select{min-width:145px;max-width:220px;border:1px solid #fbbf24;border-radius:9px;background:#fff;padding:.4rem .48rem;font-size:.7rem;color:#334155}.legacy-opponent-actions button{border:0;border-radius:9px;background:#0f172a;color:#fff;padding:.42rem .62rem;font-size:.68rem;font-weight:850}.legacy-opponent-actions button:disabled{opacity:.55}@media(max-width:720px){.game-plan-legacy-opponent-repair{align-items:stretch;flex-direction:column;margin:-.2rem 0 .55rem}.legacy-opponent-actions{width:100%}.legacy-opponent-actions select{flex:1;min-width:0;max-width:none}.legacy-opponent-actions button{flex:0 0 auto}}
`;
  document.head.appendChild(style);
}
function install(){
  installStyles();
  let queued=false;
  const run=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;renderRepair();});
  };
  run();
  const root=document.getElementById('scouting-interactive-root');
  if(root&&!root.dataset.legacyOpponentRepairObserved){
    root.dataset.legacyOpponentRepairObserved='1';
    new MutationObserver(run).observe(root,{childList:true,subtree:true});
  }
  document.addEventListener('change',event=>{if(event.target?.id==='scouting-match-select')setTimeout(run,0);});
  setInterval(run,900);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
