(function(){
'use strict';

const FLAG='__rosterCardPriority20260813';
let installed=false;

function injectStyles(){
  if(document.getElementById('roster-card-priority-20260813-css'))return;
  const style=document.createElement('style');
  style.id='roster-card-priority-20260813-css';
  style.textContent=`
    #view-roster .trading-card-meta .roster-position-pill{
      display:inline-flex;
      align-items:center;
      min-width:0;
      max-width:68%;
      padding:.28rem .55rem;
      border-radius:999px;
      background:#f1f5f9;
      color:#334155;
      font-size:.72rem;
      line-height:1.15;
      font-weight:800;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    #view-roster .trading-card-meta .roster-position-pill[data-empty="1"]{
      color:#94a3b8;
      font-weight:700;
    }
    @media(max-width:520px){
      #view-roster .trading-card-meta .roster-position-pill{max-width:64%;font-size:.69rem;padding:.26rem .48rem}
    }
  `;
  document.head.appendChild(style);
}

function playerForCard(card){
  const name=card?.querySelector('.trading-card-name')?.textContent?.trim();
  if(!name)return null;
  try{return (appState?.players||[]).find(p=>String(p?.name||'').trim()===name)||null;}catch(_){return null;}
}

function enhanceCards(){
  const view=document.getElementById('view-roster');
  if(!view)return;
  view.querySelectorAll('.player-trading-card').forEach(card=>{
    const player=playerForCard(card);
    const metaStrong=card.querySelector('.trading-card-meta strong');
    if(!metaStrong||!player)return;
    const position=String(player.position||'').trim();
    metaStrong.textContent=position||'Posición sin asignar';
    metaStrong.classList.add('roster-position-pill');
    metaStrong.dataset.empty=position?'0':'1';
    metaStrong.title=position||'Posición sin asignar';
  });
}

function install(){
  if(installed||window[FLAG])return;
  if(typeof window.renderRoster!=='function'){
    setTimeout(install,120);
    return;
  }
  installed=true;
  window[FLAG]=true;
  injectStyles();

  const original=window.renderRoster;
  window.renderRoster=function(...args){
    const result=original.apply(this,args);
    requestAnimationFrame(enhanceCards);
    return result;
  };

  const view=document.getElementById('view-roster');
  if(view){
    new MutationObserver(()=>requestAnimationFrame(enhanceCards)).observe(view,{childList:true,subtree:true});
  }
  requestAnimationFrame(enhanceCards);
  console.info('[RosterCards] Position-first roster cards active.');
}

setTimeout(install,0);
})();
