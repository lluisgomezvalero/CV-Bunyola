(function(){
'use strict';

const FLAG='__gamePlanCardPolish20260814';
if(window[FLAG])return;
window[FLAG]=true;

const ORDER=['z4a','z4b','z2','z3a','z3b'];
const MARKER_TO_KEY={R1:'z4a',R2:'z4b',OP:'z2',C1:'z3a',C2:'z3b'};
const ROLE_LABELS={z4a:'Receptora 1',z4b:'Receptora 2',z2:'Opuesta',z3a:'Central 1',z3b:'Central 2'};
const DIR_LABELS={
  line:'Línea',
  long:'Diagonal larga',
  medium:'Diagonal media',
  short:'Diagonal corta',
  tip:'Finta',
  attack5:'Ataque a Z5',
  attack1:'Ataque a Z1'
};
const ZONES=[4,3,2,7,8,9,5,6,1];

function getPlan(){
  try{return typeof getActiveScoutingPlan==='function'?getActiveScoutingPlan():null;}
  catch(_){return null;}
}

function cardKey(card){
  const input=card.querySelector('.attack-name-input');
  const fromInput=String(input?.id||'').replace('attacker-name-','');
  if(ORDER.includes(fromInput))return fromInput;
  const marker=String(card.querySelector('.attack-contact span')?.textContent||'').trim().toUpperCase();
  return MARKER_TO_KEY[marker]||null;
}

function isGeneratedCentralName(key,value){
  if(!key?.startsWith('z3'))return false;
  const text=String(value||'').trim();
  if(!text)return true;
  const idx=key==='z3a'?'1':'2';
  const normalized=text.toLowerCase().replace(/[·.\-–—]/g,' ').replace(/\s+/g,' ').trim();
  const generated=new Set([
    `central z3 ${idx}`,
    `central ${idx}`,
    `atacante z3 ${idx}`,
    `atacante ${idx}`,
    'central z3',
    'atacante z3'
  ]);
  return generated.has(normalized);
}

function cleanCentralInputs(root){
  ['z3a','z3b'].forEach(key=>{
    const input=root.querySelector(`#attacker-name-${key}`);
    if(!input)return;
    if(isGeneratedCentralName(key,input.value))input.value='';
    input.placeholder='Nombre o dorsal';
    input.autocomplete='off';
    const role=input.closest('.attack-scout-card')?.querySelector('.attack-role');
    if(role)role.textContent=ROLE_LABELS[key];
  });
}

function selectedDirections(root,key,attacker){
  const checkboxes=[...root.querySelectorAll(`input[id^="attacker-${key}-"]`)].filter(el=>el.type==='checkbox'&&el.checked);
  if(checkboxes.length){
    return checkboxes.map(el=>el.id.replace(`attacker-${key}-`,''));
  }
  return Array.isArray(attacker?.directions)?attacker.directions:[];
}

function tipZone(root,key,attacker){
  const select=root.querySelector(`#attacker-tip-zone-${key}`);
  return Number(select?.value||attacker?.tipZone||8)||8;
}

function directionLabel(dir,zone){
  if(dir==='tip')return `Finta · Z${zone}`;
  return DIR_LABELS[dir]||String(dir||'').replace(/^attack5$/i,'Ataque a Z5').replace(/^attack1$/i,'Ataque a Z1');
}

function decorateAttackCards(root,plan){
  root.querySelectorAll('.attack-scout-card').forEach(card=>{
    const key=cardKey(card);
    if(!key)return;
    const attacker=plan?.attackers?.[key]||{};
    const dirs=selectedDirections(root,key,attacker);
    const zone=tipZone(root,key,attacker);

    let summary=card.querySelector('.attack-tendency-summary');
    if(!summary){
      summary=document.createElement('div');
      summary.className='attack-tendency-summary';
      const header=card.querySelector('.attack-scout-card-head');
      if(header)header.insertAdjacentElement('afterend',summary);
      else card.prepend(summary);
    }
    const chips=dirs.map(dir=>`<span>${directionLabel(dir,zone)}</span>`).join('');
    summary.innerHTML=`<strong>Tendencia de ataque</strong><div>${chips||'<em>Sin tendencia marcada</em>'}</div>`;

    card.querySelectorAll('.player-attack-legend span').forEach(span=>{
      span.textContent=String(span.textContent||'')
        .replace(/attack5/gi,'Ataque a Z5')
        .replace(/attack1/gi,'Ataque a Z1')
        .replace(/Ataque a 5/gi,'Ataque a Z5')
        .replace(/Ataque a 1/gi,'Ataque a Z1');
    });
  });
}

function serveValues(root,plan){
  return ZONES.map(zone=>{
    const input=root.querySelector(`#serve-pct-z${zone}`);
    const raw=input?input.value:plan?.servePct?.[`z${zone}`];
    return {zone,value:Math.max(0,Number(raw)||0)};
  });
}

function decorateServe(root,plan){
  const sections=[...root.querySelectorAll('.scout-section')];
  const section=sections.find(sec=>/saque rival|saque por zonas/i.test(sec.querySelector('.scout-section-head h3')?.textContent||''));
  if(!section)return;

  const heading=section.querySelector('.scout-section-head h3');
  const desc=section.querySelector('.scout-section-head p');
  if(heading)heading.textContent='Tendencia de saque por zonas';
  if(desc){
    const coach=Boolean(section.querySelector('input[id^="serve-pct-z"]'));
    desc.textContent=coach?'Indica qué zonas utiliza más el rival.':'Zonas donde el rival concentra más el saque.';
  }

  const values=serveValues(root,plan).filter(item=>item.value>0).sort((a,b)=>b.value-a.value);
  const top=values.slice(0,3);
  let box=section.querySelector('.serve-zone-priority-summary');
  if(!box){
    box=document.createElement('div');
    box.className='serve-zone-priority-summary';
    const heat=section.querySelector('.serve-heat-volleyball-wrap');
    if(heat)heat.insertAdjacentElement('beforebegin',box);
    else section.appendChild(box);
  }
  if(top.length){
    box.innerHTML=`<div><strong>Zonas preferentes</strong><small>De mayor a menor tendencia</small></div><div class="serve-priority-zones">${top.map((item,index)=>`<span class="${index===0?'is-primary':''}"><b>${index+1}ª</b> Z${item.zone}</span>`).join('')}</div>`;
  }else{
    box.innerHTML='<div><strong>Zonas preferentes</strong><small>Aún no hay tendencia marcada</small></div><div class="serve-priority-zones"><em>Sin zonas seleccionadas</em></div>';
  }

  const help=section.querySelector('.scout-help');
  if(help){
    help.textContent=section.querySelector('input[id^="serve-pct-z"]')
      ?'Los valores sirven para ordenar la tendencia; arriba verás automáticamente las zonas preferentes.'
      :'La intensidad de la pista muestra el resto de la distribución del saque.';
  }
}

function decorateSectionTitles(root){
  const first=root.querySelector('.attack-module-section .scout-section-head h3');
  if(first)first.textContent='Tendencias de ataque rival';
}

function decorate(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root)return;
  const plan=getPlan();
  cleanCentralInputs(root);
  decorateSectionTitles(root);
  decorateAttackCards(root,plan);
  decorateServe(root,plan);
}

function bindLiveUpdates(){
  const root=document.getElementById('scouting-interactive-root');
  if(!root||root.dataset.cardPolishBound==='1')return;
  root.dataset.cardPolishBound='1';
  const refresh=()=>requestAnimationFrame(decorate);
  root.addEventListener('change',event=>{
    const id=String(event.target?.id||'');
    if(id.startsWith('attacker-')||id.startsWith('serve-pct-z'))refresh();
  });
  root.addEventListener('input',event=>{
    const id=String(event.target?.id||'');
    if(id.startsWith('serve-pct-z'))refresh();
  });
}

function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__cardPolish20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    requestAnimationFrame(()=>{decorate();bindLiveUpdates();});
    return out;
  };
  wrapped.__cardPolish20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}

function injectStyles(){
  if(document.getElementById('game-plan-card-polish-20260814-css'))return;
  const style=document.createElement('style');
  style.id='game-plan-card-polish-20260814-css';
  style.textContent=`
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
  #view-tactics .attack-tendency-summary{margin:.58rem 0 .7rem;padding:.62rem .68rem}
  #view-tactics .attack-tendency-summary span{font-size:.68rem}
  #view-tactics .serve-zone-priority-summary{align-items:flex-start;flex-direction:column;padding:.72rem .75rem}
  #view-tactics .serve-priority-zones{justify-content:flex-start;width:100%}
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
    bindLiveUpdates();
    if(ready){
      clearInterval(timer);
      setTimeout(()=>{decorate();bindLiveUpdates();},0);
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
