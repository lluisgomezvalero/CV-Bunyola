(function(){
'use strict';

const FLAG='__gamePlanCoachShell20260816';
if(window[FLAG])return;
window[FLAG]=true;

function coachEditing(){
  try{
    const user=typeof getCurrentUser==='function'?getCurrentUser():null;
    const role=String(user?.role||'').toLowerCase();
    const coach=(typeof isCoachUser==='function'&&isCoachUser())||['coach','admin','administrator','entrenador'].some(token=>role.includes(token));
    const preview=typeof scoutingPreviewMode!=='undefined'&&Boolean(scoutingPreviewMode);
    return Boolean(coach&&!preview);
  }catch(_){return false;}
}
function state(){try{return typeof appState!=='undefined'?appState:null;}catch(_){return null;}}
function normalize(value){return String(value||'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function activeEvent(){
  try{
    const id=typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null;
    const s=state();
    if(!id||!s)return null;
    return (s.events||[]).find(evt=>[evt.id,evt.legacyId,evt.legacy_id,evt.supabaseId,evt.supabase_id].filter(Boolean).some(candidate=>String(candidate)===String(id)))||null;
  }catch(_){return null;}
}
function opponentName(evt){
  for(const value of [evt?.opponent,evt?.rawPayload?.opponent,evt?.payload?.opponent,evt?.matchOpponent,evt?.opponentName]){
    const text=String(value||'').trim();
    if(text&&normalize(text)!=='rival')return text;
  }
  return '';
}
function leagueTeam(name){
  const target=normalize(name);if(!target)return null;
  return (state()?.leagueTable||[]).find(team=>normalize(team?.name)===target)||null;
}
function ownTeam(){
  const s=state();const ownRow=(s?.leagueTable||[]).find(team=>team?.isOwn)||null;
  return {name:s?.teamInfo?.name||ownRow?.name||'CV BUNYOLA',logo:s?.teamInfo?.customLogo||ownRow?.logo||'assets/club_logo.png'};
}
function homeStatus(evt){
  try{const data=window.getMatchLogosData?.(evt);if(data&&typeof data.isHome==='boolean')return data.isHome;}catch(_){}
  const explicit=String(evt?.condition||evt?.matchCondition||evt?.rawPayload?.condition||evt?.rawPayload?.matchCondition||'').toLowerCase();
  if(/visit|fuera|away/.test(explicit))return false;
  if(/local|casa|home/.test(explicit))return true;
  return String(evt?.location||'').toLowerCase().includes('bunyola');
}
function setTeam(el,team,condition){
  if(!el)return;
  const img=el.querySelector('img'),strong=el.querySelector('strong'),small=el.querySelector('small');
  if(img){img.src=team.logo||'assets/default_avatar.svg';img.alt=`Escudo de ${team.name||'Equipo'}`;img.onerror=function(){this.onerror=null;this.src='assets/default_avatar.svg';};}
  if(strong)strong.textContent=team.name||'Equipo';
  if(small)small.textContent=condition;
}
function syncHero(){
  const root=document.getElementById('scouting-interactive-root');const hero=root?.querySelector('.game-plan-match-hero');const evt=activeEvent();
  if(!root||!hero||!evt)return;
  const rivalName=opponentName(evt);if(!rivalName)return;
  const row=leagueTeam(rivalName);const rival={name:row?.name||rivalName,logo:row?.logo||'assets/default_avatar.svg'};const own=ownTeam();const isHome=homeStatus(evt);const teams=[...hero.querySelectorAll('.game-plan-team')];
  if(teams.length<2)return;
  if(isHome){setTeam(teams[0],own,'Local');setTeam(teams[1],rival,'Visitante');}
  else{setTeam(teams[0],rival,'Local');setTeam(teams[1],own,'Visitante');}
}
function ensureBanner(root){
  let banner=root.querySelector('.coach-board-banner');
  if(!coachEditing()){banner?.remove();return;}
  if(!banner){banner=document.createElement('div');banner.className='coach-board-banner';banner.innerHTML='<div class="coach-board-banner-icon"><i data-lucide="clipboard-pen-line"></i></div><div><strong>Pizarra táctica</strong><span>Edita el scouting y publica cuando esté listo.</span></div>';root.prepend(banner);}
}
function compactHint(view){
  const hint=view.querySelector('.game-plan-workflow-hint');if(!hint)return;
  hint.classList.add('game-plan-workflow-hint-compact');
  hint.innerHTML='<i data-lucide="info"></i><span><strong>Borrador</strong>: solo staff <b>·</b> <strong>Publicar</strong>: visible para jugadoras</span>';
}
function compactPublishBar(root){
  const bar=root.querySelector('.scouting-publish-bar');if(!bar)return;
  bar.classList.add('coach-compact-publish-bar');
  const small=bar.querySelector('.scouting-status small');if(small)small.textContent='Estado';
  const actions=bar.querySelector('.scouting-publish-actions');if(!actions)return;
  actions.classList.add('coach-compact-actions');
  [...actions.querySelectorAll('button')].forEach(btn=>{
    const text=String(btn.textContent||'');
    btn.classList.toggle('coach-compact-preview',/vista previa/i.test(text));
    btn.classList.toggle('coach-compact-publish',/publicar|actualizar publicación/i.test(text));
    btn.classList.toggle('coach-compact-archive',/archivar/i.test(text));
  });
}
function compactTracker(){
  const tracker=document.querySelector('#scouting-interactive-root .plan-read-tracker');
  if(!tracker||!coachEditing())return;
  tracker.classList.add('coach-read-line','coach-compact-read-tracker');
  const head=tracker.querySelector('.plan-read-tracker-head');const label=head?.querySelector('small');const title=head?.querySelector('strong');const progress=head?.querySelector('.plan-read-progress');const ratio=String(progress?.textContent||'').trim();
  if(label)label.textContent='Seguimiento';if(title&&ratio)title.textContent=`${ratio} vistos`;if(progress)progress.setAttribute('aria-hidden','true');
  const toggle=tracker.querySelector('[data-plan-read-toggle]');
  if(toggle){const expanded=toggle.getAttribute('aria-expanded')==='true';const textNode=[...toggle.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);if(textNode)textNode.nodeValue=expanded?' Ocultar ':' Ver detalle ';}
}
function decorate(){
  const view=document.getElementById('view-tactics');const root=document.getElementById('scouting-interactive-root');if(!view||!root)return;
  const enabled=coachEditing();
  view.classList.toggle('coach-board-mode',enabled);view.classList.toggle('coach-top-compact',enabled);root.classList.toggle('coach-board-root',enabled);root.classList.toggle('coach-top-compact-root',enabled);
  ensureBanner(root);syncHero();
  if(enabled){compactHint(view);compactPublishBar(root);compactTracker();}
  try{window.lucide?.createIcons?.();}catch(_){}
}
function wrapRender(){
  const base=window.renderTactics;if(typeof base!=='function')return false;if(base.__coachShell20260816)return true;
  const wrapped=function(){const out=base.apply(this,arguments);requestAnimationFrame(decorate);return out;};wrapped.__coachShell20260816=true;window.renderTactics=wrapped;try{renderTactics=wrapped;}catch(_){}return true;
}
function wrapReadRenderer(){
  const base=window.renderPlanReadTracker;if(typeof base!=='function')return false;if(base.__coachShell20260816)return true;
  const wrapped=function(){const out=base.apply(this,arguments);setTimeout(()=>requestAnimationFrame(compactTracker),0);return out;};wrapped.__coachShell20260816=true;window.renderPlanReadTracker=wrapped;try{renderPlanReadTracker=wrapped;}catch(_){}return true;
}
function bind(){
  if(document.documentElement.dataset.gamePlanCoachShellBound==='1')return;
  document.documentElement.dataset.gamePlanCoachShellBound='1';
  document.addEventListener('click',event=>{if(event.target?.closest?.('[data-plan-read-toggle]'))setTimeout(compactTracker,0);});
  document.getElementById('scouting-match-select')?.addEventListener('change',()=>setTimeout(()=>{syncHero();decorate();},0));
}
function injectStyles(){
  if(document.getElementById('game-plan-coach-shell-20260816-css'))return;
  const style=document.createElement('style');style.id='game-plan-coach-shell-20260816-css';style.textContent=`
#view-tactics.coach-board-mode #scouting-interactive-root.coach-board-root{--board-ink:#0f172a;--board-muted:#64748b;--board-line:#d8dee8;--board-paper:#f7f8fa;--board-accent:#d97706;position:relative;gap:.7rem;padding:1rem;border:1px solid #dbe2ea;border-radius:24px;background-color:var(--board-paper);background-image:linear-gradient(rgba(148,163,184,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.075) 1px,transparent 1px);background-size:24px 24px;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 14px 30px rgba(15,23,42,.06)}
#view-tactics.coach-board-mode .coach-board-banner{display:flex;align-items:center;gap:.7rem;padding:.72rem .82rem;border:1px solid #cbd5e1;border-radius:15px;background:rgba(255,255,255,.94);box-shadow:0 4px 12px rgba(15,23,42,.05);margin:0}
#view-tactics.coach-board-mode .coach-board-banner-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#0f172a;color:#fbbf24;flex:0 0 auto}#view-tactics.coach-board-mode .coach-board-banner-icon svg{width:18px;height:18px}#view-tactics.coach-board-mode .coach-board-banner>div:last-child{display:grid;gap:.08rem;min-width:0}#view-tactics.coach-board-mode .coach-board-banner strong{font-family:var(--font-heading);font-size:.84rem;color:#0f172a;letter-spacing:.01em}#view-tactics.coach-board-mode .coach-board-banner span{font-size:.68rem;color:#64748b;font-weight:650}
#view-tactics.coach-board-mode .scouting-publish-bar{border:1px solid #cbd5e1!important;border-radius:16px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 6px 18px rgba(15,23,42,.06)!important}
#view-tactics.coach-board-mode .scout-section{border:1px solid #d6dde7!important;border-radius:18px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 7px 18px rgba(15,23,42,.055)!important}#view-tactics.coach-board-mode .scout-section-head{padding-bottom:.72rem;border-bottom:1px dashed #d7dee8;margin-bottom:.9rem!important}#view-tactics.coach-board-mode .scout-section-head>span{background:#0f172a!important;color:#fbbf24!important;border-radius:10px!important;font-family:var(--font-heading)}#view-tactics.coach-board-mode .scout-section-head h3{font-size:1rem;color:#0f172a}#view-tactics.coach-board-mode .scout-section-head p{font-size:.73rem;line-height:1.35}
#view-tactics.coach-board-mode .attack-scout-card{position:relative;border:1px solid #cbd5e1!important;border-radius:16px!important;background:#fff!important;box-shadow:0 7px 18px rgba(15,23,42,.07)!important;overflow:hidden}#view-tactics.coach-board-mode .attack-scout-card.is-hidden{opacity:.72;filter:saturate(.75)}#view-tactics.coach-board-mode .attack-scout-card-head{align-items:center!important;background:linear-gradient(135deg,#111827,#1e293b);border-bottom:2px solid #d97706}#view-tactics.coach-board-mode .attack-role{margin:0!important;color:#fbbf24!important;font-size:.65rem!important;letter-spacing:.075em!important}#view-tactics.coach-board-mode .attack-name-input{min-height:34px!important;padding:.34rem .48rem!important;border:1px solid rgba(255,255,255,.20)!important;border-radius:8px!important;background:rgba(255,255,255,.09)!important;color:#fff!important;font-size:.82rem!important;box-shadow:none!important}#view-tactics.coach-board-mode .attack-name-input::placeholder{color:#cbd5e1!important}#view-tactics.coach-board-mode .attack-name-input:focus{border-color:#fbbf24!important;background:rgba(255,255,255,.13)!important;outline:none!important}
#view-tactics.coach-board-mode .attack-direction-options{margin:.05rem 0 .62rem!important;gap:.32rem!important;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}#view-tactics.coach-board-mode .attack-direction-option span{border-radius:8px!important;background:#fff!important;border-color:#cbd5e1!important;color:#334155;font-size:.68rem!important}#view-tactics.coach-board-mode .attack-direction-option input:checked+span{background:#eaf2ff!important;border-color:#2563eb!important;color:#1d4ed8!important;box-shadow:inset 0 0 0 1px #2563eb}
#view-tactics.coach-top-compact .game-plan-workflow-hint-compact{align-items:center;margin:.55rem 0 .65rem!important;padding:.48rem .65rem!important;border-radius:11px!important;font-size:.69rem!important;line-height:1.25!important}#view-tactics.coach-top-compact .game-plan-workflow-hint-compact svg{width:15px!important;height:15px!important;margin:0!important}#view-tactics.coach-top-compact .game-plan-workflow-hint-compact b{font-weight:700;opacity:.55;margin:0 .12rem}
#view-tactics.coach-top-compact #scouting-interactive-root.coach-top-compact-root{width:100%!important;max-width:none!important;box-sizing:border-box!important;gap:.7rem!important}#view-tactics.coach-top-compact #scouting-interactive-root.coach-top-compact-root>*{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important}
#view-tactics.coach-top-compact .coach-compact-publish-bar{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,2.2fr)!important;align-items:center!important;gap:.65rem!important;padding:.65rem .72rem!important;margin:0!important}#view-tactics.coach-top-compact .coach-compact-actions{width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.4rem!important}#view-tactics.coach-top-compact .coach-compact-actions>button{width:100%!important;min-width:0!important;min-height:40px!important;margin:0!important;padding:.42rem .45rem!important;border-radius:10px!important;justify-content:center!important;gap:.3rem!important;font-size:.68rem!important;line-height:1.08!important;white-space:normal!important;text-align:center!important;box-shadow:none!important}
#view-tactics.coach-top-compact .coach-compact-read-tracker{padding:.72rem .78rem!important;margin:0!important;border-radius:14px!important}
@media(max-width:720px){#view-tactics.coach-board-mode #scouting-interactive-root.coach-board-root{padding:.35rem!important;border-radius:16px!important;background-size:20px 20px}#view-tactics.coach-board-mode .coach-board-banner{display:none!important}#view-tactics.coach-board-mode .scout-section{padding:.62rem!important;border-radius:15px!important}#view-tactics.coach-top-compact .game-plan-workflow-hint-compact{margin:.45rem 0 .55rem!important;padding:.42rem .55rem!important}#view-tactics .plan-read-tracker.coach-read-line{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:.38rem .55rem!important;padding:.52rem .62rem!important;border-radius:12px!important;min-height:0!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head{grid-column:1!important;display:flex!important;align-items:center!important;gap:.42rem!important;min-width:0!important;margin:0!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head>div{display:flex!important;align-items:baseline!important;gap:.38rem!important;min-width:0!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head small{margin:0!important;font-size:.6rem!important;line-height:1!important;letter-spacing:.055em!important;white-space:nowrap!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-tracker-head strong{margin:0!important;font-size:.78rem!important;line-height:1.1!important;white-space:nowrap!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-progress{display:none!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-summary{grid-column:2!important;display:block!important;margin:0!important;padding:0!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-summary>span{display:none!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-summary button{margin:0!important;padding:.28rem .1rem!important;font-size:.65rem!important;line-height:1!important;white-space:nowrap!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-progress-bar{grid-column:1/-1!important;height:4px!important;margin:0!important}#view-tactics .plan-read-tracker.coach-read-line .plan-read-details{grid-column:1/-1!important;margin-top:.25rem!important;padding-top:.55rem!important;gap:.65rem!important}}
`;
  document.head.appendChild(style);
}
function install(){
  injectStyles();bind();let tries=0;const timer=setInterval(()=>{tries++;const renderReady=wrapRender();const readReady=wrapReadRenderer();if(renderReady){clearInterval(timer);requestAnimationFrame(decorate);}else if(tries>120)clearInterval(timer);if(readReady)compactTracker();},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
