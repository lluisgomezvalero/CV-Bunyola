(function(){
'use strict';

const FLAG='__matchStatisticsCoachPublishUx20260820';
if(window[FLAG])return;
window[FLAG]=true;

function isCoach(){try{return typeof isCoachUser==='function'&&isCoachUser();}catch(_){return false;}}

function ensureStyles(){
  if(document.getElementById('match-statistics-coach-publish-ux-style'))return;
  const style=document.createElement('style');
  style.id='match-statistics-coach-publish-ux-style';
  style.textContent=`
    #form-match-stats .stats-publication-status-hidden{display:none!important}
    #form-match-stats .stats-original-publication-accordion{display:none!important}
    #form-match-stats .stats-player-visibility{margin:.52rem 0 .7rem;border:1px solid #e2e8f0;border-radius:12px;background:#fff;overflow:hidden}
    #form-match-stats .stats-player-visibility>summary{display:flex;align-items:center;justify-content:space-between;gap:.7rem;min-height:47px;padding:.62rem .72rem;cursor:pointer;list-style:none;color:#334155}
    #form-match-stats .stats-player-visibility>summary::-webkit-details-marker{display:none}
    #form-match-stats .stats-player-visibility-copy{min-width:0}
    #form-match-stats .stats-player-visibility-copy strong{display:block;font-size:.72rem;font-weight:850;line-height:1.15;color:#1e293b}
    #form-match-stats .stats-player-visibility-copy small{display:block;margin-top:.12rem;font-size:.58rem;line-height:1.2;color:#8491a3}
    #form-match-stats .stats-player-visibility-meta{display:flex;align-items:center;gap:.42rem;flex:0 0 auto;font-size:.58rem;font-weight:800;color:#718096;white-space:nowrap}
    #form-match-stats .stats-player-visibility-chevron{width:7px;height:7px;border-right:1.5px solid #94a3b8;border-bottom:1.5px solid #94a3b8;transform:rotate(45deg);transition:transform .16s ease;margin-top:-3px}
    #form-match-stats .stats-player-visibility[open] .stats-player-visibility-chevron{transform:rotate(225deg);margin-top:3px}
    #form-match-stats .stats-player-visibility-body{padding:.6rem .65rem .65rem;border-top:1px solid #f1f5f9;background:#fbfcfe}
    #form-match-stats .stats-player-visibility-body .stats-visibility-fieldset{margin:0!important;padding:.62rem!important;background:#fff!important}
    #form-match-stats .stats-player-visibility-body .stats-visibility-grid{gap:.32rem!important}
    #form-match-stats .stats-player-visibility-body .stats-visibility-grid label{min-height:39px!important;padding:.35rem .42rem!important;font-size:.59rem!important}

    #form-match-stats .stats-publish-mode{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin:.2rem 0 .45rem;padding:.48rem .6rem;border-radius:10px;background:#f8fafc;border:1px solid #edf1f5}
    #form-match-stats .stats-publish-mode span{font-size:.59rem;font-weight:750;color:#7a8798}
    #form-match-stats .stats-publish-mode strong{font-size:.61rem;font-weight:850;color:#475569}
    #form-match-stats .stats-publish-mode.is-published strong{color:#3f7f62}

    #form-match-stats .stats-modal-actions{grid-template-columns:1fr 1.18fr!important;gap:.48rem!important}
    #form-match-stats .stats-modal-actions>.modal-close-btn,
    #form-match-stats .stats-modal-actions>button[type="submit"]{display:none!important}
    #form-match-stats .stats-save-draft-btn,
    #form-match-stats .stats-save-publish-btn{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-width:0!important;min-height:45px!important;border-radius:11px!important;font-size:.7rem!important;font-weight:850!important;line-height:1.1!important;padding:.55rem .5rem!important}
    #form-match-stats .stats-save-draft-btn{border:1px solid #dbe2ea!important;background:#fff!important;color:#475569!important}
    #form-match-stats .stats-save-publish-btn{border:1px solid #d4a72c!important;background:linear-gradient(135deg,#fbbf24,#f59e0b)!important;color:#1f2937!important;box-shadow:0 5px 13px rgba(245,158,11,.16)!important}
    #form-match-stats .stats-save-draft-btn:active,
    #form-match-stats .stats-save-publish-btn:active{transform:translateY(1px)}

    @media(max-width:560px){
      #form-match-stats .stats-player-visibility{margin:.45rem 0 .62rem}
      #form-match-stats .stats-player-visibility>summary{min-height:44px;padding:.57rem .64rem}
      #form-match-stats .stats-player-visibility-copy strong{font-size:.68rem}
      #form-match-stats .stats-player-visibility-copy small{font-size:.55rem}
      #form-match-stats .stats-player-visibility-body{padding:.52rem .56rem .56rem}
      #form-match-stats .stats-publish-mode{padding:.44rem .55rem;margin:.12rem 0 .4rem}
      #form-match-stats .stats-save-draft-btn,
      #form-match-stats .stats-save-publish-btn{min-height:44px!important;font-size:.67rem!important}
    }
  `;
  document.head.appendChild(style);
}

function updateVisibilityMeta(details){
  if(!details)return;
  const checks=[...details.querySelectorAll('[data-stats-visible]')];
  const selected=checks.filter(input=>input.checked).length;
  const meta=details.querySelector('.stats-player-visibility-count');
  if(meta)meta.textContent=checks.length?`${selected}/${checks.length}`:'Personalizar';
}

function currentStatusLabel(select){
  return String(select?.value||'draft')==='published'?'Publicada':'Borrador';
}

function updateMode(form){
  const select=form.querySelector('#stats-publication-status');
  const mode=form.querySelector('.stats-publish-mode');
  if(!select||!mode)return;
  const published=String(select.value)==='published';
  mode.classList.toggle('is-published',published);
  const value=mode.querySelector('strong');
  if(value)value.textContent=currentStatusLabel(select);
}

function submitWithStatus(form,status){
  const select=form.querySelector('#stats-publication-status');
  const submit=form.querySelector('button[type="submit"]');
  if(!select||!submit)return;
  select.value=status;
  select.dispatchEvent(new Event('change',{bubbles:true}));
  updateMode(form);
  if(typeof form.requestSubmit==='function')form.requestSubmit(submit);
  else submit.click();
}

function buildVisibilityDetails(form,actions){
  let details=form.querySelector('.stats-player-visibility');
  const visibility=form.querySelector('.stats-visibility-fieldset');
  const status=form.querySelector('#stats-publication-status');
  if(!visibility||!status||!actions)return null;

  const publicationControl=status.closest('.publication-state-control');
  const oldAccordion=status.closest('.stats-app-accordion[data-section="publication"]');
  if(publicationControl)publicationControl.classList.add('stats-publication-status-hidden');
  if(oldAccordion)oldAccordion.classList.add('stats-original-publication-accordion');

  if(!details){
    details=document.createElement('details');
    details.className='stats-player-visibility';
    details.innerHTML='<summary><div class="stats-player-visibility-copy"><strong>Qué ven las jugadoras</strong><small>Personaliza los indicadores publicados</small></div><span class="stats-player-visibility-meta"><span class="stats-player-visibility-count">—</span><i class="stats-player-visibility-chevron" aria-hidden="true"></i></span></summary><div class="stats-player-visibility-body"></div>';
    actions.parentNode?.insertBefore(details,actions);
  }
  const body=details.querySelector('.stats-player-visibility-body');
  if(body&&visibility.parentNode!==body)body.appendChild(visibility);
  updateVisibilityMeta(details);
  details.querySelectorAll('[data-stats-visible]').forEach(input=>{
    if(input.dataset.publishUxBound==='1')return;
    input.dataset.publishUxBound='1';
    input.addEventListener('change',()=>updateVisibilityMeta(details));
  });
  return details;
}

function buildFooter(form,actions){
  if(!actions)return;
  const submit=form.querySelector('button[type="submit"]');
  if(!submit)return;
  let draft=actions.querySelector('.stats-save-draft-btn');
  let publish=actions.querySelector('.stats-save-publish-btn');
  if(!draft){
    draft=document.createElement('button');
    draft.type='button';
    draft.className='stats-save-draft-btn';
    draft.textContent='Guardar borrador';
    draft.addEventListener('click',()=>submitWithStatus(form,'draft'));
    actions.appendChild(draft);
  }
  if(!publish){
    publish=document.createElement('button');
    publish.type='button';
    publish.className='stats-save-publish-btn';
    publish.textContent='Guardar y publicar';
    publish.addEventListener('click',()=>submitWithStatus(form,'published'));
    actions.appendChild(publish);
  }
}

function buildMode(form,anchor){
  if(form.querySelector('.stats-publish-mode')||!anchor)return;
  const mode=document.createElement('div');
  mode.className='stats-publish-mode';
  mode.innerHTML='<span>Estado actual</span><strong>Borrador</strong>';
  anchor.parentNode?.insertBefore(mode,anchor);
  updateMode(form);
}

function enhance(){
  if(!isCoach())return;
  ensureStyles();
  const form=document.getElementById('form-match-stats');
  if(!form)return;
  const submit=form.querySelector('button[type="submit"]');
  const actions=submit?.closest('.stats-modal-actions')||submit?.parentElement;
  const status=form.querySelector('#stats-publication-status');
  if(!actions||!status)return;
  const details=buildVisibilityDetails(form,actions);
  buildMode(form,details||actions);
  buildFooter(form,actions);
  updateMode(form);
}

function scheduleEnhance(){
  requestAnimationFrame(()=>requestAnimationFrame(enhance));
  setTimeout(enhance,120);
}

function observeModal(){
  const modal=document.getElementById('modal-edit-match-stats');
  if(!modal||modal.dataset.publishUxObserver==='1')return;
  modal.dataset.publishUxObserver='1';
  let active=modal.classList.contains('active');
  if(active)scheduleEnhance();
  new MutationObserver(()=>{
    const next=modal.classList.contains('active');
    if(next&&!active)scheduleEnhance();
    active=next;
  }).observe(modal,{attributes:true,attributeFilter:['class']});
}

function install(){ensureStyles();observeModal();scheduleEnhance();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
