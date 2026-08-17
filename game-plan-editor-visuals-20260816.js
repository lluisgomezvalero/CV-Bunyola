(function(){
'use strict';

const FLAG='__gamePlanEditorVisuals20260816';
if(window[FLAG])return;
window[FLAG]=true;

const ORDER=['z4a','z4b','z2','z3a','z3b'];
const ROLE_LABELS={z4a:'Receptora 1',z4b:'Receptora 2',z2:'Opuesta',z3a:'Central 1',z3b:'Central 2'};
const DIR_LABELS={line:'Línea',long:'Diagonal larga',medium:'Diagonal media',short:'Diagonal corta',tip:'Finta',attack5:'Ataque a Z5',attack1:'Ataque a Z1'};
const ZONES=[4,3,2,7,8,9,5,6,1];

function esc(value){
  try{return typeof escapeSessionText==='function'?escapeSessionText(value):String(value??'');}
  catch(_){return String(value??'');}
}
function normalize(value){return String(value||'').trim().toLowerCase().replace(/[·.\-–—]/g,' ').replace(/\s+/g,' ').trim();}
function isGeneratedName(value){
  const text=normalize(value);
  if(!text)return true;
  return /^(?:atacante|receptora|opuesta|central)(?:\s+z[234])?(?:\s+[12])?$/.test(text);
}
function plan(){try{return typeof getActiveScoutingPlan==='function'?getActiveScoutingPlan():null;}catch(_){return null;}}
function root(){return document.getElementById('scouting-interactive-root');}
function cardKey(card){
  const input=card?.querySelector('.attack-name-input[id^="attacker-name-"]');
  const key=String(input?.id||'').replace('attacker-name-','');
  return ORDER.includes(key)?key:null;
}
function humanize(text){
  return String(text||'')
    .replace(/\battack\s*5\b/gi,'Ataque a Z5')
    .replace(/\battack\s*1\b/gi,'Ataque a Z1')
    .replace(/\bzone\s*5\b/gi,'Ataque a Z5')
    .replace(/\bzone\s*1\b/gi,'Ataque a Z1')
    .replace(/Ataque a zona\s*5/gi,'Ataque a Z5')
    .replace(/Ataque a zona\s*1/gi,'Ataque a Z1')
    .replace(/Ataque a\s*5/gi,'Ataque a Z5')
    .replace(/Ataque a\s*1/gi,'Ataque a Z1');
}
function directionSummary(dir){
  const labels={line:'línea',long:'diagonal larga',medium:'diagonal media',short:'diagonal corta',tip:'finta',attack5:'ataque a Z5',attack1:'ataque a Z1',zone5:'ataque a Z5',zone1:'ataque a Z1'};
  return labels[dir]||humanize(dir);
}
function installSummaryFormatter(){
  try{getDirectionSummaryLabel=directionSummary;}catch(_){}
  try{window.getDirectionSummaryLabel=directionSummary;}catch(_){}
}

function directionEnd(key,dir,tipZone=8){
  if(dir==='tip')return getVolleyballZoneAnchor(tipZone);
  if(key.startsWith('z4')){
    if(dir==='line')return getVolleyballZoneAnchor(1);
    if(dir==='short')return getVolleyballZoneAnchor(4);
    if(dir==='medium')return getVolleyballZoneAnchor(7);
    if(dir==='long')return getVolleyballZoneAnchor(5);
  }
  if(key==='z2'){
    if(dir==='line')return getVolleyballZoneAnchor(5);
    if(dir==='short')return getVolleyballZoneAnchor(2);
    if(dir==='medium')return getVolleyballZoneAnchor(9);
    if(dir==='long')return getVolleyballZoneAnchor(1);
  }
  if(key.startsWith('z3')){
    if(dir==='attack5')return getVolleyballZoneAnchor(5);
    if(dir==='attack1')return getVolleyballZoneAnchor(1);
  }
  return getVolleyballZoneAnchor(6);
}
function conePoints(x,y,x2,y2,width){
  const sy=y+2.4,dx=x2-x,dy=y2-sy,len=Math.max(1,Math.hypot(dx,dy));
  const px=-dy/len,py=dx/len,startWidth=1.15,clamp=n=>Math.max(1.5,Math.min(98.5,n));
  const pts=[[clamp(x+px*startWidth),clamp(sy+py*startWidth)],[clamp(x-px*startWidth),clamp(sy-py*startWidth)],[clamp(x2-px*width),clamp(y2-py*width)],[clamp(x2+px*width),clamp(y2+py*width)]];
  return pts.map(point=>point.map(n=>n.toFixed(2)).join(',')).join(' ');
}
function renderCourt(key,attacker,index){
  const coneColor='#2563eb',tipColor='#dc2626';
  const [x,y]=attackOriginForCard(key),directions=attacker?.directions||[];
  const rawName=String(attacker?.name||'').trim();
  const label=isGeneratedName(rawName)?(ROLE_LABELS[key]||'Atacante'):rawName;
  const drawings=directions.map(dir=>{
    const [x2,y2]=directionEnd(key,dir,attacker?.tipZone||8);
    const title=`${label}: ${getScoutDirectionLabels(key)[dir]||dir}`;
    if(dir==='tip'){
      const midX=(x+x2)/2,midY=(y+y2)/2,sign=x2>=x?1:-1,controlX=midX+(sign*7),controlY=midY-5;
      return `<g class="attack-tip-path"><title>${esc(title)}</title><path d="M ${x} ${y+2.4} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${x2} ${y2}" fill="none" stroke="${tipColor}" stroke-width="3.25" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#attack-tip-arrow-editor-${index})"/></g>`;
    }
    const width=dir==='short'?7.2:dir==='medium'?9.2:dir==='long'?11.2:dir==='line'?5.8:8.2;
    return `<g class="attack-zone-cone attack-zone-${dir}"><title>${esc(title)}</title><polygon points="${conePoints(x,y,x2,y2,width)}" fill="${coneColor}" fill-opacity="0.18" stroke="${coneColor}" stroke-opacity="0.58" stroke-width="1.05" stroke-linejoin="round"/><circle cx="${x2}" cy="${y2}" r="2.6" fill="${coneColor}" fill-opacity="0.72"/></g>`;
  }).join('');
  const markerLabel=key==='z4a'?'R1':key==='z4b'?'R2':key==='z2'?'OP':key==='z3a'?'C1':'C2';
  return `<div class="attack-card-court attack-zone-court" aria-label="Zonas de ataque de ${esc(label)}"><div class="attack-court-net"><span></span></div><div class="attack-line attack-line-3m"></div><div class="attack-line attack-line-end"></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><defs><marker id="attack-tip-arrow-editor-${index}" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${tipColor}"/></marker></defs>${drawings}</svg><div class="attack-contact" style="left:${x}%;top:${y}%;--attack-color:${coneColor}" title="Punto de contacto en la red"><span>${markerLabel}</span></div>${!directions.length?'<div class="attack-card-empty">Sin direcciones seleccionadas</div>':''}</div>`;
}
function installCourtRenderer(){
  if(typeof attackOriginForCard!=='function'||typeof getVolleyballZoneAnchor!=='function'||typeof getScoutDirectionLabels!=='function')return false;
  try{attackDirectionEndForCard=directionEnd;}catch(_){}
  try{window.attackDirectionEndForCard=directionEnd;}catch(_){}
  try{renderSingleAttackCourt=renderCourt;}catch(_){}
  try{window.renderSingleAttackCourt=renderCourt;}catch(_){}
  return true;
}

function cleanInputs(scope){
  scope?.querySelectorAll?.('.attack-name-input').forEach(input=>{
    const key=String(input.id||'').replace('attacker-name-','');
    if(isGeneratedName(input.value))input.value='';
    input.placeholder='Nombre o dorsal';
    input.autocomplete='off';
    const role=input.closest('.attack-scout-card')?.querySelector('.attack-role');
    if(role&&ROLE_LABELS[key])role.textContent=ROLE_LABELS[key];
  });
}
function cleanStoredDraftNames(){
  try{
    const rec=typeof getActiveScoutingRecord==='function'?getActiveScoutingRecord():null;
    const attackers=rec?.draftPlan?.attackers;if(!attackers)return;
    let changed=false;
    Object.keys(attackers).forEach(key=>{if(isGeneratedName(attackers[key]?.name)){attackers[key].name='';changed=true;}});
    if(changed&&typeof appState!=='undefined'&&typeof activeScoutingMatchId!=='undefined'&&activeScoutingMatchId){
      appState.matchScouting=appState.matchScouting||{};appState.matchScouting[activeScoutingMatchId]=rec;
      if(typeof saveAppData==='function')saveAppData(appState);
    }
  }catch(error){console.warn('[GamePlanEditorVisuals] clean names',error);}
}
function selectedDirections(scope,key,attacker){
  const boxes=[...scope.querySelectorAll(`input[id^="attacker-${key}-"]`)].filter(el=>el.type==='checkbox'&&el.checked);
  return boxes.length?boxes.map(el=>el.id.replace(`attacker-${key}-`,'')):(Array.isArray(attacker?.directions)?attacker.directions:[]);
}
function tipZone(scope,key,attacker){return Number(scope.querySelector(`#attacker-tip-zone-${key}`)?.value||attacker?.tipZone||8)||8;}
function directionLabel(dir,zone){return dir==='tip'?`Finta · Z${zone}`:(DIR_LABELS[dir]||humanize(dir));}
function decorateAttack(scope,p){
  const title=scope.querySelector('.attack-module-section .scout-section-head h3');if(title)title.textContent='Tendencias de ataque rival';
  scope.querySelectorAll('.attack-scout-card').forEach(card=>{
    const key=cardKey(card);if(!key)return;
    const attacker=p?.attackers?.[key]||{},dirs=selectedDirections(scope,key,attacker),zone=tipZone(scope,key,attacker);
    let summary=card.querySelector('.attack-tendency-summary');
    if(!summary){summary=document.createElement('div');summary.className='attack-tendency-summary';const head=card.querySelector('.attack-scout-card-head');if(head)head.insertAdjacentElement('afterend',summary);else card.prepend(summary);}
    summary.innerHTML=`<strong>Tendencia de ataque</strong><div>${dirs.map(dir=>`<span>${directionLabel(dir,zone)}</span>`).join('')||'<em>Sin tendencia marcada</em>'}</div>`;
  });
}
function serveValues(scope,p){return ZONES.map(zone=>({zone,value:Math.max(0,Number(scope.querySelector(`#serve-pct-z${zone}`)?.value ?? p?.servePct?.[`z${zone}`])||0)}));}
function decorateServe(scope,p){
  const section=[...scope.querySelectorAll('.scout-section')].find(sec=>/saque rival|saque por zonas/i.test(sec.querySelector('.scout-section-head h3')?.textContent||''));if(!section)return;
  const heading=section.querySelector('.scout-section-head h3'),desc=section.querySelector('.scout-section-head p'),coach=Boolean(section.querySelector('input[id^="serve-pct-z"]'));
  if(heading)heading.textContent='Tendencia de saque por zonas';if(desc)desc.textContent=coach?'Indica qué zonas utiliza más el rival.':'Zonas donde el rival concentra más el saque.';
  const top=serveValues(scope,p).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,3);
  let box=section.querySelector('.serve-zone-priority-summary');if(!box){box=document.createElement('div');box.className='serve-zone-priority-summary';const heat=section.querySelector('.serve-heat-volleyball-wrap');if(heat)heat.insertAdjacentElement('beforebegin',box);else section.appendChild(box);}
  box.innerHTML=top.length?`<div><strong>Zonas preferentes</strong><small>De mayor a menor tendencia</small></div><div class="serve-priority-zones">${top.map((item,index)=>`<span class="${index===0?'is-primary':''}"><b>${index+1}ª</b> Z${item.zone}</span>`).join('')}</div>`:'<div><strong>Zonas preferentes</strong><small>Aún no hay tendencia marcada</small></div><div class="serve-priority-zones"><em>Sin zonas seleccionadas</em></div>';
}
function normalizeCourt(court){
  const lines3=[...court.querySelectorAll(':scope > .attack-line-3m')];if(!lines3.length){const line=document.createElement('div');line.className='attack-line attack-line-3m';court.querySelector(':scope > .attack-court-net')?.insertAdjacentElement('afterend',line);}else if(lines3.length>1)lines3.slice(1).forEach(x=>x.remove());
  const ends=[...court.querySelectorAll(':scope > .attack-line-end')];if(ends.length>1)ends.slice(1).forEach(x=>x.remove());
}
function decorate(){
  const scope=root();if(!scope)return false;
  cleanInputs(scope);decorateAttack(scope,plan());decorateServe(scope,plan());scope.querySelectorAll('.attack-card-court').forEach(normalizeCourt);
  scope.querySelectorAll('.player-plan-summary li,.attack-tendency-summary span,.player-attack-legend span').forEach(node=>{const next=humanize(node.textContent);if(next!==node.textContent)node.textContent=next;});
  return true;
}
function schedule(){requestAnimationFrame(decorate);}

function wrapRender(){
  const base=window.renderTactics;if(typeof base!=='function')return false;if(base.__editorVisuals20260816)return true;
  const wrapped=function(){installCourtRenderer();installSummaryFormatter();const out=base.apply(this,arguments);schedule();return out;};
  wrapped.__editorVisuals20260816=true;window.renderTactics=wrapped;try{renderTactics=wrapped;}catch(_){}return true;
}
function wrapSave(){
  const base=window.saveScoutingData;if(typeof base!=='function')return false;if(base.__editorVisuals20260816)return true;
  const wrapped=function(){cleanInputs(root()||document);const out=base.apply(this,arguments);cleanStoredDraftNames();schedule();return out;};
  wrapped.__editorVisuals20260816=true;window.saveScoutingData=wrapped;try{saveScoutingData=wrapped;}catch(_){}return true;
}
function bindEvents(){
  if(document.documentElement.dataset.gamePlanEditorVisualsBound==='1')return;
  document.documentElement.dataset.gamePlanEditorVisualsBound='1';
  const relevant=target=>Boolean(target?.closest?.('#scouting-interactive-root'));
  document.addEventListener('change',event=>{if(!relevant(event.target))return;const id=String(event.target?.id||'');if(id.startsWith('attacker-')||id.startsWith('serve-pct-z'))schedule();});
  document.addEventListener('input',event=>{if(!relevant(event.target))return;const id=String(event.target?.id||'');if(id.startsWith('serve-pct-z')||id.startsWith('attacker-name-'))schedule();});
}
function injectStyles(){
  if(document.getElementById('game-plan-editor-visuals-20260816-css'))return;
  const style=document.createElement('style');style.id='game-plan-editor-visuals-20260816-css';style.textContent=`
#view-tactics .attack-card-court::before,#view-tactics .attack-card-court::after{content:none!important;display:none!important}
#view-tactics .attack-card-court>.attack-line-3m{display:block!important;top:33.333%!important}
#view-tactics .attack-card-court>.attack-line-end{display:block!important;bottom:0!important}
#view-tactics .attack-tendency-summary{margin:.7rem 0 .8rem;padding:.68rem .75rem;border:1px solid #dbeafe;border-radius:13px;background:#f8fbff;display:grid;gap:.42rem}
#view-tactics .attack-tendency-summary>strong{font-size:.7rem;line-height:1;text-transform:uppercase;letter-spacing:.075em;color:#2563eb}
#view-tactics .attack-tendency-summary>div{display:flex;flex-wrap:wrap;gap:.38rem;min-width:0}
#view-tactics .attack-tendency-summary span{display:inline-flex;align-items:center;min-height:27px;padding:.28rem .5rem;border-radius:999px;background:#eaf2ff;color:#1e3a8a;font-size:.71rem;font-weight:800;line-height:1.1}
#view-tactics .attack-tendency-summary em{font-style:normal;color:#94a3b8;font-size:.74rem;font-weight:700}
#view-tactics .serve-zone-priority-summary{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin:.15rem 0 .85rem;padding:.78rem .85rem;border:1px solid #fed7aa;border-radius:14px;background:#fffaf3}
#view-tactics .serve-zone-priority-summary>div:first-child{display:grid;gap:.12rem;min-width:0}
#view-tactics .serve-zone-priority-summary strong{font-size:.79rem;color:#9a3412}
#view-tactics .serve-zone-priority-summary small{font-size:.66rem;color:#78716c}
#view-tactics .serve-priority-zones{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.35rem}
#view-tactics .serve-priority-zones span{display:inline-flex;align-items:center;gap:.25rem;padding:.34rem .48rem;border:1px solid #fed7aa;border-radius:999px;background:#fff;color:#9a3412;font-size:.7rem;font-weight:850;white-space:nowrap}
#view-tactics .serve-priority-zones span.is-primary{background:#ffedd5;border-color:#fb923c;color:#c2410c}
#view-tactics .serve-priority-zones b{font-size:.59rem;text-transform:uppercase;letter-spacing:.04em;opacity:.72}
#view-tactics .serve-priority-zones em{font-style:normal;color:#a8a29e;font-size:.7rem;font-weight:700}
@media(max-width:720px){
#view-tactics .attack-tendency-summary{margin:.58rem 0 .7rem;padding:.62rem .68rem}#view-tactics .attack-tendency-summary span{font-size:.68rem}
#view-tactics .serve-zone-priority-summary{align-items:flex-start;flex-direction:column;padding:.72rem .75rem}#view-tactics .serve-priority-zones{justify-content:flex-start;width:100%}
#view-tactics.coach-board-mode.coach-top-compact{width:calc(100% + .7rem)!important;max-width:calc(100% + .7rem)!important;margin-left:-.35rem!important;margin-right:-.35rem!important;box-sizing:border-box!important}
#view-tactics.coach-board-mode.coach-top-compact>.card,#view-tactics.coach-board-mode.coach-top-compact .tactics-card,#view-tactics.coach-board-mode.coach-top-compact .game-plan-card{width:100%!important;max-width:100%!important;padding-left:.45rem!important;padding-right:.45rem!important;box-sizing:border-box!important}
#view-tactics.coach-board-mode.coach-top-compact #scouting-interactive-root.coach-board-root.coach-top-compact-root{width:100%!important;max-width:100%!important;padding:.35rem!important;box-sizing:border-box!important}
#view-tactics.coach-board-mode.coach-top-compact .scout-section{width:100%!important;max-width:100%!important;padding:.62rem!important;box-sizing:border-box!important}
#view-tactics.coach-board-mode.coach-top-compact .attack-scout-card{width:100%!important;max-width:100%!important;padding:.6rem!important;box-sizing:border-box!important}
#view-tactics.coach-board-mode.coach-top-compact .attack-scout-card-head{width:100%!important;max-width:100%!important;min-width:0!important;margin:0 0 .6rem!important;box-sizing:border-box!important;align-self:stretch!important;border-radius:12px!important;overflow:hidden!important}
#view-tactics.coach-board-mode.coach-top-compact .attack-direction-options{padding:.48rem!important}
#view-tactics.coach-board-mode.coach-top-compact .coach-compact-publish-bar,#view-tactics.coach-board-mode.coach-top-compact .coach-compact-read-tracker{width:100%!important;max-width:100%!important;box-sizing:border-box!important}
}`;document.head.appendChild(style);
}
function install(){
  injectStyles();installSummaryFormatter();bindEvents();let tries=0;
  const timer=setInterval(()=>{tries++;const a=installCourtRenderer(),b=wrapRender(),c=wrapSave();decorate();if(a&&b&&c&&root())clearInterval(timer);else if(tries>150)clearInterval(timer);},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
