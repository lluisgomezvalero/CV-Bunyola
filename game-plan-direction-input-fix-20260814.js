(function(){
'use strict';

const FLAG='__gamePlanDirectionInputFix20260814';
if(window[FLAG])return;
window[FLAG]=true;

const ROLE_LABELS={z4a:'Receptora 1',z4b:'Receptora 2',z2:'Opuesta',z3a:'Central 1',z3b:'Central 2'};

function esc(value){
  try{return typeof escapeSessionText==='function'?escapeSessionText(value):String(value??'');}
  catch(_){return String(value??'');}
}

function isGeneratedName(value){
  const text=String(value||'').trim();
  if(!text)return true;
  return /^(?:atacante|receptora|opuesta|central)(?:\s*[·.\-–—]?\s*z[234])?(?:\s*[·.\-–—]?\s*[12])?$/i.test(text);
}

function cleanAttackerInputs(root=document){
  root.querySelectorAll?.('.attack-name-input').forEach(input=>{
    const key=String(input.id||'').replace('attacker-name-','');
    const card=input.closest('.attack-scout-card');
    const role=card?.querySelector('.attack-role');
    if(role&&ROLE_LABELS[key])role.textContent=ROLE_LABELS[key];
    if(isGeneratedName(input.value))input.value='';
    input.placeholder='Nombre o dorsal';
    input.autocomplete='off';
  });
}

function directionEnd(key,dir,tipZone=8){
  if(dir==='tip')return getVolleyballZoneAnchor(tipZone);

  // La pista se mira desde nuestro campo hacia el rival.
  // Z4 rival aparece a la derecha: línea queda a la derecha; diagonales cruzan a la izquierda.
  if(key.startsWith('z4')){
    if(dir==='line')return getVolleyballZoneAnchor(1);
    if(dir==='short')return getVolleyballZoneAnchor(4);
    if(dir==='medium')return getVolleyballZoneAnchor(7);
    if(dir==='long')return getVolleyballZoneAnchor(5);
  }

  // Z2 rival aparece a la izquierda: línea queda a la izquierda; diagonales cruzan a la derecha.
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

function correctedCourt(key,attacker,index){
  const coneColor='#2563eb';
  const tipColor='#dc2626';
  const [x,y]=attackOriginForCard(key);
  const directions=attacker.directions||[];
  const rawName=String(attacker.name||'').trim();
  const label=isGeneratedName(rawName)?(ROLE_LABELS[key]||'Atacante'):rawName;

  const drawings=directions.map(dir=>{
    const [x2,y2]=directionEnd(key,dir,attacker.tipZone||8);
    const title=`${label}: ${getScoutDirectionLabels(key)[dir]||dir}`;
    if(dir==='tip'){
      const midX=(x+x2)/2,midY=(y+y2)/2;
      const sign=x2>=x?1:-1;
      const controlX=midX+(sign*7);
      const controlY=midY-5;
      return `<g class="attack-tip-path"><title>${esc(title)}</title><path d="M ${x} ${y+2.4} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${x2} ${y2}" fill="none" stroke="${tipColor}" stroke-width="3.25" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#attack-tip-arrow-corrected-${index})"/></g>`;
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
      <defs><marker id="attack-tip-arrow-corrected-${index}" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${tipColor}"/></marker></defs>
      ${drawings}
    </svg>
    <div class="attack-contact" style="left:${x}%;top:${y}%;--attack-color:${coneColor}" title="Punto de contacto en la red"><span>${markerLabel}</span></div>
    ${!directions.length?'<div class="attack-card-empty">Sin direcciones seleccionadas</div>':''}
  </div>`;
}

function installCourtFix(){
  if(typeof attackOriginForCard!=='function'||typeof getVolleyballZoneAnchor!=='function'||typeof getScoutDirectionLabels!=='function')return false;
  try{attackDirectionEndForCard=directionEnd;}catch(_){}
  try{window.attackDirectionEndForCard=directionEnd;}catch(_){}
  try{renderSingleAttackCourt=correctedCourt;}catch(_){}
  try{window.renderSingleAttackCourt=correctedCourt;}catch(_){}
  return true;
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__directionInputFix20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    installCourtFix();
    const out=base.apply(this,arguments);
    requestAnimationFrame(()=>cleanAttackerInputs(document.getElementById('scouting-interactive-root')||document));
    return out;
  };
  wrapped.__directionInputFix20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function observePlan(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.__directionInputObserver20260814)return;
  root.__directionInputObserver20260814=true;
  let frame=0;
  const observer=new MutationObserver(()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>cleanAttackerInputs(root));
  });
  observer.observe(root,{childList:true,subtree:true});
  cleanAttackerInputs(root);
}

function install(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const courtReady=installCourtFix();
    const renderReady=wrapRender();
    observePlan();
    if(courtReady&&renderReady){
      clearInterval(timer);
      setTimeout(()=>{installCourtFix();cleanAttackerInputs(document.getElementById('scouting-interactive-root')||document);},0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
