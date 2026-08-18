(function(){
'use strict';

const FLAG='__matchStatisticsFormUx20260818';
if(window[FLAG])return;
window[FLAG]=true;

function ensureStyles(){
  if(document.getElementById('match-statistics-form-ux-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-form-ux-style';
  style.textContent=`
    #modal-edit-match-stats{z-index:100000!important}
    #modal-edit-match-stats .modal-content{max-width:620px!important;max-height:min(92dvh,860px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
    #modal-edit-match-stats .modal-header{flex:0 0 auto!important;padding:1rem 1.15rem!important;border-bottom:1px solid #e2e8f0!important;background:#fff!important;position:relative!important;z-index:5!important}
    #modal-edit-match-stats .modal-header h3{font-family:var(--font-heading)!important;font-size:1.12rem!important;line-height:1.2!important;color:#0f172a!important;min-width:0!important;overflow-wrap:anywhere!important}
    #modal-edit-match-stats .modal-close{width:38px!important;height:38px!important;min-width:38px!important;display:grid!important;place-items:center!important;border-radius:10px!important}
    #modal-edit-match-stats .modal-body{flex:1 1 auto!important;overflow-y:auto!important;padding:1rem 1.15rem 0!important;overscroll-behavior:contain!important}
    #form-match-stats{display:block!important}
    #form-match-stats .stats-entry-intro{display:flex!important;align-items:flex-start!important;gap:.65rem!important;margin:0 0 .85rem!important;padding:.72rem .8rem!important;border:1px solid #dbeafe!important;border-radius:13px!important;background:#f8fbff!important;color:#334155!important}
    #form-match-stats .stats-entry-intro>i{flex:0 0 auto!important;width:18px!important;height:18px!important;color:#0f766e!important;margin-top:.05rem!important}
    #form-match-stats .stats-entry-intro strong{display:block!important;font-size:.84rem!important;color:#0f172a!important;margin-bottom:.12rem!important}
    #form-match-stats .stats-entry-intro span{display:block!important;font-size:.7rem!important;line-height:1.3!important;color:#64748b!important}
    #form-match-stats .stats-form-section-title{display:flex!important;align-items:center!important;gap:.42rem!important;margin:.8rem 0 .45rem!important;padding-top:.7rem!important;border-top:1px solid #eef2f7!important;font-family:var(--font-heading)!important;font-size:.76rem!important;font-weight:800!important;letter-spacing:.02em!important;color:#334155!important;text-transform:uppercase!important}
    #form-match-stats .stats-form-section-title:first-of-type{margin-top:.1rem!important;padding-top:0!important;border-top:0!important}
    #form-match-stats .stats-form-section-title::before{content:'';width:7px;height:7px;border-radius:50%;background:#d97706;flex:0 0 auto}
    #form-match-stats .form-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.6rem!important;margin:0!important}
    #form-match-stats .form-row>.form-group:only-child{grid-column:1/-1!important}
    #form-match-stats .form-group{min-width:0!important;margin:0 0 .58rem!important}
    #form-match-stats .form-group label{display:block!important;margin:0 0 .28rem!important;font-size:.72rem!important;line-height:1.2!important;font-weight:750!important;color:#475569!important}
    #form-match-stats .form-control{width:100%!important;height:50px!important;min-height:50px!important;padding:.55rem .75rem!important;border-radius:11px!important;font-size:16px!important;font-weight:650!important;background:#fff!important}
    #form-match-stats input[type="number"]{font-variant-numeric:tabular-nums!important}
    #form-match-stats .form-help{display:block!important;margin-top:.28rem!important;font-size:.62rem!important;line-height:1.25!important;color:#7c8798!important}
    #form-match-stats .publication-state-control{margin:0 0 .65rem!important;padding:.72rem!important;border:1px solid #e2e8f0!important;border-radius:13px!important;background:#f8fafc!important}
    #form-match-stats .publication-state-control label{font-size:.73rem!important;font-weight:800!important;color:#334155!important}
    #form-match-stats .publication-state-control .form-control{height:48px!important;min-height:48px!important}
    #form-match-stats .publication-state-control .form-help{font-size:.64rem!important;margin-top:.3rem!important}
    #form-match-stats .stats-visibility-fieldset{margin:0 0 .75rem!important;padding:.72rem!important;border:1px solid #e2e8f0!important;border-radius:13px!important;background:#fff!important}
    #form-match-stats .stats-visibility-fieldset legend{padding:0 .3rem!important;font-size:.74rem!important;font-weight:800!important;color:#334155!important}
    #form-match-stats .stats-visibility-fieldset>p{margin:0 0 .55rem!important;font-size:.66rem!important;line-height:1.25!important;color:#64748b!important}
    #form-match-stats .stats-visibility-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.4rem!important}
    #form-match-stats .stats-visibility-grid label{display:flex!important;align-items:center!important;gap:.4rem!important;min-height:42px!important;margin:0!important;padding:.42rem .5rem!important;border:1px solid #e2e8f0!important;border-radius:9px!important;background:#f8fafc!important;font-size:.66rem!important;line-height:1.15!important;font-weight:700!important;color:#475569!important}
    #form-match-stats .stats-visibility-grid label:has(input:checked){border-color:#bbf7d0!important;background:#f0fdf4!important;color:#166534!important}
    #form-match-stats .stats-visibility-grid input{width:16px!important;height:16px!important;flex:0 0 auto!important}
    #form-match-stats .stats-modal-actions{position:sticky!important;bottom:0!important;z-index:6!important;display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)!important;gap:.55rem!important;margin:0 -1.15rem!important;padding:.7rem 1.15rem calc(.7rem + env(safe-area-inset-bottom))!important;border-top:1px solid #e2e8f0!important;background:rgba(255,255,255,.98)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
    #form-match-stats .stats-modal-actions .btn{width:100%!important;min-width:0!important;justify-content:center!important;min-height:44px!important;font-size:.76rem!important;font-weight:800!important}

    @media(max-width:560px){
      #modal-edit-match-stats{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;padding:0!important;align-items:stretch!important;justify-content:stretch!important;background:#f8fafc!important}
      #modal-edit-match-stats .modal-content{width:100%!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}
      #modal-edit-match-stats .modal-header{padding:.78rem .9rem!important;min-height:58px!important;box-shadow:0 1px 0 #e2e8f0!important}
      #modal-edit-match-stats .modal-header h3{font-size:.95rem!important;padding-right:.4rem!important}
      #modal-edit-match-stats .modal-close{width:36px!important;height:36px!important;min-width:36px!important}
      #modal-edit-match-stats .modal-body{padding:.72rem .85rem 0!important;background:#fbfcfe!important}
      #form-match-stats .stats-entry-intro{padding:.62rem .68rem!important;margin-bottom:.65rem!important}
      #form-match-stats .stats-entry-intro strong{font-size:.8rem!important}
      #form-match-stats .stats-entry-intro span{font-size:.65rem!important}
      #form-match-stats .stats-form-section-title{margin:.68rem 0 .4rem!important;padding-top:.6rem!important;font-size:.72rem!important}
      #form-match-stats .form-row{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.5rem!important}
      #form-match-stats .form-group{margin-bottom:.52rem!important}
      #form-match-stats .form-group label{font-size:.68rem!important;min-height:1.65em!important;display:flex!important;align-items:flex-end!important}
      #form-match-stats .form-control{height:48px!important;min-height:48px!important;padding:.5rem .68rem!important}
      #form-match-stats .form-help{font-size:.59rem!important}
      #form-match-stats .stats-visibility-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.36rem!important}
      #form-match-stats .stats-visibility-grid label{min-height:44px!important;padding:.4rem .45rem!important;font-size:.63rem!important}
      #form-match-stats .stats-modal-actions{margin:0 -.85rem!important;padding:.62rem .85rem calc(.62rem + env(safe-area-inset-bottom))!important;grid-template-columns:.78fr 1.22fr!important}
      #form-match-stats .stats-modal-actions .btn{min-height:44px!important;font-size:.72rem!important}
      body:has(#modal-edit-match-stats.active) .mobile-bottom-nav{visibility:hidden!important;pointer-events:none!important}
      body:has(#modal-edit-match-stats.active) #module-header-nav{visibility:hidden!important;pointer-events:none!important}
    }
    @media(max-width:370px){
      #form-match-stats .form-group label{font-size:.64rem!important}
      #form-match-stats .stats-visibility-grid label{font-size:.59rem!important}
    }
  `;
  document.head.appendChild(style);
}

function setLabel(id,text){
  const input=document.getElementById(id);
  const label=input?.closest('.form-group')?.querySelector(`label[for="${id}"]`);
  if(label)label.textContent=text;
}

function addSectionBefore(targetRow,key,text){
  if(!targetRow||!targetRow.parentNode)return;
  const form=targetRow.closest('#form-match-stats');
  if(!form||form.querySelector(`[data-stats-section="${key}"]`))return;
  const heading=document.createElement('div');
  heading.className='stats-form-section-title';
  heading.dataset.statsSection=key;
  heading.textContent=text;
  targetRow.parentNode.insertBefore(heading,targetRow);
}

function movePublicationControls(form,actions){
  const publication=document.getElementById('stats-publication-status')?.closest('.publication-state-control');
  const visibility=document.querySelector('.stats-visibility-fieldset');
  if(!publication||!visibility||!actions)return;
  if(publication.closest('#form-match-stats')!==form)form.insertBefore(publication,actions);
  if(visibility.closest('#form-match-stats')!==form)form.insertBefore(visibility,actions);
}

function polishIntro(form){
  const intro=form.querySelector('.stats-entry-intro');
  const text=intro?.querySelector('span');
  if(text)text.textContent='Registra los indicadores principales. Los errores propios y del rival excluyen recepción y defensa.';
}

function polishForm(){
  const modal=document.getElementById('modal-edit-match-stats');
  const form=document.getElementById('form-match-stats');
  if(!modal||!form)return;
  ensureStyles();

  form.classList.add('stats-form-polished');
  const submit=form.querySelector('button[type="submit"]');
  const actions=submit?.parentElement;
  if(actions)actions.classList.add('stats-modal-actions');

  movePublicationControls(form,actions);
  polishIntro(form);

  const recRow=document.getElementById('stats-rec-error-pct')?.closest('.form-row');
  const attackRow=document.getElementById('stats-attack-efficiency')?.closest('.form-row');
  const serveRow=document.getElementById('stats-aces')?.closest('.form-row');
  const blockRow=document.getElementById('stats-bloqueos')?.closest('.form-row');
  const publication=document.getElementById('stats-publication-status')?.closest('.publication-state-control');

  addSectionBefore(recRow,'reception','Recepción');
  addSectionBefore(attackRow,'attack','Ataque');
  addSectionBefore(serveRow,'serve','Saque');
  addSectionBefore(blockRow,'errors','Bloqueo y errores');
  addSectionBefore(publication,'publication','Publicación');

  setLabel('stats-rec-error-pct','% error recepción');
  setLabel('stats-rec-perfect-pct','% recepción perfecta');
  setLabel('stats-attack-efficiency','% efectividad ataque');
  setLabel('stats-attack-errors','Errores de ataque');
  setLabel('stats-aces','Aces');
  setLabel('stats-serve-errors','Errores de saque');
  setLabel('stats-bloqueos','Bloqueos punto');
  setLabel('stats-own-errors','Errores propios');
  setLabel('stats-opponent-errors','Errores del rival');

  ['stats-rec-error-pct','stats-rec-perfect-pct','stats-attack-efficiency'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.inputMode='decimal';
  });
  ['stats-attack-errors','stats-aces','stats-serve-errors','stats-bloqueos','stats-own-errors','stats-opponent-errors'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.inputMode='numeric';
  });
}

function install(){
  const run=()=>{
    polishForm();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      polishForm();
      if(document.getElementById('stats-publication-status')?.closest('#form-match-stats')||tries>40)clearInterval(timer);
    },100);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
}

install();
})();
