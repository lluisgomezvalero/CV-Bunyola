(function(){
'use strict';

const FLAG='__gamePlanOpponentHeroFix20260814';
if(window[FLAG])return;
window[FLAG]=true;

function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function activeEvent(){
  try{
    const id=typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;
    const s=state();
    if(!id||!s)return null;
    return (s.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id]
      .filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
  }catch(_){return null;}
}
function normalize(value){
  return String(value||'').trim().toLocaleLowerCase('es')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ');
}
function opponentName(evt){
  const candidates=[
    evt?.opponent,
    evt?.rawPayload?.opponent,
    evt?.payload?.opponent,
    evt?.matchOpponent,
    evt?.opponentName
  ];
  for(const value of candidates){
    const text=String(value||'').trim();
    if(text&&normalize(text)!=='rival')return text;
  }
  return '';
}
function leagueTeam(name){
  const s=state();
  const target=normalize(name);
  if(!target)return null;
  return (s?.leagueTable||[]).find(team=>normalize(team?.name)===target)||null;
}
function ownTeam(){
  const s=state();
  const ownRow=(s?.leagueTable||[]).find(team=>team?.isOwn)||null;
  return {
    name:s?.teamInfo?.name||ownRow?.name||'CV BUNYOLA',
    logo:s?.teamInfo?.customLogo||ownRow?.logo||'assets/club_logo.png'
  };
}
function homeStatus(evt){
  try{
    if(typeof window.getMatchLogosData==='function'){
      const data=window.getMatchLogosData(evt);
      if(data&&typeof data.isHome==='boolean')return data.isHome;
    }
  }catch(_){}
  const explicit=String(evt?.condition||evt?.matchCondition||evt?.rawPayload?.condition||evt?.rawPayload?.matchCondition||'').toLowerCase();
  if(/visit|fuera|away/.test(explicit))return false;
  if(/local|casa|home/.test(explicit))return true;
  return String(evt?.location||'').toLowerCase().includes('bunyola');
}
function setTeam(el,team,condition){
  if(!el)return;
  const img=el.querySelector('img');
  const strong=el.querySelector('strong');
  const small=el.querySelector('small');
  if(img){
    img.src=team.logo||'assets/default_avatar.svg';
    img.alt=`Escudo de ${team.name||'Equipo'}`;
    img.onerror=function(){this.onerror=null;this.src='assets/default_avatar.svg';};
  }
  if(strong)strong.textContent=team.name||'Equipo';
  if(small)small.textContent=condition;
}
function syncHero(){
  const root=document.getElementById('scouting-interactive-root');
  const hero=root?.querySelector('.game-plan-match-hero');
  const evt=activeEvent();
  if(!root||!hero||!evt)return;

  const rivalName=opponentName(evt);
  if(!rivalName)return;

  const row=leagueTeam(rivalName);
  const rival={
    name:row?.name||rivalName,
    logo:row?.logo||'assets/default_avatar.svg'
  };
  const own=ownTeam();
  const isHome=homeStatus(evt);
  const teams=[...hero.querySelectorAll('.game-plan-team')];
  if(teams.length<2)return;

  if(isHome){
    setTeam(teams[0],own,'Local');
    setTeam(teams[1],rival,'Visitante');
  }else{
    setTeam(teams[0],rival,'Local');
    setTeam(teams[1],own,'Visitante');
  }
}
function decorate(){requestAnimationFrame(syncHero);}
function wrapRender(){
  if(typeof window.renderTactics!=='function')return false;
  if(window.renderTactics.__opponentHeroFix20260814)return true;
  const base=window.renderTactics;
  const wrapped=function(){
    const out=base.apply(this,arguments);
    decorate();
    return out;
  };
  wrapped.__opponentHeroFix20260814=true;
  window.renderTactics=wrapped;
  try{renderTactics=wrapped;}catch(_){}
  return true;
}
function install(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(wrapRender()){
      clearInterval(timer);
      decorate();
      const select=document.getElementById('scouting-match-select');
      if(select&&!select.dataset.opponentHeroFix){
        select.dataset.opponentHeroFix='1';
        select.addEventListener('change',()=>setTimeout(syncHero,0));
      }
      const root=document.getElementById('scouting-interactive-root');
      if(root){
        let queued=false;
        new MutationObserver(()=>{
          if(queued)return;
          queued=true;
          requestAnimationFrame(()=>{queued=false;syncHero();});
        }).observe(root,{childList:true,subtree:true});
      }
    }else if(tries>120)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
