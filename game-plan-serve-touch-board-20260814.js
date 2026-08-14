(function(){
'use strict';

const FLAG='__gamePlanServeTouchBoard20260814';
if(window[FLAG])return;
window[FLAG]=true;

const ZONES=[4,3,2,7,8,9,5,6,1];
const MOBILE=window.matchMedia('(max-width:720px)');

function coachEditing(){
  try{return typeof isCoachUser==='function'&&isCoachUser()&&!(typeof scoutingPreviewMode!=='undefined'&&scoutingPreviewMode);}
  catch(_){return false;}
}
function enabled(){return coachEditing()&&MOBILE.matches;}
function statusFromValue(value){
  const n=Math.max(0,Number(value)||0);
  if(n>=75)return 'primary';
  if(n>0)return 'frequent';
  return 'none';
}
function nextValue(value){
  const status=statusFromValue(value);
  if(status==='none')return 50;
  if(status==='frequent')return 100;
  return 0;
}
function inputFor(section,zone){return section?.querySelector(`#serve-pct-z${zone}`)||null;}
function serveSection(){
  const root=document.getElementById('scouting-interactive-root');
  const input=root?.querySelector('input[id^="serve-pct-z"]');
  return input?.closest('.scout-section')||null;
}
function labelFor(status){
  if(status==='primary')return 'Principal';
  if(status==='frequent')return 'Frecuente';
  return 'Sin marcar';
}
function markLegacy(section){
  section.querySelectorAll('input[id^="serve-pct-z"]').forEach(input=>{
    const wrapper=input.closest('.serve-zone-control,.serve-pct-control,.form-group,label')||input.parentElement;
    if(wrapper)wrapper.classList.add('serve-touch-legacy-control');
  });
}
function boardHtml(){
  return `<div class="serve-touch-board-head">
    <div><small>Edición rápida</small><strong>Tendencia de saque rival</strong></div>
    <span>Toca cada zona</span>
  </div>
  <div class="serve-touch-court" aria-label="Pista interactiva de tendencia de saque">
    <div class="serve-touch-net"><span>RED</span></div>
    <div class="serve-touch-grid">
      ${ZONES.map(zone=>`<button type="button" class="serve-touch-zone" data-serve-zone="${zone}" aria-label="Zona ${zone}: sin marcar"><b>Z${zone}</b><span>Sin marcar</span></button>`).join('')}
    </div>
  </div>
  <div class="serve-touch-summary" aria-live="polite">Sin tendencia marcada</div>
  <div class="serve-touch-legend"><span><i class="serve-touch-dot frequent"></i> Frecuente</span><span><i class="serve-touch-dot primary"></i> Principal</span><small>3er toque: borrar</small></div>`;
}
function refresh(section){
  const board=section?.querySelector('.serve-touch-board');
  if(!board)return;
  const primary=[];
  const frequent=[];
  ZONES.forEach(zone=>{
    const input=inputFor(section,zone);
    const status=statusFromValue(input?.value);
    const button=board.querySelector(`[data-serve-zone="${zone}"]`);
    if(button){
      button.classList.toggle('is-frequent',status==='frequent');
      button.classList.toggle('is-primary',status==='primary');
      button.dataset.status=status;
      const text=button.querySelector('span');
      if(text)text.textContent=labelFor(status);
      button.setAttribute('aria-label',`Zona ${zone}: ${labelFor(status).toLowerCase()}`);
    }
    if(status==='primary')primary.push(`Z${zone}`);
    else if(status==='frequent')frequent.push(`Z${zone}`);
  });
  const summary=board.querySelector('.serve-touch-summary');
  if(summary){
    const parts=[];
    if(primary.length)parts.push(`<strong>Principal:</strong> ${primary.join(', ')}`);
    if(frequent.length)parts.push(`<strong>Frecuente:</strong> ${frequent.join(', ')}`);
    summary.innerHTML=parts.length?parts.join('<span aria-hidden="true">·</span>'):'Sin tendencia marcada';
  }
}
function bindBoard(section,board){
  if(board.dataset.bound==='1')return;
  board.dataset.bound='1';
  board.addEventListener('click',event=>{
    const button=event.target.closest('[data-serve-zone]');
    if(!button)return;
    const zone=Number(button.dataset.serveZone);
    const input=inputFor(section,zone);
    if(!input)return;
    input.value=String(nextValue(input.value));
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    refresh(section);
  });
}
function restoreDescription(section){
  const desc=section?.querySelector('.scout-section-head p');
  if(desc?.dataset.serveTouchOriginal!=null){
    desc.textContent=desc.dataset.serveTouchOriginal;
    delete desc.dataset.serveTouchOriginal;
  }
}
function decorate(){
  const view=document.getElementById('view-tactics');
  const section=serveSection();
  if(!view)return;
  view.classList.toggle('coach-serve-touch-mode',enabled());
  if(!section)return;
  if(!enabled()){
    section.querySelector('.serve-touch-board')?.remove();
    section.classList.remove('serve-touch-section');
    restoreDescription(section);
    return;
  }

  section.classList.add('serve-touch-section');
  markLegacy(section);
  const desc=section.querySelector('.scout-section-head p');
  if(desc){
    if(desc.dataset.serveTouchOriginal==null)desc.dataset.serveTouchOriginal=desc.textContent||'';
    desc.textContent='Toca una zona para marcarla como frecuente y otra vez para convertirla en principal.';
  }

  let board=section.querySelector('.serve-touch-board');
  if(!board){
    board=document.createElement('div');
    board.className='serve-touch-board';
    board.innerHTML=boardHtml();
    const anchor=section.querySelector('.serve-zone-priority-summary,.serve-heat-volleyball-wrap,.serve-heat-grid');
    if(anchor)anchor.insertAdjacentElement('beforebegin',board);
    else section.appendChild(board);
  }
  bindBoard(section,board);
  refresh(section);
}
function bindRoot(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.dataset.serveTouchBoardBound==='1')return;
  root.dataset.serveTouchBoardBound='1';
  root.addEventListener('input',event=>{
    if(String(event.target?.id||'').startsWith('serve-pct-z')){
      const section=event.target.closest('.scout-section');
      if(section)requestAnimationFrame(()=>refresh(section));
    }
  });
  root.addEventListener('change',event=>{
    if(String(event.target?.id||'').startsWith('serve-pct-z')){
      const section=event.target.closest('.scout-section');
      if(section)requestAnimationFrame(()=>refresh(section));
    }
  });
  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;
    if(!enabled())return;
    if(root.querySelector('input[id^="serve-pct-z"]')&&!root.querySelector('.serve-touch-board')){
      queued=true;
      requestAnimationFrame(()=>{queued=false;decorate();});
    }
  }).observe(root,{childList:true,subtree:true});
}
function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__serveTouchBoard20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(()=>{decorate();bindRoot();});
    return out;
  };
  wrapped.__serveTouchBoard20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-serve-touch-board-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-serve-touch-board-20260814-css';
  style.textContent=`
.serve-touch-board{display:none}
@media(max-width:720px){
  #view-tactics.coach-serve-touch-mode .serve-touch-section .serve-touch-board{display:grid;gap:.62rem;margin:.08rem 0 .28rem}
  #view-tactics.coach-serve-touch-mode .serve-touch-section .serve-zone-priority-summary,
  #view-tactics.coach-serve-touch-mode .serve-touch-section .serve-heat-volleyball-wrap,
  #view-tactics.coach-serve-touch-mode .serve-touch-section .serve-heat-grid,
  #view-tactics.coach-serve-touch-mode .serve-touch-section .serve-touch-legacy-control,
  #view-tactics.coach-serve-touch-mode .serve-touch-section .scout-help{display:none!important}

  #view-tactics .serve-touch-board-head{display:flex;align-items:center;justify-content:space-between;gap:.65rem}
  #view-tactics .serve-touch-board-head>div{display:grid;gap:.05rem;min-width:0}
  #view-tactics .serve-touch-board-head small{font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.075em;color:#64748b}
  #view-tactics .serve-touch-board-head strong{font-size:.83rem;color:#0f172a}
  #view-tactics .serve-touch-board-head>span{flex:0 0 auto;padding:.3rem .48rem;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:.62rem;font-weight:850}

  #view-tactics .serve-touch-court{position:relative;padding-top:10px;border:2px solid #a16207;border-radius:13px;background:#d8a45b;overflow:hidden;box-shadow:0 5px 13px rgba(15,23,42,.12),inset 0 0 0 1px rgba(255,255,255,.22)}
  #view-tactics .serve-touch-net{position:absolute;top:0;left:0;right:0;height:10px;display:flex;align-items:center;justify-content:center;border-bottom:2px solid rgba(255,255,255,.95);background:rgba(15,23,42,.18);z-index:2}
  #view-tactics .serve-touch-net span{transform:translateY(-1px);padding:0 .28rem;background:#d8a45b;color:rgba(255,255,255,.92);font-size:.48rem;font-weight:950;letter-spacing:.08em}
  #view-tactics .serve-touch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,76px)}
  #view-tactics .serve-touch-zone{position:relative;display:grid;place-items:center;align-content:center;gap:.18rem;margin:0;padding:.25rem;border:0;border-right:1px solid rgba(255,255,255,.82);border-bottom:1px solid rgba(255,255,255,.82);border-radius:0;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .12s ease,box-shadow .12s ease,transform .08s ease}
  #view-tactics .serve-touch-zone:nth-child(3n){border-right:0}
  #view-tactics .serve-touch-zone:nth-last-child(-n+3){border-bottom:0}
  #view-tactics .serve-touch-zone:active{transform:scale(.97)}
  #view-tactics .serve-touch-zone b{font-size:1.02rem;line-height:1;font-weight:950;text-shadow:0 1px 2px rgba(0,0,0,.18)}
  #view-tactics .serve-touch-zone span{font-size:.52rem;line-height:1.05;font-weight:850;opacity:.82}
  #view-tactics .serve-touch-zone.is-frequent{background:rgba(37,99,235,.36);box-shadow:inset 0 0 0 2px rgba(191,219,254,.7)}
  #view-tactics .serve-touch-zone.is-frequent span{opacity:1}
  #view-tactics .serve-touch-zone.is-primary{background:rgba(220,38,38,.5);box-shadow:inset 0 0 0 3px rgba(254,202,202,.86)}
  #view-tactics .serve-touch-zone.is-primary:after{content:'★';position:absolute;top:.28rem;right:.35rem;color:#fef08a;font-size:.72rem;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.2)}
  #view-tactics .serve-touch-zone.is-primary span{opacity:1}

  #view-tactics .serve-touch-summary{display:flex;align-items:center;flex-wrap:wrap;gap:.3rem .42rem;min-height:32px;padding:.46rem .58rem;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#475569;font-size:.66rem;font-weight:720}
  #view-tactics .serve-touch-summary strong{color:#0f172a;font-weight:900}
  #view-tactics .serve-touch-summary>span{color:#cbd5e1;font-weight:900}
  #view-tactics .serve-touch-legend{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;color:#64748b;font-size:.6rem;font-weight:760}
  #view-tactics .serve-touch-legend>span{display:inline-flex;align-items:center;gap:.25rem}
  #view-tactics .serve-touch-legend small{margin-left:auto;color:#94a3b8;font-size:.57rem;font-weight:700}
  #view-tactics .serve-touch-dot{display:inline-block;width:9px;height:9px;border-radius:3px}
  #view-tactics .serve-touch-dot.frequent{background:#3b82f6}
  #view-tactics .serve-touch-dot.primary{background:#dc2626}
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
    bindRoot();
    if(ready){
      clearInterval(timer);
      setTimeout(()=>{decorate();bindRoot();},0);
    }else if(tries>120)clearInterval(timer);
  },100);
  const onMedia=()=>requestAnimationFrame(decorate);
  if(typeof MOBILE.addEventListener==='function')MOBILE.addEventListener('change',onMedia);
  else if(typeof MOBILE.addListener==='function')MOBILE.addListener(onMedia);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
