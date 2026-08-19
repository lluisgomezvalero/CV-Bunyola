(function(){
'use strict';

const FLAG='__matchStatisticsPlayerPolish20260819';
if(window[FLAG])return;
window[FLAG]=true;

const ICONS={
  'Recepción perfecta (#,+)':'circle-check',
  'Recepción exclamativa (!)':'triangle-alert',
  'Error de recepción (-)':'circle-x',
  'Total de recepciones':'hash',
  'Efectividad de ataque':'trending-up',
  'Total de ataques':'hash',
  'Errores de ataque':'circle-x',
  'Aces':'zap',
  'Error de saque':'circle-x',
  'Total de saques':'hash',
  'Bloqueos punto':'shield-check',
  'Total de bloqueos':'hash',
  'Errores propios':'circle-x',
  'Errores del rival':'circle-check'
};

function ensureStyles(){
  if(document.getElementById('match-statistics-player-polish-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-player-polish-style';
  style.textContent=`
    #modal-player-match-stats .player-stats-hero{
      position:relative;
      overflow:hidden;
      border-color:#e2e8f0!important;
      background:linear-gradient(135deg,#fff 0%,#f8fafc 100%)!important;
      box-shadow:0 8px 24px rgba(15,23,42,.05);
    }
    #modal-player-match-stats .player-stats-hero::before{
      content:'';
      position:absolute;
      inset:0 auto 0 0;
      width:4px;
      background:#d97706;
    }
    #modal-player-match-stats .player-stats-hero span{color:#475569!important}
    #modal-player-match-stats .player-stats-hero strong{
      padding:.32rem .55rem;
      border:1px solid #e2e8f0;
      border-radius:10px;
      background:#fff;
      font-size:1.05rem!important;
      font-variant-numeric:tabular-nums;
      box-shadow:0 2px 8px rgba(15,23,42,.04);
    }

    #modal-player-match-stats .player-stat-section{margin-top:1rem!important}
    #modal-player-match-stats .player-stat-section h4{
      margin-bottom:.5rem!important;
      font-size:.73rem!important;
      letter-spacing:.055em!important;
      color:#475569!important;
    }
    #modal-player-match-stats .player-stat-section h4::before{display:none!important}

    #modal-player-match-stats .player-stat-metric{
      position:relative;
      min-height:66px;
      border-color:#e2e8f0!important;
      box-shadow:0 2px 8px rgba(15,23,42,.025);
      transition:none!important;
    }
    #modal-player-match-stats .player-stat-metric .metric-icon{
      color:#475569;
      background:#f1f5f9!important;
    }
    #modal-player-match-stats .player-stat-metric .metric-icon svg{
      width:16px;
      height:16px;
      stroke-width:2.1;
    }
    #modal-player-match-stats .player-stat-metric strong{
      font-size:1rem!important;
      font-weight:850!important;
      letter-spacing:-.015em;
    }
    #modal-player-match-stats .player-stat-metric small{font-weight:650}

    #modal-player-match-stats .player-stat-metric.is-positive{
      border-color:#d1fae5!important;
      background:#fcfffd!important;
    }
    #modal-player-match-stats .player-stat-metric.is-positive .metric-icon{
      color:#047857!important;
      background:#ecfdf5!important;
    }
    #modal-player-match-stats .player-stat-metric.is-negative{
      border-color:#fee2e2!important;
      background:#fffdfd!important;
    }
    #modal-player-match-stats .player-stat-metric.is-negative .metric-icon{
      color:#b91c1c!important;
      background:#fef2f2!important;
    }
    #modal-player-match-stats .player-stat-metric.is-warning{
      border-color:#fde68a!important;
      background:#fffefa!important;
    }
    #modal-player-match-stats .player-stat-metric.is-warning .metric-icon{
      color:#b45309!important;
      background:#fffbeb!important;
    }
    #modal-player-match-stats .player-stat-metric.is-volume{
      min-height:58px;
      background:#f8fafc!important;
      border-style:dashed!important;
      box-shadow:none!important;
    }
    #modal-player-match-stats .player-stat-metric.is-volume strong{
      font-size:.88rem!important;
      color:#475569!important;
    }
    #modal-player-match-stats .player-stat-metric.is-volume small{color:#64748b!important}

    @media(max-width:560px){
      #modal-player-match-stats .player-stats-hero{margin-bottom:.7rem!important}
      #modal-player-match-stats .player-stat-section{margin-top:.82rem!important}
      #modal-player-match-stats .player-stat-group-grid{gap:.42rem!important}
      #modal-player-match-stats .player-stat-metric{min-height:62px!important;padding:.58rem!important}
      #modal-player-match-stats .player-stat-metric.is-volume{min-height:54px!important}
      #modal-player-match-stats .player-stat-metric strong{font-size:.94rem!important}
    }
  `;
  document.head.appendChild(style);
}

function classify(label){
  const text=String(label||'').toLowerCase();
  if(text.startsWith('total de '))return'is-volume';
  if(text.includes('exclamativa'))return'is-warning';
  if(text.includes('error')||text.includes('errores propios'))return'is-negative';
  if(text.includes('perfecta')||text.includes('efectividad')||text==='aces'||text.includes('bloqueos punto')||text.includes('errores del rival'))return'is-positive';
  return'';
}

function polish(){
  const body=document.getElementById('player-match-stats-body');
  if(!body)return;

  body.querySelectorAll('.player-stat-metric').forEach(card=>{
    const label=card.querySelector('small')?.textContent?.trim()||'';
    card.classList.remove('is-positive','is-negative','is-warning','is-volume');
    const type=classify(label);if(type)card.classList.add(type);

    const icon=card.querySelector('.metric-icon');
    if(icon){
      icon.innerHTML=`<i data-lucide="${ICONS[label]||'activity'}"></i>`;
    }
  });

  const hero=body.querySelector('.player-stats-hero');
  const heroLabel=hero?.querySelector('span');
  if(heroLabel)heroLabel.textContent='Resultado final';

  try{window.lucide?.createIcons();}catch(_){}
}

function install(){
  ensureStyles();
  const base=window.enhancePlayerMatchStatsModal;
  if(typeof base==='function'&&!base.__playerPolishWrapped){
    const wrapped=function(matchId,stats){
      const result=base.apply(this,arguments);
      polish();
      return result;
    };
    wrapped.__playerPolishWrapped=true;
    window.enhancePlayerMatchStatsModal=wrapped;
  }

  const body=document.getElementById('player-match-stats-body');
  if(body)new MutationObserver(()=>window.setTimeout(polish,0)).observe(body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
