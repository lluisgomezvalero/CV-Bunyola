(function(){
'use strict';

const FLAG='__gamePlanOurServeBoard20260814';
if(window[FLAG])return;
window[FLAG]=true;

const ZONES=[4,3,2,7,8,9,5,6,1];
const MOBILE=window.matchMedia('(max-width:720px)');

function coachEditing(){
  try{return typeof isCoachUser==='function'&&isCoachUser()&&!(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode);}
  catch(_){return false;}
}
function enabled(){return coachEditing()&&MOBILE.matches;}
function record(){try{return typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;}catch(_){return null;}}
function plan(){return record()?.draftPlan||null;}
function clean(value){return String(value||'').trim();}
function norm(value){return clean(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function generatedName(value){
  const n=norm(value).replace(/[·.\-–—]/g,' ').replace(/\s+/g,' ').trim();
  return !n||/^(?:atacante|receptora|opuesta|central)(?: z[234])?(?: [12])?$/.test(n);
}
function attackerName(p,key){
  const value=clean(p?.attackers?.[key]?.name);
  return generatedName(value)?'':value;
}
function targetOptions(p){
  const ar1=attackerName(p,'z4a');
  const ar2=attackerName(p,'z4b');
  return [
    {key:'ar1',short:'AR1',label:ar1?`AR1 · ${ar1}`:'AR1',value:ar1||'AR1'},
    {key:'ar2',short:'AR2',label:ar2?`AR2 · ${ar2}`:'AR2',value:ar2||'AR2'},
    {key:'libero',short:'Líbero',label:'Líbero',value:'Líbero'}
  ];
}
function section(){return document.querySelector('#scouting-interactive-root .serve-target-text-section');}
function priority(p,zone){return p?.serveTargets?.[`z${zone}`]||'none';}
function priorityLabel(value){return value==='primary'?'Principal':value==='secondary'?'Alternativa':'Sin objetivo';}
function activeTargetKey(p){
  const current=norm(p?.servePlayerTarget);
  if(!current)return '';
  const option=targetOptions(p).find(item=>norm(item.value)===current);
  return option?.key||'other';
}
function setDraftTarget(value,saveNow=true){
  const rec=record();
  if(!rec?.draftPlan)return;
  rec.draftPlan.servePlayerTarget=clean(value);
  try{
    if(typeof appState!=='undefined'&&activeScoutingMatchId){
      appState.matchScouting=appState.matchScouting||{};
      appState.matchScouting[activeScoutingMatchId]=rec;
      if(saveNow&&typeof saveAppData==='function')saveAppData(appState);
    }
  }catch(_){}
  const original=document.getElementById('serve-player-target-input');
  if(original)original.value=clean(value);
}
function boardHtml(p){
  const opts=targetOptions(p);
  const currentKey=activeTargetKey(p);
  const current=clean(p?.servePlayerTarget);
  return `<div class="our-serve-board">
    <div class="our-serve-target-block">
      <div class="our-serve-minihead"><div><small>Objetivo de saque</small><strong>¿A quién buscamos?</strong></div><span>Selección rápida</span></div>
      <div class="our-serve-target-tabs" role="group" aria-label="Objetivo de saque">
        ${opts.map(item=>`<button type="button" data-our-serve-target="${item.key}" class="${currentKey===item.key?'is-active':''}" title="${item.label.replace(/"/g,'&quot;')}"><b>${item.short}</b>${item.key.startsWith('ar')&&item.label!==item.short?`<small>${item.label.slice(item.short.length+3)}</small>`:''}</button>`).join('')}
        <button type="button" data-our-serve-target="other" class="${currentKey==='other'?'is-active':''}"><b>Otro</b></button>
      </div>
      <label class="our-serve-custom ${currentKey==='other'?'is-visible':''}"><span>Nombre o dorsal</span><input type="text" value="${currentKey==='other'?current.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'):''}" placeholder="Ej.: #8 Marta"></label>
    </div>
    <div class="our-serve-zone-block">
      <div class="our-serve-minihead"><div><small>Zona objetivo</small><strong>¿Dónde queremos sacar?</strong></div><span>Toca la pista</span></div>
      <div class="our-serve-court" aria-label="Pista de objetivos de saque">
        <div class="our-serve-net"><span>RED</span></div>
        <div class="our-serve-grid">
          ${ZONES.map(zone=>{const state=priority(p,zone);return `<button type="button" data-our-serve-zone="${zone}" class="is-${state}" aria-label="Zona ${zone}: ${priorityLabel(state)}"><b>Z${zone}</b><span>${priorityLabel(state)}</span></button>`;}).join('')}
        </div>
      </div>
      <div class="our-serve-summary" aria-live="polite"></div>
      <div class="our-serve-legend"><span><i class="secondary"></i> Alternativa</span><span><i class="primary"></i> Principal</span><small>3er toque: borrar</small></div>
    </div>
  </div>`;
}
function refreshSummary(sec,p){
  const box=sec?.querySelector('.our-serve-summary');
  if(!box)return;
  const primary=ZONES.filter(z=>priority(p,z)==='primary').map(z=>`Z${z}`);
  const secondary=ZONES.filter(z=>priority(p,z)==='secondary').map(z=>`Z${z}`);
  const target=clean(p?.servePlayerTarget);
  const parts=[];
  if(target)parts.push(`<span><small>Objetivo</small><strong>${target.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</strong></span>`);
  if(primary.length)parts.push(`<span class="is-primary"><small>Principal</small><strong>${primary.join(' · ')}</strong></span>`);
  if(secondary.length)parts.push(`<span><small>Alternativa</small><strong>${secondary.join(' · ')}</strong></span>`);
  box.innerHTML=parts.length?parts.join(''):'<em>Sin objetivo definido</em>';
}
function bind(sec){
  const board=sec.querySelector('.our-serve-board');
  if(!board||board.dataset.bound==='1')return;
  board.dataset.bound='1';

  board.addEventListener('click',event=>{
    const targetBtn=event.target.closest('[data-our-serve-target]');
    if(targetBtn){
      const p=plan();if(!p)return;
      const key=targetBtn.dataset.ourServeTarget;
      if(key==='other'){
        setDraftTarget(activeTargetKey(p)==='other'?p.servePlayerTarget:'',true);
        board.querySelectorAll('[data-our-serve-target]').forEach(btn=>btn.classList.toggle('is-active',btn===targetBtn));
        const custom=board.querySelector('.our-serve-custom');
        custom?.classList.add('is-visible');
        const input=custom?.querySelector('input');
        if(input){input.value=activeTargetKey(p)==='other'?clean(p.servePlayerTarget):'';setTimeout(()=>input.focus(),0);}
        refreshSummary(sec,p);
        return;
      }
      const option=targetOptions(p).find(item=>item.key===key);
      if(!option)return;
      setDraftTarget(option.value,true);
      board.querySelectorAll('[data-our-serve-target]').forEach(btn=>btn.classList.toggle('is-active',btn===targetBtn));
      board.querySelector('.our-serve-custom')?.classList.remove('is-visible');
      refreshSummary(sec,p);
      return;
    }

    const zoneBtn=event.target.closest('[data-our-serve-zone]');
    if(zoneBtn){
      const zone=Number(zoneBtn.dataset.ourServeZone);
      if(Number.isFinite(zone)&&typeof window.setServeTargetPriority==='function')window.setServeTargetPriority(zone);
    }
  });

  const custom=board.querySelector('.our-serve-custom input');
  if(custom){
    custom.addEventListener('input',()=>{
      setDraftTarget(custom.value,false);
      refreshSummary(sec,plan());
    });
    custom.addEventListener('change',()=>setDraftTarget(custom.value,true));
    custom.addEventListener('blur',()=>setDraftTarget(custom.value,true));
  }
}
function restore(sec){
  if(!sec)return;
  sec.classList.remove('our-serve-board-active');
  sec.querySelector('.our-serve-board')?.remove();
  const heading=sec.querySelector('.scout-section-head h3');
  const desc=sec.querySelector('.scout-section-head p');
  if(heading?.dataset.ourServeOriginal)heading.textContent=heading.dataset.ourServeOriginal;
  if(desc?.dataset.ourServeOriginal)desc.textContent=desc.dataset.ourServeOriginal;
}
function decorate(){
  const sec=section();
  if(!sec)return;
  if(!enabled()){restore(sec);return;}
  const p=plan();if(!p)return;
  sec.classList.add('our-serve-board-active');
  const heading=sec.querySelector('.scout-section-head h3');
  const desc=sec.querySelector('.scout-section-head p');
  if(heading){if(!heading.dataset.ourServeOriginal)heading.dataset.ourServeOriginal=heading.textContent||'';heading.textContent='Nuestro saque';}
  if(desc){if(!desc.dataset.ourServeOriginal)desc.dataset.ourServeOriginal=desc.textContent||'';desc.textContent='Elige a quién queremos sacar y qué zonas priorizamos.';}
  let board=sec.querySelector('.our-serve-board');
  if(!board){
    const visibility=sec.querySelector('.serve-visibility-toggle');
    const target=sec.querySelector('.serve-player-target');
    const host=document.createElement('div');
    host.innerHTML=boardHtml(p);
    board=host.firstElementChild;
    if(visibility)visibility.insertAdjacentElement('afterend',board);
    else if(target)target.insertAdjacentElement('beforebegin',board);
    else sec.appendChild(board);
  }
  refreshSummary(sec,p);
  bind(sec);
}
function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__ourServeBoard20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){const out=base.apply(this,arguments);requestAnimationFrame(decorate);return out;};
  wrapped.__ourServeBoard20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-our-serve-board-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-our-serve-board-20260814-css';
  style.textContent=`
@media(max-width:720px){
#view-tactics .serve-target-text-section.our-serve-board-active .serve-player-target{display:none!important}
#view-tactics .our-serve-board{display:grid;gap:.72rem;margin-top:.15rem}
#view-tactics .our-serve-target-block,#view-tactics .our-serve-zone-block{display:grid;gap:.58rem;padding:.68rem;border:1px solid #dbe2ea;border-radius:14px;background:#fff;box-shadow:0 4px 12px rgba(15,23,42,.04)}
#view-tactics .our-serve-minihead{display:flex;align-items:flex-end;justify-content:space-between;gap:.6rem}
#view-tactics .our-serve-minihead>div{display:grid;gap:.08rem;min-width:0}
#view-tactics .our-serve-minihead small{font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#64748b}
#view-tactics .our-serve-minihead strong{font-size:.82rem;color:#0f172a}
#view-tactics .our-serve-minihead>span{font-size:.61rem;font-weight:800;color:#94a3b8;white-space:nowrap}
#view-tactics .our-serve-target-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.38rem}
#view-tactics .our-serve-target-tabs button{min-width:0;min-height:47px;padding:.38rem .25rem;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;color:#334155;display:grid;place-items:center;gap:.06rem;font:inherit;cursor:pointer}
#view-tactics .our-serve-target-tabs button b{font-size:.7rem}.our-serve-target-tabs button small{max-width:100%;font-size:.55rem;font-weight:700;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#view-tactics .our-serve-target-tabs button.is-active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;box-shadow:inset 0 0 0 1px #2563eb}
#view-tactics .our-serve-custom{display:none;gap:.28rem}.our-serve-custom.is-visible{display:grid}
#view-tactics .our-serve-custom span{font-size:.62rem;font-weight:800;color:#64748b}
#view-tactics .our-serve-custom input{width:100%;box-sizing:border-box;padding:.52rem .6rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font-size:.78rem}
#view-tactics .our-serve-court{position:relative;padding-top:26px;border:2px solid #475569;border-radius:11px;overflow:hidden;background:#d7ad70;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
#view-tactics .our-serve-net{position:absolute;left:0;right:0;top:0;height:26px;display:grid;place-items:center;background:#0f172a;color:#f8fafc;border-bottom:2px solid rgba(255,255,255,.9);z-index:2}
#view-tactics .our-serve-net span{font-size:.55rem;font-weight:900;letter-spacing:.12em}
#view-tactics .our-serve-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,70px)}
#view-tactics .our-serve-grid button{position:relative;border:0;border-right:1px solid rgba(255,255,255,.9);border-bottom:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.05);color:#1f2937;display:grid;place-items:center;align-content:center;gap:.15rem;font:inherit;cursor:pointer}
#view-tactics .our-serve-grid button:nth-child(3n){border-right:0}#view-tactics .our-serve-grid button:nth-last-child(-n+3){border-bottom:0}
#view-tactics .our-serve-grid button b{font-size:.9rem}.our-serve-grid button span{font-size:.55rem;font-weight:850;opacity:.78}
#view-tactics .our-serve-grid button.is-secondary{background:rgba(250,204,21,.48);color:#713f12}.our-serve-grid button.is-primary{background:rgba(249,115,22,.68);color:#7c2d12;box-shadow:inset 0 0 0 2px rgba(194,65,12,.55)}
#view-tactics .our-serve-grid button.is-primary b:before{content:'★ ';font-size:.68rem}
#view-tactics .our-serve-summary{display:flex;flex-wrap:wrap;gap:.38rem;align-items:stretch}
#view-tactics .our-serve-summary>span{flex:1 1 92px;min-width:0;display:grid;gap:.05rem;padding:.42rem .5rem;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
#view-tactics .our-serve-summary>span.is-primary{border-color:#fdba74;background:#fff7ed}.our-serve-summary small{font-size:.54rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#64748b}.our-serve-summary strong{font-size:.7rem;color:#0f172a;overflow-wrap:anywhere}.our-serve-summary em{font-style:normal;font-size:.68rem;font-weight:750;color:#94a3b8}
#view-tactics .our-serve-legend{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;color:#64748b;font-size:.59rem;font-weight:750}.our-serve-legend span{display:inline-flex;align-items:center;gap:.25rem}.our-serve-legend i{width:9px;height:9px;border-radius:3px;background:#facc15}.our-serve-legend i.primary{background:#f97316}.our-serve-legend small{margin-left:auto;font-size:.56rem;color:#94a3b8}
}
`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=wrapRender();
    if(ready){clearInterval(timer);setTimeout(decorate,0);}else if(tries>120)clearInterval(timer);
  },100);
  try{MOBILE.addEventListener('change',()=>setTimeout(decorate,0));}catch(_){MOBILE.addListener?.(()=>setTimeout(decorate,0));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
