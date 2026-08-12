(function(){
'use strict';

const FLAG='__playerDashboardPriority20260812';

function isPlayer(){
  try{return typeof window.getCurrentUser==='function'&&window.getCurrentUser()?.role==='player';}catch(_){return false;}
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function playerId(){
  try{
    const user=window.getCurrentUser?.();
    return user?.playerId||user?.authId||user?.id||null;
  }catch(_){return null;}
}
function safeGame(id){
  try{return typeof window.calculatePlayerAttendanceAndAchievements==='function'?window.calculatePlayerAttendanceAndAchievements(id):null;}catch(_){return null;}
}
function safeMissions(id){
  try{return typeof window.getPlayerWeeklyMissions==='function'?(window.getPlayerWeeklyMissions(id)||[]):[];}catch(_){return [];}
}
function progressCard(id){
  const game=safeGame(id)||{};
  const missions=safeMissions(id);
  const completed=missions.filter(item=>item?.done).length;
  const attendance=Number.isFinite(Number(game.ratio))?Math.max(0,Math.min(100,Math.round(Number(game.ratio)))):0;
  const streak=Number.isFinite(Number(game.currentStreak))?Math.max(0,Math.round(Number(game.currentStreak))):0;
  const points=Number.isFinite(Number(game.points))?Math.max(0,Math.round(Number(game.points))):0;
  const levelProgress=Number.isFinite(Number(game.levelProgress))?Math.max(0,Math.min(100,Math.round(Number(game.levelProgress)))):0;
  const level=esc(game.level||'Inicio');
  const nextLine=game.nextLevel
    ? `${Math.max(0,Math.round(Number(game.pointsToNext)||0))} puntos para ${esc(game.nextLevel)}`
    : 'Nivel máximo de la temporada';

  return `<article id="player-dashboard-progress-card" class="dashboard-card dashboard-card-wide player-dashboard-progress-card">
    <div class="player-dashboard-progress-head">
      <div><span class="dashboard-eyebrow"><i data-lucide="sparkles"></i> Mi progreso</span><h3>${level}</h3></div>
      <span class="player-dashboard-points"><strong>${points}</strong><small>puntos</small></span>
    </div>
    <div class="player-dashboard-progress-track"><span style="width:${levelProgress}%"></span></div>
    <p class="player-dashboard-next-level">${nextLine}</p>
    <div class="player-dashboard-progress-metrics">
      <div><span class="player-dashboard-metric-icon tone-attendance"><i data-lucide="badge-check"></i></span><strong>${attendance}%</strong><small>Mi asistencia</small></div>
      <div><span class="player-dashboard-metric-icon tone-streak"><i data-lucide="flame"></i></span><strong>${streak}</strong><small>Racha actual</small></div>
      <div><span class="player-dashboard-metric-icon tone-habits"><i data-lucide="circle-check-big"></i></span><strong>${completed}/${missions.length}</strong><small>Hábitos esta semana</small></div>
    </div>
  </article>`;
}
function simplifyPlayerHome(){
  if(!isPlayer()) return;
  const root=document.getElementById('home-dashboard');
  const id=playerId();
  if(!root||!id) return;

  root.querySelector('.dashboard-summary-grid')?.remove();
  root.querySelector('.engagement-card')?.remove();
  root.querySelector('#player-dashboard-progress-card')?.remove();

  const lower=root.querySelector('.dashboard-lower-grid');
  if(!lower) return;
  [...lower.querySelectorAll(':scope > .dashboard-card')].forEach(card=>{
    const text=String(card.textContent||'').toLowerCase();
    if(text.includes('mi progreso')) card.remove();
  });
  lower.insertAdjacentHTML('afterbegin',progressCard(id));
  try{window.lucide?.createIcons?.();}catch(_){}
}
function injectCss(){
  if(document.getElementById('player-dashboard-priority-css')) return;
  const style=document.createElement('style');
  style.id='player-dashboard-priority-css';
  style.textContent=`
.player-dashboard-progress-card{padding:1.1rem 1.15rem!important;overflow:hidden}.player-dashboard-progress-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.player-dashboard-progress-head h3{margin:.22rem 0 0;color:#0f172a;font-size:1.18rem}.player-dashboard-points{display:flex;align-items:baseline;gap:.28rem;padding:.42rem .65rem;border-radius:12px;background:#f5f3ff;color:#6d28d9}.player-dashboard-points strong{font-size:1.05rem}.player-dashboard-points small{font-size:.68rem;font-weight:800}.player-dashboard-progress-track{height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:.9rem}.player-dashboard-progress-track span{display:block;height:100%;border-radius:inherit;background:#8b5cf6}.player-dashboard-next-level{margin:.38rem 0 0;color:#64748b;font-size:.72rem}.player-dashboard-progress-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem;margin-top:1rem}.player-dashboard-progress-metrics>div{min-width:0;padding:.75rem .7rem;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:.55rem;align-items:center}.player-dashboard-metric-icon{grid-row:1/3;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center}.player-dashboard-metric-icon svg{width:17px;height:17px}.player-dashboard-metric-icon.tone-attendance{background:#dcfce7;color:#15803d}.player-dashboard-metric-icon.tone-streak{background:#ffedd5;color:#c2410c}.player-dashboard-metric-icon.tone-habits{background:#e0e7ff;color:#4338ca}.player-dashboard-progress-metrics strong{font-size:.98rem;color:#0f172a;line-height:1}.player-dashboard-progress-metrics small{margin-top:.15rem;color:#64748b;font-size:.66rem;font-weight:750;line-height:1.2}@media(max-width:560px){.player-dashboard-progress-card{padding:1rem!important}.player-dashboard-progress-metrics{gap:.4rem}.player-dashboard-progress-metrics>div{display:flex;flex-direction:column;align-items:flex-start;padding:.65rem .55rem;gap:.28rem}.player-dashboard-metric-icon{width:30px;height:30px}.player-dashboard-progress-metrics strong{font-size:.94rem}.player-dashboard-progress-metrics small{font-size:.62rem}}
`;
  document.head.appendChild(style);
}
function install(){
  if(window[FLAG]) return;
  const base=window.renderHomeDashboard;
  if(typeof base!=='function'){setTimeout(install,120);return;}
  window[FLAG]=true;
  injectCss();
  const wrapped=function(){
    const result=base.apply(this,arguments);
    simplifyPlayerHome();
    return result;
  };
  window.renderHomeDashboard=wrapped;
  try{wrapped();}catch(_){}
}
setTimeout(install,0);
})();
