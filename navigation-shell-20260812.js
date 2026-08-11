(function () {
  'use strict';

  const SHELL_ID = 'volley-navigation-shell';
  const BODY_READY = 'volley-nav-ready';
  const BODY_DRAWER = 'volley-drawer-open';
  const DESKTOP_BREAKPOINT = 960;

  const MODULES = [
    { target: 'home-portal', label: 'Inicio', icon: 'house', group: 'principal' },
    { target: 'training', label: 'Entrenos', icon: 'activity', group: 'principal' },
    { target: 'calendar', label: 'Calendario', icon: 'calendar-days', group: 'principal' },
    { target: 'roster', label: 'Plantilla', icon: 'users', group: 'equipo' },
    { target: 'wellness', label: 'Bienestar y Carga', icon: 'heart-pulse', group: 'equipo' },
    { target: 'tactics', label: 'Plan de juego', icon: 'clipboard-list', group: 'equipo' },
    { target: 'competition', label: 'Competición', icon: 'trophy', group: 'equipo' },
    { target: 'goals', label: 'Objetivos', icon: 'target', group: 'equipo' },
    { target: 'stats', label: 'Estadísticas', icon: 'chart-no-axes-combined', group: 'equipo' },
    { target: 'planning', label: 'Planificación', icon: 'calendar-range', group: 'coach', access: 'coach' },
    { target: 'fitness', label: 'Rendimiento', icon: 'gauge', group: 'coach', access: 'coach' },
    { target: 'users', label: 'Administración', icon: 'shield-check', group: 'admin', access: 'admin' }
  ];

  const GROUPS = [
    ['principal', 'Principal'],
    ['equipo', 'Equipo'],
    ['coach', 'Cuerpo técnico'],
    ['admin', 'Administración']
  ];

  const titleByTarget = Object.fromEntries(MODULES.map(item => [item.target, item.label]));
  titleByTarget.home = 'Inicio';

  function isCoach() {
    try { return typeof window.isCoachUser === 'function' && window.isCoachUser(); }
    catch (_) { return false; }
  }

  function isAdmin() {
    try { return typeof window.isAdministratorUser === 'function' && window.isAdministratorUser(); }
    catch (_) {
      try {
        const user = typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null;
        return Boolean(user && ['administrator', 'admin'].includes(user.role));
      } catch (_) { return false; }
    }
  }

  function currentUser() {
    try { return typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null; }
    catch (_) { return null; }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function getTeamLogo() {
    const homeLogo = document.getElementById('home-team-logo');
    if (homeLogo?.src) return homeLogo.src;
    try {
      if (typeof appState !== 'undefined' && appState?.teamInfo?.customLogo) return appState.teamInfo.customLogo;
    } catch (_) {}
    return 'assets/club_logo.png';
  }

  function getProfileAvatar() {
    const homeAvatar = document.getElementById('nav-user-avatar-home');
    if (homeAvatar?.src) return homeAvatar.src;
    const headerAvatar = document.getElementById('nav-user-avatar-header');
    if (headerAvatar?.src) return headerAvatar.src;
    const user = currentUser();
    if (user?.avatar) return user.avatar;
    try {
      if (typeof appState !== 'undefined') {
        if (user?.playerId) {
          const player = (appState.players || []).find(p => String(p.id) === String(user.playerId));
          if (player?.avatar || player?.photo) return player.avatar || player.photo;
        }
        if (isCoach() && appState?.teamInfo?.coachAvatar) return appState.teamInfo.coachAvatar;
      }
    } catch (_) {}
    return 'assets/default_avatar.svg';
  }

  function getTeamName() {
    try { return appState?.teamInfo?.name || 'CV BUNYOLA'; }
    catch (_) { return 'CV BUNYOLA'; }
  }

  function getSeason() {
    try { return String(appState?.teamInfo?.season || '2026 - 2027').replace(' - ', '/'); }
    catch (_) { return '2026/27'; }
  }

  function accessAllowed(item) {
    if (item.access === 'admin') return isAdmin();
    if (item.access === 'coach') return isCoach();
    return true;
  }

  function navItemsForGroup(group) {
    return MODULES.filter(item => item.group === group).map(item => {
      const hidden = accessAllowed(item) ? '' : ' hidden';
      return `<button type="button" class="volley-side-item" data-volley-target="${item.target}" data-access="${item.access || 'all'}"${hidden}>
        <i data-lucide="${item.icon}"></i><span>${escapeHtml(item.label)}</span>
      </button>`;
    }).join('');
  }

  function buildShell() {
    if (document.getElementById(SHELL_ID)) return;

    const root = document.createElement('div');
    root.id = SHELL_ID;
    root.innerHTML = `
      <div class="volley-nav-overlay" data-volley-close-drawer aria-hidden="true"></div>
      <aside id="volley-side-nav" class="volley-side-nav" aria-label="Navegación principal">
        <div class="volley-side-brand">
          <img id="volley-side-logo" src="${getTeamLogo()}" alt="">
          <div><strong id="volley-side-team">${escapeHtml(getTeamName())}</strong><span id="volley-side-season">Temporada ${escapeHtml(getSeason())}</span></div>
          <button type="button" class="volley-side-close" data-volley-close-drawer aria-label="Cerrar menú"><i data-lucide="x"></i></button>
        </div>
        <div class="volley-side-scroll">
          ${GROUPS.map(([id, label]) => `<section class="volley-side-group" data-volley-group="${id}"><p>${escapeHtml(label)}</p><nav>${navItemsForGroup(id)}</nav></section>`).join('')}
        </div>
        <div class="volley-side-footer">
          <button type="button" class="volley-profile-entry" data-volley-profile>
            <img id="volley-side-avatar" src="${getProfileAvatar()}" alt="">
            <span><strong id="volley-side-user-name">Mi perfil</strong><small id="volley-side-user-role">Cuenta del equipo</small></span>
            <i data-lucide="chevron-right"></i>
          </button>
          <button type="button" class="volley-logout-entry" data-volley-logout title="Cerrar sesión" aria-label="Cerrar sesión"><i data-lucide="log-out"></i></button>
        </div>
      </aside>
      <header id="volley-mobile-bar" class="volley-mobile-bar">
        <button type="button" class="volley-mobile-menu" data-volley-open-drawer aria-label="Abrir menú"><i data-lucide="menu"></i></button>
        <strong id="volley-mobile-title">Inicio</strong>
        <button type="button" class="volley-mobile-profile" data-volley-profile aria-label="Abrir mi perfil"><img id="volley-mobile-avatar" src="${getProfileAvatar()}" alt=""></button>
      </header>`;
    document.body.appendChild(root);

    root.addEventListener('click', event => {
      const navButton = event.target.closest('[data-volley-target]');
      if (navButton) {
        event.preventDefault();
        navigate(navButton.dataset.volleyTarget);
        return;
      }
      if (event.target.closest('[data-volley-open-drawer]')) {
        event.preventDefault();
        openDrawer();
        return;
      }
      if (event.target.closest('[data-volley-close-drawer]')) {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.target.closest('[data-volley-profile]')) {
        event.preventDefault();
        closeDrawer();
        document.getElementById('btn-my-profile-home')?.click();
        return;
      }
      if (event.target.closest('[data-volley-logout]')) {
        event.preventDefault();
        closeDrawer();
        if (typeof window.handleLogout === 'function') window.handleLogout(event);
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('volley-navigation-shell-style')) return;
    const style = document.createElement('style');
    style.id = 'volley-navigation-shell-style';
    style.textContent = `
      #module-header-nav,#mobile-bottom-nav{display:none!important}
      #${SHELL_ID}{display:none}
      body.${BODY_READY} #${SHELL_ID}{display:block}
      .volley-side-nav{position:fixed;z-index:8500;left:0;top:0;bottom:0;width:256px;background:rgba(255,255,255,.97);border-right:1px solid rgba(226,232,240,.95);box-shadow:10px 0 35px rgba(15,23,42,.07);display:flex;flex-direction:column;color:#0f172a;transition:transform .22s ease;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .volley-side-brand{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:.75rem;align-items:center;padding:1.1rem 1rem .95rem;border-bottom:1px solid #eef2f7}
      .volley-side-brand>img{width:44px;height:44px;object-fit:contain;border-radius:13px;background:#fff;border:1px solid #fde68a;padding:3px}
      .volley-side-brand strong,.volley-side-brand span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.volley-side-brand strong{font-family:var(--font-heading);font-size:.96rem}.volley-side-brand span{font-size:.7rem;color:#64748b;margin-top:.1rem}
      .volley-side-close{display:none;width:38px;height:38px;border:0;border-radius:11px;background:#f1f5f9;color:#334155;place-items:center;cursor:pointer}.volley-side-close svg{width:19px}
      .volley-side-scroll{flex:1;min-height:0;overflow-y:auto;padding:.8rem .7rem 1rem;overscroll-behavior:contain}
      .volley-side-group{margin-bottom:.85rem}.volley-side-group[hidden]{display:none!important}.volley-side-group>p{margin:0;padding:.4rem .6rem .35rem;font-size:.64rem;line-height:1;text-transform:uppercase;letter-spacing:.11em;font-weight:900;color:#94a3b8}.volley-side-group nav{display:grid;gap:.18rem}
      .volley-side-item{width:100%;border:0;background:transparent;color:#475569;border-radius:12px;padding:.7rem .72rem;display:grid;grid-template-columns:22px 1fr;gap:.68rem;align-items:center;text-align:left;font-size:.83rem;font-weight:750;cursor:pointer;transition:background .16s ease,color .16s ease,transform .16s ease}.volley-side-item svg{width:19px;height:19px}.volley-side-item:hover{background:#f8fafc;color:#0f172a}.volley-side-item.active{background:#fff7ed;color:#9a3412;box-shadow:inset 0 0 0 1px #fed7aa}.volley-side-item:active{transform:scale(.985)}
      .volley-side-footer{display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:.45rem;align-items:center;padding:.8rem;border-top:1px solid #eef2f7;background:rgba(248,250,252,.78)}
      .volley-profile-entry{min-width:0;border:0;background:transparent;border-radius:13px;padding:.45rem;display:grid;grid-template-columns:38px minmax(0,1fr) 16px;gap:.55rem;align-items:center;text-align:left;cursor:pointer}.volley-profile-entry:hover{background:#fff}.volley-profile-entry img{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #d97706;background:#fff}.volley-profile-entry strong,.volley-profile-entry small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.volley-profile-entry strong{font-size:.78rem;color:#0f172a}.volley-profile-entry small{font-size:.65rem;color:#64748b;margin-top:.1rem}.volley-profile-entry>svg{width:15px;color:#94a3b8}
      .volley-logout-entry{width:42px;height:42px;border:0;border-radius:12px;background:#fff;color:#64748b;display:grid;place-items:center;cursor:pointer}.volley-logout-entry:hover{background:#fef2f2;color:#b91c1c}.volley-logout-entry svg{width:18px}
      .volley-mobile-bar{display:none}
      .volley-nav-overlay{display:none}

      /* Ficha de sesión: una sola flecha y edición integrada en la cabecera */
      .session-detail-hero{position:relative!important}
      .session-detail-hero .session-back-button{display:grid!important}
      .session-detail-hero>.btn{background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.24)!important;color:#fff!important;box-shadow:none!important;border-radius:13px!important}
      .session-detail-hero>.btn:hover{background:rgba(255,255,255,.17)!important;border-color:rgba(255,255,255,.35)!important}

      @media (min-width:961px){
        body.${BODY_READY} .app-portal-wrapper{max-width:none!important;width:calc(100% - 256px)!important;margin:0 0 0 256px!important;padding:1rem clamp(1.2rem,2.4vw,2.5rem) 3rem!important}
        body.${BODY_READY} .app-portal-wrapper>.page-view{max-width:1280px;margin-left:auto;margin-right:auto}
      }

      @media (max-width:960px){
        .volley-side-nav{width:min(84vw,310px);transform:translateX(-105%);box-shadow:18px 0 45px rgba(15,23,42,.18)}
        body.${BODY_DRAWER} .volley-side-nav{transform:translateX(0)}
        .volley-side-close{display:grid}
        .volley-nav-overlay{display:block;position:fixed;z-index:8400;inset:0;background:rgba(15,23,42,.32);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .2s ease}
        body.${BODY_DRAWER} .volley-nav-overlay{opacity:1;pointer-events:auto}
        body.${BODY_DRAWER}{overflow:hidden}
        .volley-mobile-bar{position:fixed;z-index:8300;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 10px);height:58px;border:1px solid rgba(226,232,240,.88);border-radius:19px;background:rgba(255,255,255,.94);box-shadow:0 10px 30px rgba(15,23,42,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:.5rem;padding:.4rem .48rem}
        .volley-mobile-bar>strong{text-align:center;font-family:var(--font-heading);font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0f172a}
        .volley-mobile-menu,.volley-mobile-profile{width:44px;height:44px;border:0;border-radius:14px;background:#f8fafc;display:grid;place-items:center;cursor:pointer;color:#0f172a}.volley-mobile-menu svg{width:22px}.volley-mobile-profile{padding:3px;background:#fff}.volley-mobile-profile img{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #d97706;background:#fff}
        body.${BODY_READY} .app-portal-wrapper{max-width:100%!important;width:100%!important;margin:0!important;padding:calc(env(safe-area-inset-top,0px) + 82px) 1rem 1.6rem!important}
        body.${BODY_READY} .app-portal-wrapper>.page-view{max-width:100%;margin:0}
        .session-detail-hero{padding:1.15rem!important;padding-top:4.5rem!important}
        .session-detail-hero>.btn{position:absolute!important;right:1rem!important;top:1rem!important;margin:0!important;width:44px!important;height:44px!important;padding:0!important;display:grid!important;place-items:center!important;font-size:0!important;border-radius:14px!important}
        .session-detail-hero>.btn svg{width:20px!important;height:20px!important;margin:0!important}
        .session-detail-hero .session-back-button{position:absolute!important;left:1rem!important;top:1rem!important;margin:0!important;width:44px!important;height:44px!important}
        .session-detail-hero>div{width:100%}
      }

      @media (max-width:520px){
        body.${BODY_READY} .app-portal-wrapper{padding-left:.75rem!important;padding-right:.75rem!important}
        .session-detail-hero{border-radius:22px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function getActiveTarget() {
    const active = document.querySelector('.app-portal-wrapper .page-view.active');
    if (!active?.id) return 'home-portal';
    return active.id.replace(/^view-/, '') || 'home-portal';
  }

  function syncActiveState() {
    const activeTarget = getActiveTarget();
    document.querySelectorAll('#' + SHELL_ID + ' [data-volley-target]').forEach(button => {
      button.classList.toggle('active', button.dataset.volleyTarget === activeTarget || (activeTarget === 'home' && button.dataset.volleyTarget === 'home-portal'));
    });
    const title = titleByTarget[activeTarget] || titleByTarget[activeTarget === 'home' ? 'home-portal' : activeTarget] || 'VolleyCoach';
    const mobileTitle = document.getElementById('volley-mobile-title');
    if (mobileTitle) mobileTitle.textContent = title;
  }

  function syncIdentity() {
    const user = currentUser();
    const name = user?.name || user?.username || 'Mi perfil';
    const role = isAdmin() ? 'Administrador' : isCoach() ? 'Entrenador' : 'Jugadora';
    const avatar = getProfileAvatar();
    const logo = getTeamLogo();
    const userName = document.getElementById('volley-side-user-name');
    const userRole = document.getElementById('volley-side-user-role');
    const sideAvatar = document.getElementById('volley-side-avatar');
    const mobileAvatar = document.getElementById('volley-mobile-avatar');
    const sideLogo = document.getElementById('volley-side-logo');
    const sideTeam = document.getElementById('volley-side-team');
    const sideSeason = document.getElementById('volley-side-season');
    if (userName) userName.textContent = name;
    if (userRole) userRole.textContent = role;
    if (sideAvatar) sideAvatar.src = avatar;
    if (mobileAvatar) mobileAvatar.src = avatar;
    if (sideLogo) sideLogo.src = logo;
    if (sideTeam) sideTeam.textContent = getTeamName();
    if (sideSeason) sideSeason.textContent = 'Temporada ' + getSeason();
  }

  function syncAccess() {
    document.querySelectorAll('#' + SHELL_ID + ' [data-access]').forEach(button => {
      const access = button.dataset.access;
      button.hidden = access === 'admin' ? !isAdmin() : access === 'coach' ? !isCoach() : false;
    });
    document.querySelectorAll('#' + SHELL_ID + ' [data-volley-group]').forEach(section => {
      const visible = [...section.querySelectorAll('[data-volley-target]')].some(button => !button.hidden);
      section.hidden = !visible;
    });
  }

  function authenticated() {
    const wrapper = document.querySelector('.app-portal-wrapper');
    const login = document.getElementById('view-login');
    const wrapperVisible = wrapper && getComputedStyle(wrapper).display !== 'none';
    return Boolean(wrapperVisible && !login?.classList.contains('active') && currentUser());
  }

  function syncShell() {
    const ready = authenticated();
    document.body.classList.toggle(BODY_READY, ready);
    if (!ready) closeDrawer();
    syncAccess();
    syncIdentity();
    syncActiveState();
    if (window.lucide) {
      try { window.lucide.createIcons(); } catch (_) {}
    }
  }

  function openDrawer() {
    if (window.innerWidth > DESKTOP_BREAKPOINT) return;
    document.body.classList.add(BODY_DRAWER);
  }

  function closeDrawer() {
    document.body.classList.remove(BODY_DRAWER);
  }

  function navigate(target) {
    closeDrawer();
    if (!target) return;
    if (typeof window.openModule === 'function') {
      window.openModule(target === 'home' ? 'home-portal' : target);
      requestAnimationFrame(() => {
        syncActiveState();
        syncAccess();
      });
    }
  }

  function installObservers() {
    const wrapper = document.querySelector('.app-portal-wrapper');
    const login = document.getElementById('view-login');
    if (wrapper) {
      new MutationObserver(records => {
        const relevant = records.some(record => record.target === wrapper || record.target?.classList?.contains('page-view'));
        if (relevant) requestAnimationFrame(syncShell);
      }).observe(wrapper, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }
    if (login) new MutationObserver(() => requestAnimationFrame(syncShell)).observe(login, { attributes: true, attributeFilter: ['class', 'style'] });

    const homeAvatar = document.getElementById('nav-user-avatar-home');
    if (homeAvatar) new MutationObserver(() => requestAnimationFrame(syncIdentity)).observe(homeAvatar, { attributes: true, attributeFilter: ['src'] });
  }

  function init() {
    injectStyles();
    buildShell();
    installObservers();
    syncShell();

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains(BODY_DRAWER)) closeDrawer();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > DESKTOP_BREAKPOINT) closeDrawer();
    }, { passive: true });

    // La identidad y permisos pueden terminar de hidratarse después del primer render.
    setTimeout(syncShell, 500);
    setTimeout(syncShell, 1400);
    console.info('[VolleyCoach Navigation] Sidebar/drawer responsive activo.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
