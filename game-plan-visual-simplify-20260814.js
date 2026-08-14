(function(){
'use strict';

const FLAG='__gamePlanVisualSimplify20260814';
if(window[FLAG])return;
window[FLAG]=true;

const AUTO_NAMES={
  z4a:['Atacante Z4 · 1','Atacante Z4 - 1','Receptora Z4 - 1','Receptora Z4 · 1','Receptora Z4'],
  z4b:['Atacante Z4 · 2','Atacante Z4 - 2','Receptora Z4 - 2','Receptora Z4 · 2'],
  z2:['Atacante Z2','Opuesta Z2','Opuesta · Z2'],
  z3a:['Central Z3 · 1','Central Z3 - 1'],
  z3b:['Central Z3 · 2','Central Z3 - 2']
};
const ROLE_LABELS={z4a:'Receptora 1',z4b:'Receptora 2',z2:'Opuesta',z3a:'Central 1',z3b:'Central 2'};

function esc(value){
  try{return typeof escapeSessionText==='function'?escapeSessionText(value):String(value??'');}
  catch(_){return String(value??'');}
}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function isAutoName(key,value){
  const normalized=String(value||'').trim().toLowerCase();
  if(!normalized)return true;
  return (AUTO_NAMES[key]||[]).some(item=>item.toLowerCase()===normalized);
}
function visualName(key,value){return isAutoName(key,value)?(ROLE_LABELS[key]||'Atacante'):String(value||'').trim();}
function fmtDate(value){
  const raw=String(value||'');
  const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:raw;
}
function activeEvent(){
  try{
    const id=typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;
    if(!id||typeof appState==='undefined')return null;
    return (appState.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id].filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
  }catch(_){return null;}
}
function matchData(evt){
  if(!evt)return null;
  try{
    if(typeof getMatchLogosData==='function')return getMatchLogosData(evt);
  }catch(_){}
  const ownName=appState?.teamInfo?.name||'CV BUNYOLA';
  const ownLogo=appState?.teamInfo?.customLogo||'assets/club_logo.png';
  const rival=String(evt.opponent||'Rival').trim()||'Rival';
  const rivalRow=(appState?.leagueTable||[]).find(team=>String(team?.name||'').trim().toLowerCase()===rival.toLowerCase());
  const rivalLogo=rivalRow?.logo||'assets/default_avatar.svg';
  const home=String(evt.location||'').toLowerCase().includes('bunyola');
  return home
    ? {isHome:true,team1:{name:ownName,logo:ownLogo,condition:'Local'},team2:{name:rival,logo:rivalLogo,condition:'Visitante'}}
    : {isHome:false,team1:{name:rival,logo:rivalLogo,condition:'Local'},team2:{name:ownName,logo:ownLogo,condition:'Visitante'}};
}
function shortCondition(value){return /local|casa/i.test(String(value||''))?'Local':'Visitante';}
function matchHeroHtml(evt,playerLike){
  const data=matchData(evt);
  if(!data)return '';
  const team=(item)=>`<div class="game-plan-team"><img src="${esc(item.logo||'assets/default_avatar.svg')}" alt="Escudo de ${esc(item.name||'Equipo')}" onerror="this.onerror=null;this.src='assets/default_avatar.svg'"><strong>${esc(item.name||'Equipo')}</strong><small>${shortCondition(item.condition)}</small></div>`;
  return `<section class="game-plan-match-hero ${playerLike?'is-player':'is-coach'}" aria-label="Partido del plan de juego">
    ${team(data.team1)}
    <div class="game-plan-match-vs"><b>VS</b><span>${esc(fmtDate(evt?.date||''))}</span></div>
    ${team(data.team2)}
    ${playerLike?'<div class="game-plan-match-published"><i data-lucide="badge-check"></i> Plan publicado por el cuerpo técnico</div>':''}
  </section>`;
}

function patchedDirectionEnd(key,dir,tipZone=8){
  if(dir==='tip')return getVolleyballZoneAnchor(tipZone);
  if(key.startsWith('z4')){
    if(dir==='short')return getVolleyballZoneAnchor(2);
    if(dir==='medium')return getVolleyballZoneAnchor(9);
    if(dir==='long')return getVolleyballZoneAnchor(1);
  }
  if(key==='z2'){
    if(dir==='short')return getVolleyballZoneAnchor(4);
    if(dir==='medium')return getVolleyballZoneAnchor(7);
    if(dir==='long')return getVolleyballZoneAnchor(5);
  }
  return baseDirectionEnd?baseDirectionEnd(key,dir,tipZone):getVolleyballZoneAnchor(6);
}

function conePoints(x,y,x2,y2,width){
  const sy=y+2.4;
  const dx=x2-x,dy=y2-sy;
  const len=Math.max(1,Math.hypot(dx,dy));
  const px=-dy/len,py=dx/len;
  const startWidth=1.15;
  const clamp=n=>Math.max(1.5,Math.min(98.5,n));
  const a=[clamp(x+px*startWidth),clamp(sy+py*startWidth)];
  const b=[clamp(x-px*startWidth),clamp(sy-py*startWidth)];
  const c=[clamp(x2-px*width),clamp(y2-py*width)];
  const d=[clamp(x2+px*width),clamp(y2+py*width)];
  return [a,b,c,d].map(point=>point.map(n=>n.toFixed(2)).join(',')).join(' ');
}
function patchedCourt(key,attacker,index){
  const coneColor='#2563eb';
  const tipColor='#dc2626';
  const [x,y]=attackOriginForCard(key);
  const directions=attacker.directions||[];
  const label=visualName(key,attacker.name);
  const drawings=directions.map((dir,j)=>{
    const [x2,y2]=patchedDirectionEnd(key,dir,attacker.tipZone||8);
    const title=`${label}: ${getScoutDirectionLabels(key)[dir]||dir}`;
    if(dir==='tip'){
      const midX=(x+x2)/2,midY=(y+y2)/2;
      const sign=x2>=x?1:-1;
      const controlX=midX+(sign*7);
      const controlY=midY-5;
      return `<g class="attack-tip-path"><title>${esc(title)}</title><path d="M ${x} ${y+2.4} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${x2} ${y2}" fill="none" stroke="${tipColor}" stroke-width="3.25" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#attack-tip-arrow-zone-${index})"/></g>`;
    }
    const width=dir==='short'?7.2:dir==='medium'?9.2:dir==='long'?11.2:dir==='line'?5.8:8.2;
    const pts=conePoints(x,y,x2,y2,width);
    return `<g class="attack-zone-cone attack-zone-${dir}"><title>${esc(title)}</title><polygon points="${pts}" fill="${coneColor}" fill-opacity="0.18" stroke="${coneColor}" stroke-opacity="0.58" stroke-width="1.05" stroke-linejoin="round"/><circle cx="${x2}" cy="${y2}" r="2.6" fill="${coneColor}" fill-opacity="0.72"/></g>`;
  }).join('');
  const markerLabel=key==='z4a'?'R1':key==='z4b'?'R2':key==='z2'?'OP':key==='z3a'?'C1':'C2';
  return `<div class="attack-card-court attack-zone-court" aria-label="Zonas de ataque de ${esc(label)}">
    <div class="attack-court-net"><span></span></div>
    <div class="attack-line attack-line-3m"></div>
    <div class="attack-line attack-line-end"></div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
      <defs><marker id="attack-tip-arrow-zone-${index}" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${tipColor}"/></marker></defs>
      ${drawings}
    </svg>
    <div class="attack-contact" style="left:${x}%;top:${y}%;--attack-color:${coneColor}" title="Punto de contacto en la red"><span>${markerLabel}</span></div>
    ${!directions.length?'<div class="attack-card-empty">Sin direcciones seleccionadas</div>':''}
  </div>`;
}

const baseDirectionEnd=typeof attackDirectionEndForCard==='function'?attackDirectionEndForCard:null;
try{attackDirectionEndForCard=patchedDirectionEnd;}catch(_){}
try{window.attackDirectionEndForCard=patchedDirectionEnd;}catch(_){}
try{renderSingleAttackCourt=patchedCourt;}catch(_){}
try{window.renderSingleAttackCourt=patchedCourt;}catch(_){}

function decorateAttackCards(root){
  root.querySelectorAll('.attack-scout-card').forEach(card=>{
    const input=card.querySelector('.attack-name-input');
    const key=String(input?.id||'').replace('attacker-name-','') || null;
    if(!key)return;
    const role=card.querySelector('.attack-role');
    if(role)role.textContent=ROLE_LABELS[key]||role.textContent;
    if(input){
      if(isAutoName(key,input.value))input.value='';
      input.placeholder='Nombre o dorsal';
      input.autocomplete='off';
    }
    const playerName=card.querySelector('.attack-scout-card-head h4');
    if(playerName&&isAutoName(key,playerName.textContent))playerName.textContent=ROLE_LABELS[key]||'Atacante';
  });
  root.querySelectorAll('.player-plan-summary li strong').forEach(strong=>{
    const text=String(strong.textContent||'').trim();
    Object.keys(AUTO_NAMES).some(key=>{
      if(isAutoName(key,text)){strong.textContent=ROLE_LABELS[key];return true;}
      return false;
    });
  });
}
function decorateHeader(view,root){
  const evt=activeEvent();
  if(!evt)return;
  const playerLike=Boolean(root.querySelector('.player-plan-heading'));
  const oldHeading=root.querySelector('.player-plan-heading');
  const existing=root.querySelector('.game-plan-match-hero');
  if(existing)existing.remove();
  if(oldHeading){
    oldHeading.insertAdjacentHTML('afterend',matchHeroHtml(evt,true));
    oldHeading.remove();
  }else{
    const firstSection=root.querySelector(':scope > .scout-section');
    if(firstSection)firstSection.insertAdjacentHTML('beforebegin',matchHeroHtml(evt,false));
  }
  view.classList.toggle('game-plan-player-clean',!isCoach()||playerLike);
}
function decorate(){
  const view=document.getElementById('view-tactics');
  const root=document.getElementById('scouting-interactive-root');
  if(!view||!root)return;
  decorateHeader(view,root);
  decorateAttackCards(root);
  try{window.lucide?.createIcons?.();}catch(_){}
}
function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__visualSimplify20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){const out=base.apply(this,arguments);requestAnimationFrame(decorate);return out;};
  wrapped.__visualSimplify20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function injectStyles(){
  if(document.getElementById('game-plan-visual-simplify-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-visual-simplify-20260814-css';
  style.textContent=`
#view-tactics.game-plan-ux .scouting-header>div:first-child{display:none!important}
#view-tactics.game-plan-ux .scouting-header{justify-content:flex-end;margin-bottom:.35rem}
#view-tactics.game-plan-ux .game-plan-match-field{width:min(430px,100%)}
.game-plan-match-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:.8rem;margin:0 0 1rem;padding:1rem 1.1rem;border:1px solid #dbe3ee;border-radius:20px;background:linear-gradient(135deg,#f8fafc,#eef6ff);overflow:hidden}
.game-plan-match-hero.is-coach{margin-top:.2rem;background:#fff}
.game-plan-team{min-width:0;display:grid;justify-items:center;text-align:center;gap:.3rem}.game-plan-team img{width:58px;height:58px;object-fit:contain;border-radius:50%;background:#fff;border:1px solid #e2e8f0;padding:4px;box-shadow:0 4px 12px rgba(15,23,42,.08)}.game-plan-team strong{max-width:100%;font-size:.88rem;line-height:1.15;overflow:hidden;text-overflow:ellipsis}.game-plan-team small{font-size:.64rem;font-weight:850;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
.game-plan-match-vs{display:grid;justify-items:center;gap:.2rem;color:#475569}.game-plan-match-vs b{font-family:var(--font-heading);font-size:1.05rem;color:#0f172a}.game-plan-match-vs span{font-size:.67rem;font-weight:800;color:#64748b;white-space:nowrap}
.game-plan-match-published{grid-column:1/-1;display:inline-flex;justify-self:center;align-items:center;gap:.35rem;margin-top:.15rem;padding:.33rem .58rem;border-radius:999px;background:#ecfdf5;color:#047857;font-size:.67rem;font-weight:850}.game-plan-match-published svg{width:14px;height:14px}
#view-tactics .attack-name-input::placeholder{color:#94a3b8;font-weight:600}
#view-tactics .attack-role{font-size:.76rem;color:#334155;letter-spacing:.02em;text-transform:none}
#view-tactics .attack-zone-court svg{filter:drop-shadow(0 2px 2px rgba(37,99,235,.08))}
#view-tactics .attack-zone-cone polygon{transition:opacity .18s ease}#view-tactics .attack-zone-cone:hover polygon{fill-opacity:.25}
#view-tactics .attack-tip-path path{filter:drop-shadow(0 1px 1px rgba(220,38,38,.16))}
@media(max-width:720px){
  #view-tactics.game-plan-ux .scouting-header{margin-bottom:.15rem}
  #view-tactics.game-plan-ux .game-plan-match-field{width:100%}
  .game-plan-match-hero{gap:.5rem;padding:.85rem .7rem;border-radius:17px}.game-plan-team img{width:52px;height:52px}.game-plan-team strong{font-size:.78rem}.game-plan-team small{font-size:.58rem}.game-plan-match-vs b{font-size:.92rem}.game-plan-match-vs span{font-size:.61rem}
  .game-plan-match-published{font-size:.62rem}
}
`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(wrapRender()){
      clearInterval(timer);
      setTimeout(()=>{try{window.renderTactics?.();}catch(_){}},0);
    }else if(tries>100)clearInterval(timer);
  },100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
