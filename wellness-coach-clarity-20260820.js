(function(){
'use strict';
const FLAG='__wellnessCoachClarity20260820';
if(window[FLAG])return;
window[FLAG]=true;

function isCoach(){
  try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}catch(_){return false;}
}

function ensureStyles(){
  if(document.getElementById('wellness-coach-clarity-20260820-style'))return;
  const style=document.createElement('style');
  style.id='wellness-coach-clarity-20260820-style';
  style.textContent=`
  @media(max-width:760px){
    #view-wellness #borg-legend-inline{display:none!important}

    #view-wellness .wellness-weekly-detail-toggle{
      width:100%!important;
      min-height:42px!important;
      margin:.7rem 0 0!important;
      padding:.62rem .72rem!important;
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:.5rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:12px!important;
      background:#f8fafb!important;
      color:#536173!important;
      box-shadow:none!important;
      font-size:.68rem!important;
      font-weight:850!important;
      text-align:left!important;
    }
    #view-wellness .wellness-weekly-detail-toggle svg{width:16px!important;height:16px!important;transition:transform .18s ease!important}
    #view-wellness .wellness-weekly-detail-toggle[aria-expanded="true"] svg{transform:rotate(180deg)!important}
    #view-wellness .wellness-weekly-detail-table{
      display:none!important;
      margin:.45rem 0 0!important;
      max-height:290px!important;
      overflow:auto!important;
      border:1px solid #edf0f3!important;
      border-radius:12px!important;
      background:#fff!important;
    }
    #view-wellness .wellness-weekly-detail-table.is-open{display:block!important}

    #view-wellness .wellness-chart-section{
      order:1!important;
      margin:.1rem 0 0!important;
      padding:.15rem 0 .25rem!important;
      border-top:0!important;
    }
    #view-wellness #wellness-chart-title{font-size:.92rem!important}
    #view-wellness .wellness-chart-frame{height:205px!important;min-height:205px!important;max-height:205px!important}

    #view-wellness #rpe-team-summary-section.wellness-rpe-clear-card{
      margin:.85rem 0 0!important;
      padding:.82rem!important;
      border:1px solid #e3e8ee!important;
      border-radius:18px!important;
      background:rgba(255,255,255,.97)!important;
      box-shadow:0 5px 16px rgba(15,23,42,.03)!important;
    }
    #view-wellness #rpe-team-summary-section.wellness-rpe-clear-card h3{
      font-size:.92rem!important;
      color:#253044!important;
    }
    #view-wellness #rpe-team-summary-section.wellness-rpe-clear-card>p{
      margin-bottom:.58rem!important;
      font-size:.61rem!important;
    }

    #view-wellness .wellness-coach-inspector{
      margin-top:.85rem!important;
    }
    #view-wellness .wellness-coach-inspector .wellness-clarity-heading{
      margin:0 0 .18rem!important;
      color:#253044!important;
      font-family:var(--font-heading)!important;
      font-size:1rem!important;
      line-height:1.15!important;
    }
    #view-wellness .wellness-coach-inspector .wellness-clarity-copy{
      margin:0 0 .65rem!important;
      color:#7d8998!important;
      font-size:.62rem!important;
      line-height:1.4!important;
    }
  }
  `;
  document.head.appendChild(style);
}

function weeklyTableWrap(){
  const table=document.querySelector('#view-wellness .borg-matrix-table');
  if(!table)return null;
  const wrap=table.parentElement;
  if(!wrap)return null;
  wrap.classList.add('wellness-weekly-detail-table');
  return wrap;
}

function ensureWeeklyToggle(){
  const wrap=weeklyTableWrap();
  if(!wrap)return;
  let button=wrap.previousElementSibling;
  if(!button?.classList?.contains('wellness-weekly-detail-toggle')){
    button=document.createElement('button');
    button.type='button';
    button.className='wellness-weekly-detail-toggle';
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span>Ver detalle semanal y respuestas por día</span><i data-lucide="chevron-down"></i>';
    wrap.parentElement?.insertBefore(button,wrap);
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',open?'false':'true');
      wrap.classList.toggle('is-open',!open);
    });
  }
}

function simplifyIndividualTable(){
  const table=document.querySelector('#view-wellness .wellness-coach-inspector .wellness-detail-table');
  if(!table)return;
  const headers=[...table.querySelectorAll('thead th')];
  const idx=headers.findIndex(th=>/^estado$/i.test(th.textContent.trim()));
  if(idx<0)return;
  headers[idx].remove();
  table.querySelectorAll('tbody tr').forEach(row=>row.children[idx]?.remove());
}

function decorateInspector(){
  const inspector=document.querySelector('#view-wellness .wellness-coach-inspector');
  if(!inspector)return;
  let heading=[...inspector.querySelectorAll('h2,h3')].find(el=>/seguimiento individual/i.test(el.textContent));
  if(heading){
    heading.textContent='Seguimiento individual';
    heading.classList.add('wellness-clarity-heading');
  }
  const paragraphs=[...inspector.querySelectorAll('p')];
  const intro=paragraphs.find(p=>/consulta el cuestionario|cuestionario de cada jugadora/i.test(p.textContent));
  if(intro){
    intro.textContent='Consulta los últimos registros de cada jugadora.';
    intro.classList.add('wellness-clarity-copy');
  }
}

function separateRpe(mainCard){
  const section=document.getElementById('rpe-team-summary-section');
  if(!section)return;
  section.classList.add('wellness-rpe-clear-card');
  const title=section.querySelector('h3');
  if(title)title.textContent='Carga percibida de entrenamientos';
  const copy=section.querySelector(':scope > p');
  if(copy)copy.textContent='RPE medio de cada sesión. Pulsa una tarjeta para ver las respuestas.';
  if(mainCard&&section.parentElement===mainCard){
    mainCard.insertAdjacentElement('afterend',section);
  }
}

function reorderWellness(mainCard){
  if(!mainCard)return;
  const header=mainCard.querySelector(':scope > .card-header');
  const chart=document.getElementById('chart-wellness-weekly');
  const chartSection=chart?.parentElement?.parentElement;
  if(header&&chartSection&&chartSection.parentElement===mainCard){
    header.insertAdjacentElement('afterend',chartSection);
  }
}

function decorate(){
  if(!isCoach())return;
  const root=document.getElementById('view-wellness');
  if(!root)return;
  const mainCard=root.querySelector(':scope > .wellness-main-card')||root.querySelector(':scope > .card');
  const title=document.getElementById('borg-matrix-header-title');
  if(title)title.textContent='Bienestar del equipo';
  const chartTitle=document.getElementById('wellness-chart-title');
  if(chartTitle)chartTitle.textContent='Tendencia semanal de fatiga';
  const chartCopy=document.getElementById('wellness-chart-description');
  if(chartCopy)chartCopy.textContent='Media semanal de los cuestionarios del equipo.';
  document.getElementById('borg-legend-inline')?.setAttribute('aria-hidden','true');
  reorderWellness(mainCard);
  ensureWeeklyToggle();
  separateRpe(mainCard);
  decorateInspector();
  simplifyIndividualTable();
  try{window.lucide?.createIcons?.();}catch(_){}
}

function install(){
  ensureStyles();
  decorate();
  setTimeout(decorate,250);
  setTimeout(decorate,900);
  const root=document.getElementById('view-wellness');
  if(root&&!root.dataset.wellnessCoachClarityObserved){
    root.dataset.wellnessCoachClarityObserved='1';
    let timer=null;
    new MutationObserver(()=>{
      if(!root.classList.contains('active'))return;
      clearTimeout(timer);
      timer=setTimeout(decorate,80);
    }).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
