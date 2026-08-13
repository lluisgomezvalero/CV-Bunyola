(function(){
'use strict';

const FLAG='__rosterContextLayout20260813';
if(window[FLAG])return;
window[FLAG]=true;

function isCoach(){
  try{return typeof window.isCoachUser==='function'&&window.isCoachUser();}
  catch(_){return false;}
}
function state(){
  try{return typeof appState!=='undefined'?appState:null;}
  catch(_){return null;}
}
function isRosterActive(){return document.getElementById('view-roster')?.classList.contains('active')||false;}
function visiblePlayers(){return (state()?.players||[]).filter(player=>player&&player.active!==false);}

function injectStyles(){
  if(document.getElementById('roster-context-layout-20260813-css'))return;
  const style=document.createElement('style');
  style.id='roster-context-layout-20260813-css';
  style.textContent=`
    #view-roster #btn-export-csv{display:none!important}
    #view-roster>.card-header{margin-bottom:1rem!important}
    #view-roster>.card-header>div:last-child{align-items:center}

    .roster-context-summary{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:0 0 .75rem;color:#64748b}
    .roster-context-summary strong{font-size:.83rem;color:#334155;font-weight:850}
    .roster-context-summary span{font-size:.72rem;color:#94a3b8}

    #view-roster .filter-bar{scrollbar-width:none;-ms-overflow-style:none;padding:.05rem 0 .15rem!important;margin-bottom:1rem!important;gap:.42rem!important}
    #view-roster .filter-bar::-webkit-scrollbar{display:none}
    #view-roster .filter-bar .filter-btn{flex:0 0 auto!important;border-radius:999px!important;padding:.43rem .72rem!important;min-height:34px!important;font-size:.72rem!important;white-space:nowrap!important;background:rgba(255,255,255,.86)!important}
    #view-roster .filter-bar .filter-btn.active{background:#fff7ed!important;border-color:#fdba74!important;color:#9a3412!important}

    .roster-export-footer{display:none;justify-content:center;padding:1.5rem 0 .4rem;margin-top:.25rem}
    .roster-export-footer button{display:inline-flex;align-items:center;justify-content:center;gap:.48rem;min-height:42px;padding:.65rem .9rem;border:1px solid #cbd5e1;border-radius:13px;background:rgba(255,255,255,.82);color:#475569;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
    .roster-export-footer button:hover{background:#fff;color:#0f172a;border-color:#94a3b8}
    .roster-export-footer button svg{width:17px;height:17px}
    body.volley-roster-context .roster-export-footer[data-coach="1"]{display:flex}
    @media(min-width:961px){.roster-export-footer[data-coach="1"]{display:flex}}

    .roster-mobile-add{display:none}

    @media(max-width:960px){
      body.volley-roster-context .volley-mobile-bar{
        left:0!important;right:0!important;top:0!important;width:auto!important;
        height:calc(58px + env(safe-area-inset-top,0px))!important;
        padding:env(safe-area-inset-top,0px) 10px 0!important;
        display:grid!important;grid-template-columns:44px minmax(0,1fr) 44px!important;align-items:center!important;gap:.35rem!important;
        border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0 0 16px 16px!important;
        background:#fff!important;box-shadow:0 7px 20px rgba(15,23,42,.08)!important;
        backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:hidden!important;
      }
      body.volley-roster-context .volley-mobile-bar>.volley-mobile-menu{
        width:44px!important;height:44px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#0f172a!important;box-shadow:none!important;
      }
      body.volley-roster-context .volley-mobile-bar>strong{
        display:block!important;min-width:0!important;margin:0!important;color:#0f172a!important;
        font-family:var(--font-heading)!important;font-size:1.04rem!important;font-weight:850!important;text-align:left!important;
        white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
      }
      body.volley-roster-context .volley-mobile-bar>.volley-mobile-profile{display:none!important}
      body.volley-roster-context .roster-mobile-add{
        display:grid!important;place-items:center;width:40px;height:40px;justify-self:end;border:0;border-radius:12px;
        background:#fff7ed;color:#9a3412;cursor:pointer
      }
      body.volley-roster-context .roster-mobile-add[hidden]{display:none!important}
      body.volley-roster-context .roster-mobile-add svg{width:20px;height:20px}
      body.volley-roster-context .app-portal-wrapper{padding-top:calc(70px + env(safe-area-inset-top,0px))!important}
      body.volley-roster-context #view-roster>.card-header{display:none!important}
      body.volley-roster-context #view-roster{padding-top:0!important}
      body.volley-roster-context .roster-context-summary{margin-top:0;margin-bottom:.65rem;padding:0 .08rem}
      body.volley-roster-context .roster-context-summary strong{font-size:.8rem}
      body.volley-roster-context .roster-context-summary span{display:none}
      body.volley-roster-context #view-roster .filter-bar{margin-bottom:.85rem!important}
      body.volley-roster-context .roster-export-footer{padding:1.25rem 0 .25rem}
      body.volley-roster-context .roster-export-footer button{width:100%;max-width:360px;background:rgba(255,255,255,.9)}
    }
  `;
  document.head.appendChild(style);
}

function ensureMobileAction(){
  const bar=document.querySelector('.volley-mobile-bar');
  if(!bar)return null;
  let button=bar.querySelector('.roster-mobile-add');
  if(!button){
    button=document.createElement('button');
    button.type='button';
    button.className='roster-mobile-add';
    button.setAttribute('aria-label','Nueva jugadora');
    button.title='Nueva jugadora';
    button.innerHTML='<i data-lucide="user-plus"></i>';
    button.addEventListener('click',event=>{
      event.preventDefault();
      if(!isCoach())return;
      document.getElementById('btn-add-player')?.click();
    });
    bar.appendChild(button);
  }
  button.hidden=!isCoach()||!isRosterActive();
  return button;
}

function ensureRosterSummary(){
  const view=document.getElementById('view-roster');
  const filter=view?.querySelector('.filter-bar');
  if(!view||!filter)return null;
  let summary=view.querySelector('.roster-context-summary');
  if(!summary){
    summary=document.createElement('div');
    summary.className='roster-context-summary';
    filter.parentNode.insertBefore(summary,filter);
  }
  const count=visiblePlayers().length;
  summary.innerHTML=`<strong>${count} ${count===1?'jugadora':'jugadoras'}</strong><span>Plantilla del equipo</span>`;
  return summary;
}

function csvEscape(value){
  const text=String(value??'').replace(/\r?\n/g,' ').trim();
  return `"${text.replace(/"/g,'""')}"`;
}
function exportRosterCsv(){
  if(!isCoach())return;
  const players=visiblePlayers();
  const rows=[['Nombre','Dorsal','Posición','Fecha de nacimiento']];
  players.forEach(player=>rows.push([
    player.name||'',
    player.number??player.dorsal??'',
    player.position||'',
    player.birthDate||player.birth_date||''
  ]));
  const csv='\ufeff'+rows.map(row=>row.map(csvEscape).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  const season=String(state()?.teamInfo?.season||'2026-2027').replace(/\s+/g,'').replace(/\//g,'-');
  link.href=url;
  link.download=`plantilla-cv-bunyola-${season}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  try{window.showToast?.('Plantilla exportada en CSV.');}catch(_){}
}
window.exportRosterCsv=exportRosterCsv;

function ensureExportFooter(){
  const view=document.getElementById('view-roster');
  const grid=document.getElementById('roster-grid-container');
  if(!view||!grid)return null;
  let footer=view.querySelector('.roster-export-footer');
  if(!footer){
    footer=document.createElement('div');
    footer.className='roster-export-footer';
    footer.innerHTML='<button type="button"><i data-lucide="download"></i><span>Exportar plantilla (.csv)</span></button>';
    footer.querySelector('button')?.addEventListener('click',exportRosterCsv);
    grid.insertAdjacentElement('afterend',footer);
  }
  footer.dataset.coach=isCoach()?'1':'0';
  return footer;
}

function syncContext(){
  const active=isRosterActive();
  document.body.classList.toggle('volley-roster-context',active);
  if(active){
    const title=document.getElementById('volley-mobile-title');
    if(title)title.textContent='Plantilla';
    ensureRosterSummary();
    ensureExportFooter();
  }
  ensureMobileAction();
  const footer=document.querySelector('#view-roster .roster-export-footer');
  if(footer)footer.dataset.coach=isCoach()?'1':'0';
  try{window.lucide?.createIcons?.();}catch(_){}
}

function wrapRosterRender(){
  const original=window.renderRoster;
  if(typeof original!=='function'||original.__contextLayoutWrapped)return false;
  const wrapped=function(){
    const result=original.apply(this,arguments);
    requestAnimationFrame(()=>{ensureRosterSummary();ensureExportFooter();syncContext();});
    return result;
  };
  wrapped.__contextLayoutWrapped=true;
  window.renderRoster=wrapped;
  return true;
}

function install(){
  injectStyles();
  ensureMobileAction();
  ensureRosterSummary();
  ensureExportFooter();
  wrapRosterRender();
  syncContext();

  const wrapper=document.querySelector('.app-portal-wrapper');
  if(wrapper){
    new MutationObserver(records=>{
      if(records.some(record=>record.target?.classList?.contains('page-view')))requestAnimationFrame(syncContext);
    }).observe(wrapper,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  const grid=document.getElementById('roster-grid-container');
  if(grid){
    new MutationObserver(()=>requestAnimationFrame(()=>{ensureRosterSummary();syncContext();})).observe(grid,{childList:true,subtree:false});
  }
  let tries=0;
  const timer=setInterval(()=>{
    wrapRosterRender();
    syncContext();
    tries+=1;
    if(tries>30||typeof window.renderRoster==='function')clearInterval(timer);
  },150);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
