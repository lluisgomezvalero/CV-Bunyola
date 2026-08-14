(function(){
'use strict';
if(window.__gamePlanMobileOverflowFix20260814)return;
window.__gamePlanMobileOverflowFix20260814=true;
const style=document.createElement('style');
style.id='game-plan-mobile-overflow-fix-20260814-css';
style.textContent=`
@media(max-width:720px){
  #view-tactics,
  #view-tactics.game-plan-ux,
  #view-tactics.game-plan-ux > .card,
  #view-tactics #scouting-plan-content,
  #view-tactics #scouting-interactive-root,
  #view-tactics .scout-section,
  #view-tactics .player-plan-heading,
  #view-tactics .player-plan-summary,
  #view-tactics .game-plan-player-nav,
  #view-tactics .attack-module-section,
  #view-tactics .attack-cards-grid{
    width:100%;
    max-width:100%;
    min-width:0;
    box-sizing:border-box;
  }

  #view-tactics.game-plan-ux,
  #view-tactics.game-plan-ux > .card,
  #view-tactics #scouting-plan-content,
  #view-tactics #scouting-interactive-root{
    overflow-x:hidden!important;
  }

  #view-tactics .scouting-header,
  #view-tactics .scouting-header > *,
  #view-tactics .game-plan-match-field,
  #view-tactics #scouting-match-select{
    min-width:0!important;
    max-width:100%!important;
  }

  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-cards-grid,
  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-cards-grid.two-cards{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    overscroll-behavior-x:contain;
    -webkit-overflow-scrolling:touch;
    padding-right:0!important;
  }

  #view-tactics.game-plan-ux .attack-module-section.player-clean-court .attack-scout-card{
    flex:0 0 calc(100% - .75rem)!important;
    width:calc(100% - .75rem)!important;
    max-width:calc(100% - .75rem)!important;
    min-width:0!important;
    box-sizing:border-box!important;
  }

  #view-tactics .attack-scout-card,
  #view-tactics .attack-scout-card-head,
  #view-tactics .attack-card-court,
  #view-tactics .serve-heat-grid,
  #view-tactics .serve-player-target,
  #view-tactics .plan-read-tracker,
  #view-tactics .plan-read-list,
  #view-tactics .plan-read-item{
    max-width:100%;
    min-width:0;
    box-sizing:border-box;
  }

  #view-tactics .player-plan-summary li,
  #view-tactics .player-plan-heading,
  #view-tactics .scout-section-head > div{
    min-width:0;
    overflow-wrap:anywhere;
  }
}
`;
document.head.appendChild(style);
})();
