(function(){
'use strict';

const FLAG='__wellnessV220260811';
const ZONE='Europe/Madrid';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let ownPlayerId=null;
let playerCardBusy=false;
let coachTableBusy=false;
let coachObserver=null;
let dashboardObserver=null;
let coachDebounce=null;
let playerDebounce=null;

function db(){return window.VolleySupabase?.getClient?.()||null;}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null;}catch(_){return null;}}
function isPlayer(){return currentUser()?.role==='player';}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}

function madridDateKey(now=new Date(),offsetDays=0){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  const d=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)));
  d.setUTCDate(d.getUTCDate()+offsetDays);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

async function resolvePlayerUuid(value){
  const raw=String(value||'').trim();
  if(UUID.test(raw))return raw;
  const local=(state()?.players||[]).find(p=>[p.id,p.supabaseId,p.supabase_id,p.legacy_id,p.legacyId,p.profile_id,p.authId].filter(Boolean).map(String).includes(raw));
  const localUuid=[local?.supabaseId,local?.supabase_id,local?.id].find(v=>UUID.test(String(v||'')));
  if(localUuid)return String(localUuid);

  const user=currentUser();
  if(user?.role==='player'&&(!raw||String(user.playerId||'')===raw)){
    if(ownPlayerId)return ownPlayerId;
    const identity=await window.VolleySupabase?.getIdentity?.();
    ownPlayerId=identity?.data?.player?.id||null;
    if(ownPlayerId)return ownPlayerId;
  }

  const client=db();if(!client||!raw)return null;
  const {data:legacy}=await client.from('players').select('id').eq('legacy_id',raw).maybeSingle();
  if(legacy?.id)return legacy.id;
  return null;
}

function injectStyles(){
  if(document.getElementById('wellness-v2-style'))return;
  const style=document.createElement('style');
  style.id='wellness-v2-style';
  style.textContent=`
  .wellness-pain-question{margin-top:1rem}.wellness-pain-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.55rem}.wellness-pain-top label{margin:0!important}.wellness-pain-value{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:32px;padding:0 .55rem;border-radius:999px;background:#f1f5f9;color:#0f172a;font-weight:900}.wellness-pain-range{width:100%;cursor:pointer}.wellness-pain-scale{display:flex;justify-content:space-between;gap:1rem;margin-top:.25rem;color:#94a3b8;font-size:.72rem}.wellness-pain-help{margin:.45rem 0 0;color:#64748b;font-size:.75rem;line-height:1.35}
  .player-week-wellness-grid.wellness-v2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.wellness-pain-card .player-week-wellness-icon{background:#f1f5f9;color:#64748b}.wellness-pain-card.wellness-green .player-week-wellness-icon{background:#dcfce7;color:#15803d}.wellness-pain-card.wellness-orange .player-week-wellness-icon{background:#ffedd5;color:#c2410c}.wellness-pain-card.wellness-purple .player-week-wellness-icon{background:#f3e8ff;color:#7e22ce}
  @media(max-width:700px){.player-week-wellness-grid.wellness-v2-grid{grid-template-columns:1fr}.wellness-pain-scale{font-size:.68rem}}
  `;
  document.head.appendChild(style);
}

function patchSleepScale(){
  const labels={1:'Muy mal',2:'Mal',3:'Regular',4:'Bien',5:'Muy bien'};
  document.querySelectorAll('#wellness-sleep-options .wellness-choice[data-sleep]').forEach(button=>{
    const value=Number(button.dataset.sleep);
    if(!labels[value])return;
    const span=button.querySelector('span');
    if(span)span.textContent=labels[value];
    else button.insertAdjacentHTML('beforeend',`<span>${labels[value]}</span>`);
    button.title=`${value} - ${labels[value]}`;
    button.setAttribute('aria-label',`${value}, ${labels[value]}`);
  });
}

function suppressSleepHours(){
  const form=document.getElementById('form-wellness');if(!form)return;
  let input=document.getElementById('wellness-sleep-hours');
  if(!input){
    input=document.createElement('input');
    input.id='wellness-sleep-hours';
    input.name='wellness-sleep-hours';
    form.appendChild(input);
  }
  input.type='hidden';
  input.value='0';
  input.removeAttribute('min');input.removeAttribute('max');input.removeAttribute('step');input.removeAttribute('placeholder');
  if(input.parentElement!==form)form.appendChild(input);
  document.querySelectorAll('.wellness-sleep-hours-correction').forEach(el=>el.remove());
}

function updatePainValue(){
  const range=document.getElementById('wellness-pain-score');
  const value=document.getElementById('wellness-pain-score-value');
  if(range&&value)value.textContent=String(range.value||0);
}

function ensurePainField(){
  const form=document.getElementById('form-wellness');if(!form)return;
  if(document.getElementById('wellness-pain-score')){updatePainValue();return;}
  const notes=document.getElementById('wellness-notes');
  const notesGroup=notes?.closest('.form-group');
  const group=document.createElement('div');
  group.className='form-group wellness-pain-question';
  group.innerHTML=`
    <div class="wellness-pain-top"><label for="wellness-pain-score">Dolor / molestias físicas</label><span id="wellness-pain-score-value" class="wellness-pain-value">0</span></div>
    <input type="range" id="wellness-pain-score" class="wellness-pain-range" min="0" max="10" step="1" value="0" aria-label="Dolor o molestias físicas de 0 a 10">
    <div class="wellness-pain-scale"><span>0 · Sin dolor</span><span>10 · Dolor máximo</span></div>
    <p class="wellness-pain-help">Marca cómo están hoy tus molestias. Si necesitas explicar dónde o qué notas, utiliza el campo de notas de abajo.</p>`;
  if(notesGroup)form.insertBefore(group,notesGroup);else form.appendChild(group);
  group.querySelector('#wellness-pain-score')?.addEventListener('input',updatePainValue);
}

function patchQuestionnaire(){
  patchSleepScale();
  suppressSleepHours();
  ensurePainField();
}

async function persistWellnessV2(snapshot){
  const client=db();if(!client)return;
  const pid=await resolvePlayerUuid(snapshot.localPlayerId);if(!pid)return;
  const fatigue=Number(snapshot.fatigue);
  const sleep=Number(snapshot.sleep);
  const pain=Number(snapshot.pain);
  if(!Number.isFinite(sleep)||sleep<1||sleep>5)return;
  if(!Number.isFinite(pain)||pain<0||pain>10)return;
  const payload={
    player_id:pid,
    entry_date:snapshot.date,
    general_state:Number.isFinite(fatigue)&&fatigue>=1&&fatigue<=5?fatigue:3,
    fatigue:Number.isFinite(fatigue)&&fatigue>=1&&fatigue<=5?fatigue:null,
    sleep,
    sleep_hours:null,
    pain_score:Math.round(pain),
    notes:snapshot.notes||'',
    updated_at:new Date().toISOString()
  };
  const {data,error}=await client.from('wellness_entries').upsert(payload,{onConflict:'player_id,entry_date'}).select('id,entry_date,sleep,pain_score,sleep_hours').single();
  if(error){console.warn('[WellnessV2] No se pudo guardar dolor/sueño',error);return;}
  if(Number(data?.pain_score)!==Math.round(pain)||data?.sleep_hours!==null){
    console.warn('[WellnessV2] Verificación de guardado incompleta',data);
    return;
  }
  window.dispatchEvent(new CustomEvent('volley:wellness-v2-saved',{detail:{playerId:pid,entryDate:snapshot.date,painScore:Math.round(pain)}}));
}

function bindForm(){
  const form=document.getElementById('form-wellness');if(!form||form.dataset.wellnessV2Bound==='1')return;
  form.dataset.wellnessV2Bound='1';
  form.addEventListener('submit',()=>{
    patchQuestionnaire();
    const snapshot={
      localPlayerId:document.getElementById('wellness-player-select')?.value||currentUser()?.playerId||'',
      fatigue:document.getElementById('wellness-fatigue-val')?.value||'',
      sleep:document.getElementById('wellness-sleep-quality')?.value||'',
      pain:document.getElementById('wellness-pain-score')?.value||'0',
      notes:document.getElementById('wellness-notes')?.value||'',
      date:typeof getLocalDateKey==='function'?getLocalDateKey():madridDateKey(new Date(),0)
    };
    setTimeout(()=>void persistWellnessV2(snapshot),0);
  },true);
  form.addEventListener('reset',()=>setTimeout(()=>{patchQuestionnaire();const range=document.getElementById('wellness-pain-score');if(range)range.value='0';updatePainValue();},0));
}

function painSummary(rows){
  const values=(rows||[]).map(r=>r.pain_score).filter(v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))).map(Number);
  if(!values.length)return{key:'neutral',label:'Sin registros recientes',detail:'Completa tu bienestar para ver este resumen.'};
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  if(mean<=2)return{key:'green',label:'Pocas molestias',detail:'Tus últimos registros reflejan pocas molestias físicas.'};
  if(mean<=5)return{key:'orange',label:'Algunas molestias',detail:'Tus últimos registros muestran algunas molestias físicas.'};
  return{key:'purple',label:'Molestias más altas',detail:'Tus últimos registros reflejan molestias más marcadas. Tenlo en cuenta y coméntalo si lo necesitas.'};
}

async function enrichPlayerCard(){
  if(playerCardBusy||!isPlayer())return;
  const card=document.getElementById('player-training-load-card');if(!card)return;
  playerCardBusy=true;
  try{
    const pid=await resolvePlayerUuid(currentUser()?.playerId||'');if(!pid)return;
    const client=db();if(!client)return;
    const start=madridDateKey(new Date(),-6),end=madridDateKey(new Date(),0);
    const {data,error}=await client.from('wellness_entries').select('entry_date,pain_score').eq('player_id',pid).gte('entry_date',start).lte('entry_date',end).order('entry_date',{ascending:true});
    if(error){console.warn('[WellnessV2] Dolor tarjeta',error);return;}

    const sleepItem=[...card.querySelectorAll('.player-week-wellness-item')].find(item=>item.querySelector('small')?.textContent.trim()==='Sueño');
    const sleepDetail=sleepItem?.querySelector('p');
    if(sleepDetail){
      const clean=sleepDetail.textContent.replace(/\s*·\s*\d+(?:[.,]\d+)?\s*h\s+de\s+media\s+registradas\.?/i,'').trim();
      if(clean!==sleepDetail.textContent)sleepDetail.textContent=clean;
    }

    const grid=card.querySelector('.player-week-wellness-grid');if(!grid)return;
    grid.classList.add('wellness-v2-grid');
    const summary=painSummary(data||[]);
    let item=grid.querySelector('[data-wellness-pain]');
    const html=`<span class="player-week-wellness-icon"><i data-lucide="activity"></i></span><div><small>Molestias</small><strong>${summary.label}</strong><p>${summary.detail}</p></div>`;
    if(!item){item=document.createElement('div');item.dataset.wellnessPain='1';grid.appendChild(item);}
    item.className=`player-week-wellness-item wellness-pain-card wellness-${summary.key}`;
    item.innerHTML=html;
    try{if(window.lucide)window.lucide.createIcons();}catch(_){}
  }finally{playerCardBusy=false;}
}

async function enrichCoachTable(){
  if(coachTableBusy||!isCoach())return;
  const table=document.querySelector('#wellness-coach-inspector .wellness-detail-table');if(!table)return;
  const selector=document.getElementById('wellness-player-inspector');if(!selector?.value)return;
  coachTableBusy=true;
  try{
    const pid=await resolvePlayerUuid(selector.value);if(!pid)return;
    const client=db();if(!client)return;
    const {data,error}=await client.from('wellness_entries').select('entry_date,pain_score').eq('player_id',pid).order('entry_date',{ascending:false}).limit(30);
    if(error){console.warn('[WellnessV2] Dolor entrenador',error);return;}
    const map=new Map((data||[]).map(r=>[String(r.entry_date),r.pain_score]));
    const headers=[...table.querySelectorAll('thead th')];
    const hoursIndex=headers.findIndex(th=>th.textContent.trim()==='Horas'||th.textContent.trim()==='Dolor');
    if(hoursIndex<0)return;
    if(headers[hoursIndex].textContent.trim()!=='Dolor')headers[hoursIndex].textContent='Dolor';
    table.querySelectorAll('tbody tr').forEach(row=>{
      const cells=row.querySelectorAll('td');if(cells.length<=hoursIndex)return;
      const date=String(cells[0]?.textContent||'').trim();
      const pain=map.get(date);
      const text=pain===null||pain===undefined?'—':`${pain}/10`;
      if(cells[hoursIndex].textContent.trim()!==text)cells[hoursIndex].textContent=text;
      cells[hoursIndex].title='Dolor/molestias: 0 = sin dolor, 10 = dolor máximo';
    });
  }finally{coachTableBusy=false;}
}

function scheduleCoachTable(){
  clearTimeout(coachDebounce);
  coachDebounce=setTimeout(()=>void enrichCoachTable(),120);
}
function schedulePlayerCard(){
  clearTimeout(playerDebounce);
  playerDebounce=setTimeout(()=>void enrichPlayerCard(),120);
}

function observeUi(){
  const modal=document.getElementById('modal-add-wellness');
  if(modal&&!modal.dataset.wellnessV2Observed){
    modal.dataset.wellnessV2Observed='1';
    new MutationObserver(()=>{if(modal.classList.contains('active'))setTimeout(()=>{patchQuestionnaire();bindForm();},0);}).observe(modal,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  }
  const wellnessView=document.getElementById('view-wellness');
  if(wellnessView&&!coachObserver){
    coachObserver=new MutationObserver(()=>scheduleCoachTable());
    coachObserver.observe(wellnessView,{childList:true,subtree:true});
  }
  const dashboard=document.getElementById('home-dashboard');
  if(dashboard&&!dashboardObserver){
    dashboardObserver=new MutationObserver(()=>schedulePlayerCard());
    dashboardObserver.observe(dashboard,{childList:true,subtree:false});
  }
}

function install(){
  if(window[FLAG])return;
  if(!window.VolleySupabase){setTimeout(install,150);return;}
  window[FLAG]=true;
  injectStyles();
  patchQuestionnaire();
  bindForm();
  observeUi();
  document.addEventListener('change',event=>{if(event.target?.id==='wellness-player-inspector')scheduleCoachTable();});
  window.addEventListener('volley:wellness-v2-saved',()=>{schedulePlayerCard();scheduleCoachTable();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){patchQuestionnaire();schedulePlayerCard();scheduleCoachTable();}});
  setTimeout(()=>{patchQuestionnaire();bindForm();observeUi();schedulePlayerCard();scheduleCoachTable();},800);
  console.info('[WellnessV2] Sueño 1=mal / 5=bien; horas retiradas; dolor 0-10 activo.');
}

setTimeout(install,0);
})();
