(function(){
'use strict';
if(window.__gamePlanCourtVisualUnify20260814)return;
window.__gamePlanCourtVisualUnify20260814=true;

const style=document.createElement('style');
style.id='game-plan-court-visual-unify-20260814-css';
style.textContent=`
@media(max-width:720px){
  /* Misma pista base para Saque rival y Nuestro saque */
  #view-tactics .serve-touch-court,
  #view-tactics .our-serve-court{
    position:relative!important;
    padding-top:26px!important;
    border:2px solid #475569!important;
    border-radius:11px!important;
    overflow:hidden!important;
    background:#d7ad70!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)!important;
  }

  #view-tactics .serve-touch-net,
  #view-tactics .our-serve-net{
    position:absolute!important;
    left:0!important;
    right:0!important;
    top:0!important;
    height:26px!important;
    display:grid!important;
    place-items:center!important;
    background:#0f172a!important;
    color:#f8fafc!important;
    border-bottom:2px solid rgba(255,255,255,.9)!important;
    z-index:2!important;
  }

  #view-tactics .serve-touch-net span,
  #view-tactics .our-serve-net span{
    transform:none!important;
    padding:0!important;
    background:transparent!important;
    color:#f8fafc!important;
    font-size:.55rem!important;
    font-weight:900!important;
    letter-spacing:.12em!important;
  }

  #view-tactics .serve-touch-grid,
  #view-tactics .our-serve-grid{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    grid-template-rows:repeat(3,70px)!important;
  }

  #view-tactics .serve-touch-zone,
  #view-tactics .our-serve-grid button{
    position:relative!important;
    margin:0!important;
    padding:.25rem!important;
    border:0!important;
    border-right:1px solid rgba(255,255,255,.9)!important;
    border-bottom:1px solid rgba(255,255,255,.9)!important;
    border-radius:0!important;
    background:rgba(255,255,255,.05)!important;
    color:#1f2937!important;
    display:grid!important;
    place-items:center!important;
    align-content:center!important;
    gap:.15rem!important;
    cursor:pointer!important;
    -webkit-tap-highlight-color:transparent;
  }

  #view-tactics .serve-touch-zone:nth-child(3n),
  #view-tactics .our-serve-grid button:nth-child(3n){border-right:0!important}
  #view-tactics .serve-touch-zone:nth-last-child(-n+3),
  #view-tactics .our-serve-grid button:nth-last-child(-n+3){border-bottom:0!important}

  #view-tactics .serve-touch-zone b,
  #view-tactics .our-serve-grid button b{
    font-size:.9rem!important;
    line-height:1!important;
    font-weight:900!important;
    text-shadow:none!important;
  }
  #view-tactics .serve-touch-zone span,
  #view-tactics .our-serve-grid button span{
    font-size:.55rem!important;
    line-height:1.05!important;
    font-weight:850!important;
    opacity:.78!important;
  }

  /* Mismo lenguaje de intensidad */
  #view-tactics .serve-touch-zone.is-frequent,
  #view-tactics .our-serve-grid button.is-secondary{
    background:rgba(59,130,246,.34)!important;
    color:#1e3a8a!important;
    box-shadow:inset 0 0 0 2px rgba(147,197,253,.72)!important;
  }
  #view-tactics .serve-touch-zone.is-primary,
  #view-tactics .our-serve-grid button.is-primary{
    background:rgba(220,38,38,.46)!important;
    color:#7f1d1d!important;
    box-shadow:inset 0 0 0 2px rgba(254,202,202,.9)!important;
  }
  #view-tactics .serve-touch-zone.is-primary:after,
  #view-tactics .our-serve-grid button.is-primary:after{
    content:'★'!important;
    position:absolute!important;
    top:.28rem!important;
    right:.35rem!important;
    color:#fef08a!important;
    font-size:.72rem!important;
    line-height:1!important;
    text-shadow:0 1px 2px rgba(0,0,0,.2)!important;
  }
  #view-tactics .our-serve-grid button.is-primary b:before{content:none!important}
}
`;
document.head.appendChild(style);
})();
