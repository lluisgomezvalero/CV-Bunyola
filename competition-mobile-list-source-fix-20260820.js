(function(){
'use strict';

const FLAG='__competitionMobileListSourceFix20260820';
if(window[FLAG])return;
window[FLAG]=true;

let observer=null;
let frame=0;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}

function rankedTeams(){
  const teams=[...(state()?.leagueTable||[])];
  teams.sort((a,b)=>{
    const points=num(b?.points)-num(a?.points);
    if(points)return points;
    const diffB=num(b?.sf)-num(b?.sc);
    const diffA=num(a?.sf)-num(a?.sc);
    return diffB-diffA;
  });
  return teams.map((team,index)=>({
    id:String(team?.id||''),
    index:index+1,
    own:Boolean(team?.isOwn)||/CV\s*BUNYOLA/i.test(String(team?.name||'')),
    teamName:String(team?.isOwn?'CV Bunyola':team?.name||`Equipo ${index+1}`),
    logo:String(team?.logo||'assets/default_avatar.svg'),
    points:num(team?.points),pj:num(team?.pj),pg:num(team?.pg),pp:num(team?.pp),sf:num(team?.sf),sc:num(team?.sc)
  }));
}

function updateSummary(view,rows){
  const box=view.querySelector('.competition-app-summary');
  const own=rows.find(item=>item.own);
  if(!box||!own)return;
  const metrics=box.querySelectorAll('.competition-summary-metric');
  const mainLogo=box.querySelector('.competition-summary-logo');
  const mainName=box.querySelector('.competition-summary-copy strong');
  if(mainLogo)mainLogo.src=own.logo;
  if(mainName)mainName.textContent=own.teamName;
  if(metrics[0]){
    const strong=metrics[0].querySelector('strong');
    const span=metrics[0].querySelector('span');
    if(strong)strong.textContent=own.pj>0?`${own.index}º`:'—';
    if(span)span.textContent=own.pj>0?`de ${rows.length} equipos`:'Sin jornadas';
  }
  if(metrics[1]){
    const strong=metrics[1].querySelector('strong');
    const span=metrics[1].querySelector('span');
    if(strong)strong.textContent=String(own.points);
    if(span)span.textContent=`${own.pj} PJ`;
  }
  if(metrics[2]){
    const strong=metrics[2].querySelector('strong');
    const span=metrics[2].querySelector('span');
    if(strong)strong.textContent=`${own.pg}–${own.pp}`;
    if(span)span.textContent=`${own.sf}–${own.sc} sets`;
  }
}

function rebuild(){
  frame=0;
  const view=document.getElementById('view-competition');
  const list=view?.querySelector('.competition-mobile-list');
  const rows=rankedTeams();
  if(!view||!list||!rows.length)return;
  updateSummary(view,rows);
  list.innerHTML='';
  rows.forEach(item=>{
    const card=document.createElement('article');
    card.className=`competition-mobile-row${item.own?' is-own':''}`;
    card.dataset.teamId=item.id;
    card.innerHTML=`
      <div class="competition-mobile-rank">${item.index}</div>
      <div class="competition-mobile-team"><img src="${esc(item.logo)}" alt=""><strong>${esc(item.teamName)}</strong></div>
      <div class="competition-mobile-points"><strong>${item.points}</strong><small>pts</small></div>
      <div class="competition-mobile-meta">
        <span class="competition-mobile-chip">PJ <b>${item.pj}</b></span>
        <span class="competition-mobile-chip">PG <b>${item.pg}</b></span>
        <span class="competition-mobile-chip">PP <b>${item.pp}</b></span>
        <span class="competition-mobile-chip">SF <b>${item.sf}</b></span>
        <span class="competition-mobile-chip">SC <b>${item.sc}</b></span>
      </div>`;
    const meta=card.querySelector('.competition-mobile-meta');
    if(item.own){
      const automatic=document.createElement('span');
      automatic.className='competition-mobile-edit';
      automatic.textContent='Automático';
      meta?.appendChild(automatic);
    }else if(isCoach()&&item.id){
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='competition-mobile-edit';
      edit.textContent='Editar';
      edit.addEventListener('click',()=>{try{openEditTeamModal(item.id);}catch(_){}});
      meta?.appendChild(edit);
    }
    list.appendChild(card);
  });
}

function schedule(){
  if(frame)return;
  frame=requestAnimationFrame(()=>requestAnimationFrame(rebuild));
}

function observe(){
  const tbody=document.getElementById('league-table-tbody');
  if(!tbody||observer)return;
  observer=new MutationObserver(schedule);
  observer.observe(tbody,{childList:true,subtree:true,characterData:true});
}

function install(){observe();schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
