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
    #modal-edit-match-stats .modal-content{max-width:620px!important;max-height:min(92dvh,860px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
    #modal-edit-match-stats .modal-header{flex:0 0 auto!important;padding:1rem 1.15rem!important;border-bottom:1px solid #e2e8f0!important;background:#fff!important}
    #modal-edit-match-stats .modal-header h3{font-family:var(--font-heading)!important;font-size:1.12rem!important;line-height:1.2!important;color:#0f172a!important;min-width:0!important;overflow-wrap:anywhere!important}
    #modal-edit-match-stats .modal-close{width:38px!important;height:38px!important;min-width:38px!important;display:grid!important;place-items:center!important;border-radius:10px!important}
    #modal-edit-match-stats .modal-body{flex:1 1 auto!important;overflow-y:auto!important;padding:1rem 1.15rem 0!important;overscroll-behavior:contain!important}
    #form-match-stats{display:block!important}
    #form-match-stats .stats-entry-intro{display:flex!important;align-items:flex-start!important;gap:.7rem!important;margin:0 0 1rem!important;padding:.85rem .9rem!important;border:1px solid #dbeafe!important;border-radius:14px!important;background:#f8fbff!important;color:#334155!important}
    #form-match-stats .stats-entry-intro>i{flex:0 0 auto!important;width:20px!important;height:20px!important;color:#2563eb!important;margin-top:.05rem!important}
    #form-match-stats .stats-entry-intro strong{display:block!important;font-size:.88rem!important;color:#0f172a!important;margin-bottom:.16rem!important}
    #form-match-stats .stats-entry-intro span{display:block!important;font-size:.74rem!important;line-height:1.35!important;color:#64748b!important}
    #form-match-stats .stats-form-section-title{display:flex!important;align-items:center!important;gap:.45rem!important;margin:1rem 0 .55rem!important;padding-top:.85rem!important;border-top:1px solid #eef2f7!important;font-family:var(--font-heading)!important;font-size:.82rem!important;font-weight:800!important;letter-spacing:.02em!important;color:#334155!important;text-transform:uppercase!important}
    #form-match-stats .stats-form-section-title:first-of-type{margin-top:.2rem!important;padding-top:0!important;border-top:0!important}
    #form-match-stats .stats-form-section-title::before{content:'';width:7px;height:7px;border-radius:50%;background:#d97706;flex:0 0 auto}
    #form-match-stats .form-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.75rem!important;margin:0!important}
    #form-match-stats .form-group{min-width:0!important;margin:0 0 .75rem!important}
    #form-match-stats .form-group label{display:block!important;margin:0 0 .35rem!important;font-size:.77rem!important;line-height:1.25!important;font-weight:750!important;color:#475569!important}
    #form-match-stats .form-control{width:100%!important;min-height:44px!important;border-radius:11px!important;font-size:.92rem!important;font-weight:650!important;background:#fff!important}
    #form-match-stats input[type="number"]{font-variant-numeric:tabular-nums!important}
    #form-match-stats .form-help{display:block!important;margin-top:.35rem!important;font-size:.67rem!important;line-height:1.3!important;color:#7c8798!important}
    #form-match-stats .publication-state-control{margin:0 0 .75rem!important;padding:.85rem!important;border:1px solid #e2e8f0!important;border-radius:13px!important;background:#f8fafc!important}
    #form-match-stats .publication-state-control label{font-size:.78rem!important;font-weight:800!important;color:#334155!important}
    #form-match-stats .stats-visibility-fieldset{margin:0 0 .9rem!important;padding:.85rem!important;border:1px solid #e2e8f0!important;border-radius:13px!important;background:#fff!important}
    #form-match-stats .stats-visibility-fieldset legend{padding:0 .3rem!important;font-size:.8rem!important;font-weight:800!important;color:#334155!important}
    #form-match-stats .stats-visibility-fieldset>p{margin:0 0 .7rem!important;font-size:.72rem!important;line-height:1.3!important;color:#64748b!important}
    #form-match-stats .stats-visibility-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.45rem!important}
    #form-match-stats .stats-visibility-grid label{display:flex!important;align-items:center!important;gap:.45rem!important;min-height:38px!important;margin:0!important;padding:.5rem .58rem!important;border:1px solid #e2e8f0!important;border-radius:10px!important;background:#f8fafc!important;font-size:.72rem!important;font-weight:650!important;color:#475569!important}
    #form-match-stats .stats-visibility-grid input{width:16px!important;height:16px!important;flex:0 0 auto!important}
    #form-match-stats .stats-modal-actions{position:sticky!important;bottom:0!important;z-index:3!important;display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)!important;gap:.6rem!important;margin:0 -1.15rem!important;padding:.8rem 1.15rem calc(.8rem + env(safe-area-inset-bottom))!important;border-top:1px solid #e2e8f0!important;background:rgba(255,255,255,.97)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
    #form-match-stats .stats-modal-actions .btn{width:100%!important;min-width:0!important;justify-content:center!important;min-height:43px!important;font-size:.78rem!important;font-weight:800!important}
    @media(max-width:560px){
      #modal-edit-match-stats{align-items:flex-end!important;padding:0!important}
      #modal-edit-match-stats .modal-content{width:100%!important;max-width:none!important;max-height:94dvh!important;margin:0!important;border-radius:20px 20px 0 0!important}
      #modal-edit-match-stats .modal-header{padding:.9rem 1rem!important}
      #modal-edit-match-stats .modal-header h3{font-size:1.02rem!important}
      #modal-edit-match-stats .modal-body{padding:.9rem 1rem 0!important}
      #form-match-stats .stats-entry-intro{padding:.72rem .78rem!important;margin-bottom:.8rem!important}
      #form-match-stats .stats-entry-intro span{font-size:.7rem!important}
      #form-match-stats .stats-form-section-title{margin:.85rem 0 .5rem!important;padding-top:.75rem!important;font-size:.76rem!important}
      #form-match-stats .form-row{grid-template-columns:1fr!important;gap:0!important}
      #form-match-stats .form-group{margin-bottom:.65rem!important}
      #form-match-stats .form-group label{font-size:.75rem!important}
      #form-match-stats .form-control{min-height:46px!important;font-size:16px!important}
      #form-match-stats .stats-visibility-grid{grid-template-columns:1fr!important;gap:.38rem!important}
      #form-match-stats .stats-visibility-grid label{min-height:40px!important;font-size:.73rem!important}
      #form-match-stats .stats-modal-actions{margin:0 -1rem!important;padding:.72rem 1rem calc(.72rem + env(safe-area-inset-bottom))!important;grid-template-columns:.8fr 1.2fr!important}
      #form-match-stats .stats-modal-actions .btn{min-height:46px!important;font-size:.76rem!important}
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
