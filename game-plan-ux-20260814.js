(function(){
'use strict';

const FLAG='__gamePlanUx20260814';
if(window[FLAG])return;
window[FLAG]=true;

function coach(){
  try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}catch(_){return false;}
}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function record(){try{return typeof window.getActiveScoutingRecord==='function'?window.getActiveScoutingRecord():null;}catch(_){return null;}}
function versionOf(rec){
  try{return typeof window.getPlanPublicationVersion==='function'?window.getPlanPublicationVersion(rec):(rec?.publicationVersion||rec?.publishedAt||null);}catch(_){return rec?.publicationVersion||rec?.publishedAt||null;}
}
function esc(value){
  try{if(typeof window.escapeSessionText==='function')return window.escapeSessionText(value);}catch(_){}
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function fmt(iso){
  if(!iso)return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return '';
  return d.toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}

function enhancedReadTracker(rec){
  const version=versionOf(rec);
  const receipts=rec?.readReceipts||{};
  const players=Array.isArray(state()?.players)?state().players:[];
  const seen=[];
  const pending=[];
  players.forEach(player=>{
    const receipt=receipts[player.id];
    const hasSeen=Boolean(receipt&&String(receipt.version||'')===String(version||''));
    (hasSeen?seen:pending).push({player,receipt});
  });
  const total=players.length;
  const pct=total?Math.round((seen.length/total)*100):0;
  const row=({player,receipt},hasSeen)=>`<div class="plan-read-item ${hasSeen?'seen':'pending'}"><i data-lucide="${hasSeen?'circle-check':'clock-3'}"></i><span><b>${esc(player.name)}</b><small>${hasSeen?(fmt(receipt?.viewedAt)||'Visto'):'Pendiente de abrir'}</small></span></div>`;
  return `<section class="plan-read-tracker plan-read-tracker-ux">
    <div class="plan-read-tracker-head">
      <div><small>Seguimiento de lectura</small><strong>Plan publicado</strong></div>
      <span class="plan-read-progress">${seen.length}/${total}</span>
    </div>
    <div class="plan-read-progress-bar" aria-label="${pct}% del equipo ha visto el plan"><span style="width:${pct}%"></span></div>
    <div class="plan-read-summary">
      <span class="is-seen"><i data-lucide="circle-check"></i>${seen.length} visto${seen.length===1?'':'s'}</span>
      <span class="is-pending"><i data-lucide="clock-3"></i>${pending.length} pendiente${pending.length===1?'':'s'}</span>
      <button type="button" data-plan-read-toggle aria-expanded="false">Ver detalle <i data-lucide="chevron-down"></i></button>
    </div>
    <div class="plan-read-details" hidden>
      ${pending.length?`<div class="plan-read-group"><h4>Pendientes</h4><div class="plan-read-list">${pending.map(item=>row(item,false)).join('')}</div></div>`:''}
      ${seen.length?`<div class="plan-read-group"><h4>Ya lo han visto</h4><div class="plan-read-list">${seen.map(item=>row(item,true)).join('')}</div></div>`:''}
    </div>
  </section>`;
}

function installReadTracker(){
  if(typeof window.renderPlanReadTracker!=='function')return false;
  if(window.renderPlanReadTracker.__gamePlanUx)return true;
  const fn=function(rec){return enhancedReadTracker(rec);};
  fn.__gamePlanUx=true;
  window.renderPlanReadTracker=fn;
  return true;
}

function ensureHeader(view,isCoach){
  const header=view.querySelector('.scouting-header');
  const select=header?.querySelector('#scouting-match-select');
  if(header&&select&&!select.closest('.game-plan-match-field')){
    const wrap=document.createElement('label');
    wrap.className='game-plan-match-field';
    wrap.innerHTML='<span>Partido</span>';
    select.parentNode.insertBefore(wrap,select);
    wrap.appendChild(select);
  }
  let hint=view.querySelector('.game-plan-workflow-hint');
  if(isCoach){
    if(!hint&&header){
      hint=document.createElement('div');
      hint.className='game-plan-workflow-hint';
      hint.innerHTML='<i data-lucide="info"></i><span><strong>Guardar</strong> conserva tu borrador. <strong>Publicar</strong> es lo que actualiza el plan que ven las jugadoras.</span>';
      header.insertAdjacentElement('afterend',hint);
    }
  }else if(hint){
    hint.remove();
  }
}

function makePlayerNav(root,sections){
  root.querySelector('.game-plan-player-nav')?.remove();
  const summary=root.querySelector('.player-plan-summary');
  if(!summary||!sections.length)return;
  const labels=['Ataque rival','Saque rival','Nuestro saque'];
  sections.forEach((section,index)=>{
    section.id=`game-plan-section-${index+1}`;
    const title=section.querySelector('.scout-section-head h3');
    const desc=section.querySelector('.scout-section-head p');
    if(index===0){if(title)title.textContent='Cómo nos atacan';if(desc)desc.textContent='Direcciones principales que debemos anticipar.';}
    if(index===1){if(title)title.textContent='Dónde nos sacan';if(desc)desc.textContent='Zonas de saque más habituales del rival.';}
    if(index===2){if(title)title.textContent='A quién sacamos';if(desc)desc.textContent='Objetivo principal cuando nos toca sacar.';}
  });
  const nav=document.createElement('nav');
  nav.className='game-plan-player-nav';
  nav.setAttribute('aria-label','Ir a una parte del plan');
  nav.innerHTML=sections.map((section,index)=>`<button type="button" data-plan-jump="${section.id}">${labels[index]||`Bloque ${index+1}`}</button>`).join('');
  summary.insertAdjacentElement('afterend',nav);
}

function decoratePlayer(root,rec){
  const heading=root.querySelector('.player-plan-heading');
  if(!heading)return;
  let meta=heading.querySelector('.game-plan-published-meta');
  if(!meta){
    meta=document.createElement('div');
    meta.className='game-plan-published-meta';
    heading.appendChild(meta);
  }
  const stamp=fmt(rec?.publishedAt);
  meta.innerHTML=`<i data-lucide="badge-check"></i><span>Plan publicado${stamp?` · ${esc(stamp)}`:''}</span>`;

  const summaryTitle=root.querySelector('.player-plan-summary-head h3');
  if(summaryTitle)summaryTitle.textContent='Claves del partido';

  const sections=[...root.querySelectorAll(':scope > .scout-section')];
  makePlayerNav(root,sections);

  const attack=sections[0];
  const cards=attack?[...attack.querySelectorAll('.attack-scout-card')]:[];
  if(attack&&cards.length>1&&!attack.querySelector('.game-plan-swipe-hint')){
    const hint=document.createElement('div');
    hint.className='game-plan-swipe-hint';
    hint.innerHTML='<span>Desliza para ver atacantes</span><i data-lucide="arrow-right"></i>';
    attack.querySelector('.scout-section-head')?.insertAdjacentElement('afterend',hint);
  }
}

function decorateCoach(view,root){
  const save=document.getElementById('save-scouting-plan');
  if(save){
    save.classList.add('game-plan-save-draft');
    const text=[...save.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
    if(text)text.textContent=' Guardar borrador';
    else if(!save.querySelector('span'))save.insertAdjacentHTML('beforeend','<span>Guardar borrador</span>');
  }
  const bar=root.querySelector('.scouting-publish-bar');
  if(bar){
    const publish=[...bar.querySelectorAll('button')].find(btn=>/publicar|actualizar publicación/i.test(btn.textContent||''));
    if(publish)publish.classList.add('game-plan-primary-publish');
    const archive=[...bar.querySelectorAll('button')].find(btn=>/archivar/i.test(btn.textContent||''));
    if(archive)archive.classList.add('game-plan-tertiary-action');
  }
}

function decorate(){
  const view=document.getElementById('view-tactics');
  const root=document.getElementById('scouting-interactive-root');
  if(!view||!root)return;
  const isCoach=coach();
  view.classList.add('game-plan-ux');
  view.classList.toggle('game-plan-coach',isCoach);
  view.classList.toggle('game-plan-player',!isCoach);
  ensureHeader(view,isCoach);
  const rec=record();
  const playerLike=Boolean(root.querySelector('.player-plan-heading'));
  if(playerLike)decoratePlayer(root,rec);
  if(isCoach&&!playerLike)decorateCoach(view,root);
  try{window.lucide?.createIcons?.();}catch(_){}
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__gamePlanUx)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(decorate);
    return out;
  };
  wrapped.__gamePlanUx=true;
  window.renderTactics=wrapped;
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-ux-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-ux-20260814-css';
  style.textContent=`
#view-tactics.game-plan-ux>.card{overflow:visible}
#view-tactics.game-plan-ux .scouting-header{align-items:flex-end;gap:1rem}
#view-tactics.game-plan-ux .scouting-header>div:first-child{flex:1;min-width:0}
.game-plan-match-field{display:grid;gap:.35rem;min-width:min(320px,100%);font-size:.7rem;font-weight:850;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.game-plan-match-field select{font-size:.88rem;text-transform:none;letter-spacing:0;font-weight:650;color:#0f172a}
.game-plan-workflow-hint{display:flex;align-items:flex-start;gap:.6rem;margin:.8rem 0 1rem;padding:.72rem .85rem;border:1px solid #fde68a;border-radius:13px;background:#fffbeb;color:#78350f;font-size:.76rem;line-height:1.4}
.game-plan-workflow-hint svg{width:17px;height:17px;flex:0 0 auto;margin-top:.05rem;color:#d97706}
.game-plan-workflow-hint strong{font-weight:900}
#view-tactics.game-plan-ux .scouting-publish-bar{margin-top:.1rem}
#view-tactics.game-plan-ux .scouting-publish-actions .game-plan-primary-publish{box-shadow:0 6px 16px rgba(217,119,6,.18)}
#view-tactics.game-plan-ux .game-plan-tertiary-action{opacity:.78}
#view-tactics.game-plan-ux .scouting-save-row{align-items:center;gap:.7rem}
#view-tactics.game-plan-ux .game-plan-save-draft{min-width:180px;justify-content:center}
.plan-read-tracker-ux{padding:1rem 1.05rem}
.plan-read-tracker-ux .plan-read-tracker-head{margin-bottom:.55rem}
.plan-read-tracker-ux .plan-read-tracker-head>div{display:grid;gap:.05rem}
.plan-read-tracker-ux .plan-read-tracker-head small{font-size:.65rem;font-weight:850;text-transform:uppercase;letter-spacing:.07em;color:#64748b}
.plan-read-tracker-ux .plan-read-tracker-head strong{font-size:1rem}
.plan-read-tracker-ux .plan-read-progress{display:grid;place-items:center;min-width:46px;height:32px;padding:0 .55rem;border-radius:999px;background:#fff7ed;color:#b45309;font-size:.78rem;font-weight:900}
.plan-read-progress-bar{height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden}
.plan-read-progress-bar>span{display:block;height:100%;border-radius:inherit;background:#22c55e;transition:width .25s ease}
.plan-read-summary{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin-top:.7rem}
.plan-read-summary>span{display:inline-flex;align-items:center;gap:.3rem;padding:.34rem .55rem;border-radius:999px;font-size:.7rem;font-weight:850}
.plan-read-summary>span svg{width:14px;height:14px}
.plan-read-summary .is-seen{background:#f0fdf4;color:#166534}.plan-read-summary .is-pending{background:#f8fafc;color:#475569}
.plan-read-summary button{margin-left:auto;border:0;background:transparent;color:#475569;font-size:.72rem;font-weight:850;display:inline-flex;align-items:center;gap:.25rem;cursor:pointer;padding:.35rem .2rem}
.plan-read-summary button svg{width:15px;height:15px;transition:transform .18s ease}.plan-read-tracker-ux.is-expanded .plan-read-summary button svg{transform:rotate(180deg)}
.plan-read-details{margin-top:.85rem;padding-top:.8rem;border-top:1px solid #e2e8f0;display:grid;gap:.9rem}.plan-read-details[hidden]{display:none!important}
.plan-read-group h4{margin:0 0 .45rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
.game-plan-published-meta{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;margin-top:.7rem;padding:.34rem .55rem;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid rgba(191,219,254,.9);color:#1d4ed8;font-size:.68rem;font-weight:850}
.game-plan-published-meta svg{width:14px;height:14px}
.game-plan-player-nav{display:flex;gap:.45rem;overflow-x:auto;padding:.1rem 0 .45rem;margin:-.15rem 0 .55rem;scrollbar-width:none}
.game-plan-player-nav::-webkit-scrollbar{display:none}.game-plan-player-nav button{flex:0 0 auto;border:1px solid #dbeafe;background:#fff;color:#334155;border-radius:999px;padding:.48rem .72rem;font-size:.72rem;font-weight:850;cursor:pointer;white-space:nowrap}
.game-plan-player-nav button:active{transform:scale(.98)}
#view-tactics.game-plan-ux .player-clean-court{scroll-margin-top:82px}
.game-plan-swipe-hint{display:none;align-items:center;justify-content:flex-end;gap:.3rem;margin:-.25rem 0 .65rem;color:#64748b;font-size:.68rem;font-weight:750}.game-plan-swipe-hint svg{width:15px;height:15px}
#view-tactics.game-plan-ux.game-plan-player .player-plan-summary{margin-bottom:.8rem}
#view-tactics.game-plan-ux.game-plan-player .serve-target-text-section .serve-player-target strong{background:#fffbeb;border-color:#fde68a;color:#78350f;font-size:1.05rem}
@media(max-width:720px){
  #view-tactics.game-plan-ux .scouting-header{align-items:stretch;flex-direction:column}
  .game-plan-match-field{width:100%;min-width:0}
  .game-plan-workflow-hint{margin-top:.65rem}
  #view-tactics.game-plan-ux .scouting-publish-bar{gap:.75rem;padding:.85rem}
  #view-tactics.game-plan-ux .scouting-status{padding:.1rem .15rem}
  #view-tactics.game-plan-ux .scouting-publish-actions{grid-template-columns:1fr 1fr}
  #view-tactics.game-plan-ux .scouting-publish-actions .game-plan-primary-publish{grid-column:1/-1;grid-row:1}
  #view-tactics.game-plan-ux .scouting-save-row{justify-content:stretch}
  #view-tactics.game-plan-ux .game-plan-save-draft{width:100%}
  .plan-read-summary button{width:100%;justify-content:center;margin-left:0;border-top:1px solid #e2e8f0;border-radius:0;padding-top:.65rem;margin-top:.15rem}
  #view-tactics.game-plan-ux.game-plan-player .player-plan-heading{margin-bottom:.8rem}
  #view-tactics.game-plan-ux.game-plan-player .player-plan-heading p{font-size:.76rem}
  #view-tactics.game-plan-ux.game-plan-player .scout-section-head p{font-size:.72rem}
  .game-plan-swipe-hint{display:flex}
  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-cards-grid,
  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-cards-grid.two-cards{display:flex!important;grid-template-columns:none!important;overflow-x:auto;gap:.75rem;scroll-snap-type:x mandatory;padding:.1rem .1rem .55rem;scrollbar-width:none;overscroll-behavior-x:contain}
  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-cards-grid::-webkit-scrollbar{display:none}
  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-scout-card{flex:0 0 min(84vw,340px);scroll-snap-align:start;scroll-snap-stop:always}
  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-card-court{max-height:360px}
}
@media(max-width:430px){
  #view-tactics.game-plan-ux .scouting-publish-actions{grid-template-columns:1fr}
  #view-tactics.game-plan-ux .scouting-publish-actions .game-plan-primary-publish{grid-column:auto;grid-row:auto}
}
`;
  document.head.appendChild(style);
}

function onClick(event){
  const toggle=event.target.closest('[data-plan-read-toggle]');
  if(toggle){
    const tracker=toggle.closest('.plan-read-tracker-ux');
    const details=tracker?.querySelector('.plan-read-details');
    if(!tracker||!details)return;
    const expanded=!tracker.classList.contains('is-expanded');
    tracker.classList.toggle('is-expanded',expanded);
    details.hidden=!expanded;
    toggle.setAttribute('aria-expanded',String(expanded));
    const text=toggle.firstChild;
    if(text)text.textContent=expanded?'Ocultar detalle ':'Ver detalle ';
    try{window.lucide?.createIcons?.();}catch(_){}
    return;
  }
  const jump=event.target.closest('[data-plan-jump]');
  if(jump){
    const target=document.getElementById(jump.dataset.planJump||'');
    target?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }
}

function install(){
  injectStyles();
  document.addEventListener('click',onClick);
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const a=installReadTracker();
    const b=wrapRender();
    if(a&&b){clearInterval(timer);setTimeout(()=>{try{window.renderTactics?.();}catch(_){}},0);}
    else if(tries>100)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
