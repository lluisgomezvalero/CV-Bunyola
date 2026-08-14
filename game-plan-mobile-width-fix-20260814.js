(function(){
'use strict';

const FLAG='__gamePlanMobileWidthFix20260814';
if(window[FLAG])return;
window[FLAG]=true;

const style=document.createElement('style');
style.id='game-plan-mobile-width-fix-20260814-css';
style.textContent=`
@media(max-width:720px){
  /* Aprovecha mejor el ancho disponible del shell móvil sin tocar el resto de módulos. */
  #view-tactics.coach-board-mode.coach-top-compact{
    width:calc(100% + .7rem)!important;
    max-width:calc(100% + .7rem)!important;
    margin-left:-.35rem!important;
    margin-right:-.35rem!important;
    box-sizing:border-box!important;
  }

  #view-tactics.coach-board-mode.coach-top-compact>.card,
  #view-tactics.coach-board-mode.coach-top-compact .tactics-card,
  #view-tactics.coach-board-mode.coach-top-compact .game-plan-card{
    width:100%!important;
    max-width:100%!important;
    padding-left:.45rem!important;
    padding-right:.45rem!important;
    box-sizing:border-box!important;
  }

  #view-tactics.coach-board-mode.coach-top-compact #scouting-interactive-root.coach-board-root.coach-top-compact-root{
    width:100%!important;
    max-width:100%!important;
    padding:.35rem!important;
    box-sizing:border-box!important;
  }

  #view-tactics.coach-board-mode.coach-top-compact .scout-section{
    width:100%!important;
    max-width:100%!important;
    padding:.62rem!important;
    box-sizing:border-box!important;
  }

  #view-tactics.coach-board-mode.coach-top-compact .attack-scout-card{
    width:100%!important;
    max-width:100%!important;
    padding:.6rem!important;
    box-sizing:border-box!important;
  }

  /*
   * La protección de overflow antigua imponía max-width:100% a la cabecera.
   * Como la cabecera usa márgenes negativos para cubrir el padding, ese límite
   * hacía que alcanzara el borde izquierdo pero se cortara antes del derecho.
   */
  #view-tactics.coach-board-mode.coach-top-compact .attack-scout-card-head{
    width:calc(100% + 1.2rem)!important;
    max-width:none!important;
    min-width:calc(100% + 1.2rem)!important;
    margin:-.6rem -.6rem .6rem!important;
    box-sizing:border-box!important;
    align-self:stretch!important;
  }

  #view-tactics.coach-board-mode.coach-top-compact .attack-direction-options{
    padding:.48rem!important;
  }

  #view-tactics.coach-board-mode.coach-top-compact .coach-compact-publish-bar,
  #view-tactics.coach-board-mode.coach-top-compact .coach-compact-read-tracker{
    width:100%!important;
    max-width:100%!important;
    box-sizing:border-box!important;
  }
}
`;
document.head.appendChild(style);
})();
