(function(){
'use strict';
const FLAG='__rosterMobileAppUx20260820';
if(window[FLAG])return;
window[FLAG]=true;

function ensureStyles(){
  if(document.getElementById('roster-mobile-app-ux-20260820-style'))return;
  const style=document.createElement('style');
  style.id='roster-mobile-app-ux-20260820-style';
  style.textContent=`
    @media(max-width:760px), (max-width:1366px) and (any-pointer:coarse){
      body.volley-roster-context #view-roster{padding-left:0!important;padding-right:0!important}
      body.volley-roster-context #view-roster .roster-context-summary{
        margin:.05rem .12rem .55rem!important;
        padding:0!important;
      }
      body.volley-roster-context #view-roster .roster-context-summary strong{
        font-family:var(--font-heading)!important;
        font-size:.78rem!important;
        color:#263247!important;
      }
      body.volley-roster-context #view-roster .filter-bar{
        display:flex!important;
        flex-wrap:nowrap!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        width:100%!important;
        gap:.32rem!important;
        margin:0 0 .7rem!important;
        padding:.05rem .05rem .16rem!important;
        scrollbar-width:none!important;
        -webkit-overflow-scrolling:touch!important;
      }
      body.volley-roster-context #view-roster .filter-bar::-webkit-scrollbar{display:none!important}
      body.volley-roster-context #view-roster .filter-bar .filter-btn{
        flex:0 0 auto!important;
        min-height:31px!important;
        padding:.35rem .62rem!important;
        border:1px solid #e3e8ee!important;
        border-radius:999px!important;
        background:rgba(255,255,255,.92)!important;
        color:#6b7787!important;
        box-shadow:none!important;
        font-size:.65rem!important;
        font-weight:800!important;
        white-space:nowrap!important;
      }
      body.volley-roster-context #view-roster .filter-bar .filter-btn.active{
        background:#fff7e8!important;
        border-color:#ead2a7!important;
        color:#9b6915!important;
      }
      body.volley-roster-context #roster-grid-container{
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:.62rem!important;
      }
      body.volley-roster-context .player-card.player-trading-card{
        border:1px solid #e4e9ef!important;
        border-radius:15px!important;
        background:#fff!important;
        box-shadow:0 4px 14px rgba(15,23,42,.035)!important;
        overflow:hidden!important;
        transform:none!important;
      }
      body.volley-roster-context .player-card.player-trading-card:active{transform:scale(.985)!important}
      body.volley-roster-context .player-card.player-trading-card .trading-card-photo-wrap{
        display:block!important;
        aspect-ratio:4/4.65!important;
        background:#eef2f5!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-photo{
        width:100%!important;
        height:100%!important;
        object-fit:cover!important;
        object-position:center top!important;
      }
      body.volley-roster-context .player-card.player-trading-card.roster-card-placeholder .trading-card-photo-wrap{
        background:#f6f8fa!important;
      }
      body.volley-roster-context .player-card.player-trading-card.roster-card-placeholder .trading-card-photo{
        object-fit:contain!important;
        object-position:center!important;
        padding:17%!important;
        background:#f8fafc!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-photo-wrap::after{
        height:26%!important;
        background:linear-gradient(to top,rgba(15,23,42,.3),transparent)!important;
      }
      body.volley-roster-context .player-card.player-trading-card.roster-card-placeholder .trading-card-photo-wrap::after{
        background:linear-gradient(to top,rgba(15,23,42,.14),transparent)!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-number{
        left:.48rem!important;
        bottom:.46rem!important;
        min-width:0!important;
        padding:.25rem .47rem!important;
        border-radius:8px!important;
        background:rgba(255,255,255,.94)!important;
        color:#253044!important;
        border:1px solid rgba(255,255,255,.8)!important;
        box-shadow:0 2px 8px rgba(15,23,42,.12)!important;
        font-size:.78rem!important;
        font-weight:900!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-info{
        min-height:82px!important;
        padding:.58rem .54rem .64rem!important;
        background:#fff!important;
        text-align:left!important;
      }
      body.volley-roster-context .player-card.player-trading-card.roster-card-no-date .trading-card-info{
        min-height:68px!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-name{
        margin:0!important;
        min-height:0!important;
        color:#1f2a3b!important;
        font-family:var(--font-heading)!important;
        font-size:.82rem!important;
        font-weight:850!important;
        line-height:1.08!important;
        text-align:left!important;
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-meta{
        align-items:flex-start!important;
        gap:.18rem!important;
        margin-top:.34rem!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-meta .roster-position-pill{
        display:inline-flex!important;
        align-items:center!important;
        max-width:100%!important;
        padding:.21rem .4rem!important;
        border-radius:6px!important;
        background:#f3f6f8!important;
        color:#687586!important;
        font-size:.58rem!important;
        line-height:1!important;
        font-weight:800!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }
      body.volley-roster-context .player-card.player-trading-card .trading-card-meta span{
        color:#9aa4b1!important;
        font-size:.56rem!important;
      }
      body.volley-roster-context .player-card.player-trading-card .roster-pending-date{display:none!important}
      body.volley-roster-context .trading-card-coach-actions{display:none!important}
      body.volley-roster-context .roster-mobile-add{
        width:38px!important;
        height:38px!important;
        border:1px solid #eadfca!important;
        border-radius:50%!important;
        background:#fffaf0!important;
        color:#a76d13!important;
      }
      body.volley-roster-context .roster-mobile-add svg{width:17px!important;height:17px!important}
    }
    @media(max-width:360px){
      body.volley-roster-context #roster-grid-container{gap:.48rem!important}
      body.volley-roster-context .player-card.player-trading-card .trading-card-info{padding:.5rem .46rem .56rem!important}
      body.volley-roster-context .player-card.player-trading-card .trading-card-name{font-size:.76rem!important}
    }
  `;
  document.head.appendChild(style);
}

function polishCards(){
  const grid=document.getElementById('roster-grid-container');
  if(!grid)return;
  grid.querySelectorAll('.player-card.player-trading-card').forEach(card=>{
    const img=card.querySelector('.trading-card-photo');
    const src=String(img?.getAttribute('src')||'').toLowerCase();
    const placeholder=src.includes('club_logo.png')||src.includes('default_avatar.svg');
    card.classList.toggle('roster-card-placeholder',placeholder);

    let hasPending=false;
    card.querySelectorAll('.trading-card-meta span,.trading-card-meta small,.trading-card-meta div').forEach(node=>{
      if(String(node.textContent||'').toLowerCase().includes('fecha pendiente')){
        node.classList.add('roster-pending-date');
        hasPending=true;
      }
    });
    card.classList.toggle('roster-card-no-date',hasPending);
  });
}

function install(){
  ensureStyles();
  requestAnimationFrame(polishCards);
  const grid=document.getElementById('roster-grid-container');
  if(grid)new MutationObserver(()=>requestAnimationFrame(polishCards)).observe(grid,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
