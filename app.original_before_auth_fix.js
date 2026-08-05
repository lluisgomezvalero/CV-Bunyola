// ==========================================================================
// VolleyCoach Hub - Main Application Logic (Pizarra Táctica 100% Editable)
// ==========================================================================

let appState = getAppData();
let activeChartTrend = null;
let activeChartSleep = null;
let activeChartGlobalRecError = null;
let activeChartGlobalRecPerfect = null;

let currentCalendarYear = 2026;
let currentCalendarMonth = 8; // Septiembre por defecto (Inicio de Temporada)
let activePlayerIdForAvatar = null;

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  
  initPlayerAvatarUploadListener();

  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('es-ES', dateOptions);
  const dateEl = document.getElementById("current-date-display");
  if (dateEl) dateEl.textContent = dateStr;

  updateTeamHeaderInfo();

  // Comprobar autenticación ANTES de cambiar vistas
  const isAuthenticated = sessionStorage.getItem("volley_authenticated") === "true";
  const loginView = document.getElementById("view-login");
  const portalWrapper = document.querySelector(".app-portal-wrapper");

  if (!isAuthenticated) {
    if (loginView) loginView.classList.add("active");
    if (portalWrapper) portalWrapper.style.display = "none";
  } else {
    if (loginView) loginView.classList.remove("active");
    if (portalWrapper) portalWrapper.style.display = "block";
    openModule("home-portal");
    applyRolePermissions();
    try { renderNavUserProfile(); } catch(e){}
  }

  try { renderGoogleCalendar(); } catch(e){}
  try { renderRoster(); } catch(e){}
  try { renderWellness(); } catch(e){}
  try { renderTraining(); } catch(e){}
  try { renderTactics(); } catch(e){}
  try { renderStats(); } catch(e){}
  try { renderUsers(); } catch(e){}
  try { renderFitnessModule(); } catch(e){}

  initGoogleCalendarListeners();
  initModalListeners();
  initFormListeners();
  initFitnessFormListener();
  initRangeSliders();
  initExportAndSettings();
  initBgUploadListener();
  initLogoUploadListener();
  initMatchStatsFormListener();
  initCompetitionListeners();
  initBorgMatrixListeners();
  initBorgInteractiveBar();
  initLoginListener();
  initVerifyAttendanceFormListener();
  initWeeklyGoals();
  try { renderHomeDashboard(); } catch(e) { console.error(e); }
});

/* ==========================================================================
   RENDERIZAR LISTADO DE USUARIOS (DESDE LA PLANTILLA OFICIAL DE JUGADORAS)
   ========================================================================== */
function renderUsers() {
  const tbody = document.getElementById("users-table-body");
  const countBadge = document.getElementById("users-count-badge");
  if (!tbody) return;
  
  tbody.innerHTML = "";

  const users = (appState && Array.isArray(appState.users)) ? appState.users : (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.users : []);
  const players = (appState && Array.isArray(appState.players)) ? appState.players : (typeof INITIAL_DATA !== 'undefined' ? INITIAL_DATA.players : []);

  // 1. Entrenador Principal
  const coachUser = users.find(u => u.role === "admin" || u.username === "admin") || {
    name: "Entrenador Principal",
    username: "admin",
    password: "123456",
    role: "admin",
    lastLogin: null
  };

  const fullList = [
    {
      name: coachUser.name,
      username: coachUser.username,
      password: coachUser.password || "123456",
      role: "admin",
      dorsal: "–",
      position: "Entrenador",
      lastLogin: coachUser.lastLogin
    }
  ];

  // 2. Mapear cada jugadora de la plantilla
  players.forEach(p => {
    const uMatch = users.find(u => (u.playerId && u.playerId === p.id) || u.username === p.username || (u.name && u.name.toLowerCase() === p.name.toLowerCase()));

    fullList.push({
      name: p.name,
      username: p.username || (uMatch ? uMatch.username : 'jugadora'),
      password: uMatch ? (uMatch.password || "123456") : "123456",
      role: "player",
      dorsal: `#${p.number}`,
      position: p.position || "Jugadora",
      lastLogin: uMatch ? uMatch.lastLogin : null
    });
  });

  if (countBadge) {
    countBadge.textContent = `${fullList.length} Accesos (1 Entrenador + ${players.length} Jugadoras)`;
  }

  fullList.forEach(item => {
    const isEntrenador = item.role === "admin";
    const roleBadge = isEntrenador
      ? '<span class="status-badge status-disponible" style="background:#fef3c7; color:#b45309; border: 1px solid #fde68a;">Cuerpo Técnico</span>' 
      : '<span class="status-badge" style="background:#e0e7ff; color:#4338ca; border: 1px solid #c7d2fe;">Jugadora</span>';

    let lastLoginHTML = `<span style="color: #94a3b8; font-style: italic;">Sin inicios de sesión registrados</span>`;
    if (item.lastLogin && item.lastLogin !== "Nunca" && item.lastLogin !== "Sin accesos registrados") {
      lastLoginHTML = `<span style="color: #059669; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.25rem 0.65rem; border-radius: 20px; font-size: 0.82rem;">🟢 ${item.lastLogin}</span>`;
    }

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.innerHTML = `
      <td style="padding: 0.9rem 1rem;">
        <strong style="color: #0f172a; font-size: 0.95rem;">${item.name}</strong>
        ${item.dorsal !== "–" ? `<span style="margin-left: 0.5rem; background: #fef3c7; color: #b45309; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">${item.dorsal}</span>` : ""}
      </td>
      <td style="padding: 0.9rem 1rem;">
        <span style="color: #0f172a; font-weight: 600; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.85rem; border: 1px solid #e2e8f0;">${item.position}</span>
      </td>
      <td style="padding: 0.9rem 1rem;">
        <span style="color: #4f46e5; font-weight: 700; background: #e0e7ff; padding: 0.25rem 0.6rem; border-radius: 6px;">@${item.username}</span>
      </td>
      <td style="padding: 0.9rem 1rem;">
        <code style="background: #f1f5f9; color: #334155; padding: 0.3rem 0.6rem; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 0.9rem;">${item.password}</code>
      </td>
      <td style="padding: 0.9rem 1rem;">${roleBadge}</td>
      <td style="padding: 0.9rem 1rem; font-size: 0.85rem;">
        ${lastLoginHTML}
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e){}
  }
}

/* ==========================================================================
   SISTEMA DE AUTENTICACIÓN Y PERMISOS (RESTAURADO)
   ========================================================================== */
function getCurrentUser() {
  const userJson = sessionStorage.getItem("volley_current_user");
  if (userJson) {
    try { return JSON.parse(userJson); } catch (e) { return null; }
  }
  return null;
}

function isCoachUser() {
  const user = getCurrentUser();
  return user && user.role === "admin";
}

function handleLogout() {
  sessionStorage.removeItem("volley_authenticated");
  sessionStorage.removeItem("volley_current_user");
  window.location.reload();
}

function applyRolePermissions() {
  const isCoach = isCoachUser();
  const coachOnlyElements = document.querySelectorAll(".coach-only-view");
  
  coachOnlyElements.forEach(el => {
    if (isCoach) {
      el.style.display = ""; 
    } else {
      el.style.display = "none";
    }
  });

  // Requerimiento 2: Ocultar + Añadir Evento en Calendario para jugadoras
  const addEventBtn = document.getElementById("gcal-btn-add-event");
  if (addEventBtn) addEventBtn.style.display = isCoach ? "inline-flex" : "none";

  // Requerimiento 6: Ocultar + Planificar Sesión en Entrenamientos para jugadoras
  const addTrainingBtn = document.getElementById("btn-add-training-session");
  if (addTrainingBtn) addTrainingBtn.style.display = isCoach ? "inline-flex" : "none";

  // Requerimiento 9: Ocultar Editar Rotación Táctica en Plan de Juego para jugadoras
  const editTacticBtn = document.getElementById("btn-edit-tactic");
  if (editTacticBtn) editTacticBtn.style.display = isCoach ? "inline-flex" : "none";
}

function initLoginListener() {
  const formLogin = document.getElementById("form-login");
  const loginErrorMsg = document.getElementById("login-error-msg");

  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      const userVal = document.getElementById("login-username").value.trim().toLowerCase();
      const passVal = document.getElementById("login-password").value.trim();

      const userMatch = appState.users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);

      if (userMatch) {
        // Update last login (Día y hora exactos)
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        userMatch.lastLogin = formattedDate;
        saveAppData(appState);
        
        const tbody = document.getElementById("users-table-body");
        if (tbody && tbody.children.length > 0) {
          renderUsers();
        }

        sessionStorage.setItem("volley_authenticated", "true");
        sessionStorage.setItem("volley_current_user", JSON.stringify({
          username: userMatch.username,
          name: userMatch.name,
          role: userMatch.role,
          playerId: userMatch.playerId,
          lastLogin: formattedDate
        }));

        document.getElementById("view-login").classList.remove("active");
        document.querySelector(".app-portal-wrapper").style.display = "block";
        
        applyRolePermissions();
        try { renderNavUserProfile(); } catch(e){}
        openModule("home-portal");
      } else {
        if (loginErrorMsg) loginErrorMsg.style.display = "flex";
      }
    });
  }

  // Profile modal & Avatar listeners
  const btnProfileHeader = document.getElementById("btn-my-profile-header");
  const btnProfileHome = document.getElementById("btn-my-profile-home");
  const modalProfile = document.getElementById("modal-my-profile");

  const openProfile = () => {
    if (modalProfile) {
      const preview = document.getElementById("my-profile-avatar-preview");
      const currentUser = getCurrentUser();
      let userAvatar = DEFAULT_AVATAR;

      if (currentUser) {
        const userMatch = (appState.users || []).find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (currentUser.avatar) {
          userAvatar = currentUser.avatar;
        } else if (userMatch && userMatch.avatar) {
          userAvatar = userMatch.avatar;
        } else if (currentUser.role === 'admin' && appState.teamInfo && appState.teamInfo.coachAvatar) {
          userAvatar = appState.teamInfo.coachAvatar;
        } else {
          const pId = currentUser.playerId || (userMatch ? userMatch.playerId : null);
          if (pId) {
            const player = (appState.players || []).find(p => p.id === pId);
            if (player && player.avatar) userAvatar = player.avatar;
          }
        }
      }

      if (preview) preview.src = userAvatar;

      // Generar tarjeta de información privada
      const privateInfoContainer = document.getElementById("profile-private-info");
      if (privateInfoContainer && currentUser) {
        const userMatch = (appState.users || []).find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
        const lastLoginVal = currentUser.lastLogin || (userMatch ? userMatch.lastLogin : null) || `${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}`;

        if (currentUser.role === 'admin') {
          privateInfoContainer.innerHTML = `
            <div class="profile-info-item">
              <label>Nombre Completo</label>
              <span>${currentUser.name || 'Entrenador Principal'}</span>
            </div>
            <div class="profile-info-item">
              <label>Usuario</label>
              <span>@${currentUser.username}</span>
            </div>
            <div class="profile-info-item">
              <label>Rol de Cuenta</label>
              <span>Entrenador Principal (Admin)</span>
            </div>
            <div class="profile-info-item">
              <label>Equipo Principal</label>
              <span>${appState.teamInfo ? appState.teamInfo.name : 'CV BUNYOLA'}</span>
            </div>
            <div class="profile-info-item">
              <label>Categoría</label>
              <span>${appState.teamInfo ? appState.teamInfo.category : 'Cadete Femenino 1ª Div'}</span>
            </div>
            <div class="profile-info-item" style="border-left: 3px solid #10b981; padding-left: 0.75rem; background: rgba(16, 185, 129, 0.08); border-radius: 8px;">
              <label style="color: #10b981; font-weight: 700;">🕒 Último Inicio de Sesión</label>
              <span style="font-weight: 800; color: #f8fafc;">${lastLoginVal}</span>
            </div>
          `;
        } else {
          const player = appState.players.find(p => p.id === currentUser.playerId);
          privateInfoContainer.innerHTML = `
            <div class="profile-info-item">
              <label>Nombre Completo</label>
              <span>${player ? player.name : currentUser.name}</span>
            </div>
            <div class="profile-info-item">
              <label>Dorsal / Camiseta</label>
              <span>#${player ? player.number : '--'}</span>
            </div>
            <div class="profile-info-item">
              <label>Posición en Campo</label>
              <span>${player ? player.position : 'Jugadora'}</span>
            </div>
            <div class="profile-info-item">
              <label>Altura / Salto CMJ</label>
              <span>${player ? (player.height + ' • CMJ: ' + player.cmj) : '--'}</span>
            </div>
            <div class="profile-info-item">
              <label>Correo Electrónico</label>
              <span>${player && player.email ? player.email : (currentUser.username + '@bunyola.com')}</span>
            </div>
            <div class="profile-info-item" style="border-left: 3px solid #10b981; padding-left: 0.75rem; background: rgba(16, 185, 129, 0.08); border-radius: 8px;">
              <label style="color: #10b981; font-weight: 700;">🕒 Último Inicio de Sesión</label>
              <span style="font-weight: 800; color: #f8fafc;">${lastLoginVal}</span>
            </div>
          `;
        }
      }

      // Generar contadores de asistencia y logros
      const attendanceStatsContainer = document.getElementById("profile-attendance-stats");
      const achievementsListContainer = document.getElementById("profile-achievements-list");

      if (currentUser) {
        const playerId = currentUser.role === 'admin' ? 'p1' : (currentUser.playerId || 'p1');
        const stats = calculatePlayerAttendanceAndAchievements(playerId);

        if (attendanceStatsContainer) {
          attendanceStatsContainer.innerHTML = `
            <div class="attendance-box">
              <div class="attendance-box-val" style="color: #10b981;">${stats.totalAttended}</div>
              <div class="attendance-box-lbl">Asistidos</div>
            </div>
            <div class="attendance-box">
              <div class="attendance-box-val" style="color: #ef4444;">${stats.totalMissed}</div>
              <div class="attendance-box-lbl">Ausencias</div>
            </div>
            <div class="attendance-box">
              <div class="attendance-box-val" style="color: #fbbf24;">${stats.ratio}%</div>
              <div class="attendance-box-lbl">% Asistencia</div>
            </div>
            <div class="attendance-box">
              <div class="attendance-box-val" style="color: #f97316;">${stats.currentStreak}</div>
              <div class="attendance-box-lbl">🔥 Racha actual</div>
            </div>
            <div class="attendance-box">
              <div class="attendance-box-val" style="color: #8b5cf6;">${stats.points}</div>
              <div class="attendance-box-lbl">Puntos · ${stats.level}</div>
            </div>
          `;
        }

        if (achievementsListContainer) {
          achievementsListContainer.innerHTML = stats.achievements.map(ach => `
            <div class="achievement-item ${ach.unlocked ? 'unlocked' : ''}">
              <div class="achievement-icon"><i data-lucide="${ach.icon}"></i></div>
              <div class="achievement-info">
                <div class="achievement-title">
                  <span>${ach.title}</span>
                  ${ach.unlocked ? '<span style="font-size:0.7rem; background:#fbbf24; color:#0f172a; padding:2px 6px; border-radius:10px; font-weight:800;">¡DESBLOQUEADO!</span>' : ''}
                </div>
                <div class="achievement-desc">${ach.desc}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#94a3b8; margin-top:0.3rem;">
                  <span>Progreso</span>
                  <span>${ach.progressText}</span>
                </div>
                <div class="achievement-progress-bar">
                  <div class="achievement-progress-fill" style="width: ${ach.progress}%; ${ach.unlocked ? 'background: linear-gradient(90deg, #f59e0b, #fbbf24);' : ''}"></div>
                </div>
              </div>
            </div>
          `).join('');
        }
      }

      if (window.lucide) window.lucide.createIcons();
      modalProfile.classList.add("active");
    }
  };

  if (btnProfileHeader) btnProfileHeader.addEventListener("click", openProfile);
  if (btnProfileHome) btnProfileHome.addEventListener("click", openProfile);

  const formProfile = document.getElementById("form-my-profile");
  if (formProfile) {
    formProfile.addEventListener("submit", (e) => {
      e.preventDefault();
      const pass1 = document.getElementById("profile-new-password").value;
      const pass2 = document.getElementById("profile-confirm-password").value;

      if (pass1 || pass2) {
        if (pass1 !== pass2) {
          showToast("Las contraseñas no coinciden", "error");
          return;
        }
        if (pass1.length < 6) {
          showToast("La contraseña debe tener mínimo 6 caracteres", "error");
          return;
        }
        
        const currentUser = getCurrentUser();
        const userMatch = appState.users.find(u => u.username === currentUser.username);
        if (userMatch) {
          userMatch.password = pass1;
          saveAppData(appState);
          const tbody = document.getElementById("users-table-body");
          if (tbody && tbody.children.length > 0) renderUsers();
          showToast("Contraseña actualizada con éxito");
          document.getElementById("profile-new-password").value = "";
          document.getElementById("profile-confirm-password").value = "";
          modalProfile.classList.remove("active");
        }
      } else {
        modalProfile.classList.remove("active");
      }
    });
  }

  // Listener para cambiar foto de perfil (CUALQUIER ROL)
  const avatarUpload = document.getElementById("my-profile-avatar-upload");
  if (avatarUpload) {
    avatarUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      compressAndResizeImage(file, 400, 400, 0.85, (dataUrl) => {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const userMatch = (appState.users || []).find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (userMatch) userMatch.avatar = dataUrl;

        if (currentUser.role === 'admin') {
          if (!appState.teamInfo) appState.teamInfo = {};
          appState.teamInfo.coachAvatar = dataUrl;
        }

        const pId = currentUser.playerId || (userMatch ? userMatch.playerId : null);
        if (pId) {
          const player = (appState.players || []).find(p => p.id === pId);
          if (player) player.avatar = dataUrl;
        } else {
          const playerByName = (appState.players || []).find(p => p.username && p.username.toLowerCase() === currentUser.username.toLowerCase());
          if (playerByName) playerByName.avatar = dataUrl;
        }

        saveAppData(appState);

        currentUser.avatar = dataUrl;
        sessionStorage.setItem("volley_current_user", JSON.stringify(currentUser));

        const rosterTbody = document.getElementById("roster-table-body");
        if (rosterTbody && rosterTbody.children.length > 0) renderRoster();

        renderNavUserProfile();

        const preview = document.getElementById("my-profile-avatar-preview");
        if (preview) preview.src = dataUrl;

        showToast("¡Foto de perfil actualizada con éxito!");
      });
    });
  }
}

// Compresión y Redimensionamiento de Imagen a Canvas (Guarda de forma liviana en localStorage)
function compressAndResizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.85, callback) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Por favor selecciona un archivo de imagen válido.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Renderizado de Avatar del usuario en la barra de navegación superior
function renderNavUserProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const headerAvatar = document.getElementById("nav-user-avatar-header");
  const homeAvatar = document.getElementById("nav-user-avatar-home");
  const headerName = document.getElementById("nav-user-name-header");
  const homeName = document.getElementById("nav-user-name-home");

  let avatarUrl = DEFAULT_AVATAR;
  let displayName = currentUser.name || currentUser.username;

  const userMatch = (appState.users || []).find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());

  if (currentUser.avatar) {
    avatarUrl = currentUser.avatar;
  } else if (userMatch && userMatch.avatar) {
    avatarUrl = userMatch.avatar;
  } else if (currentUser.role === 'admin' && appState.teamInfo && appState.teamInfo.coachAvatar) {
    avatarUrl = appState.teamInfo.coachAvatar;
  } else {
    const pId = currentUser.playerId || (userMatch ? userMatch.playerId : null);
    if (pId) {
      const player = (appState.players || []).find(p => p.id === pId);
      if (player && player.avatar) avatarUrl = player.avatar;
    }
  }

  if (headerAvatar) headerAvatar.src = avatarUrl;
  if (homeAvatar) homeAvatar.src = avatarUrl;
  if (headerName) headerName.textContent = displayName;
  if (homeName) homeName.textContent = displayName;
}

function triggerAvatarUpload(playerId) {
  activePlayerIdForAvatar = playerId;
  const fileInput = document.getElementById("player-avatar-file-input");
  if (fileInput) fileInput.click();
}

function initPlayerAvatarUploadListener() {
  const fileInput = document.getElementById("player-avatar-file-input");
  if (!fileInput) return;

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || !activePlayerIdForAvatar) return;

    compressAndResizeImage(file, 400, 400, 0.85, (dataUrl) => {
      const player = appState.players.find(p => p.id === activePlayerIdForAvatar);
      if (player) {
        player.avatar = dataUrl;
        
        // Sincronizar también con usuario si coincide
        const userMatch = appState.users.find(u => u.playerId === player.id);
        if (userMatch) userMatch.avatar = dataUrl;

        saveAppData(appState);
        renderRoster();
        renderNavUserProfile();
        showToast(`¡Foto de ${player.name} actualizada con éxito!`);

        const modal = document.getElementById("modal-player-detail");
        if (modal && modal.classList.contains("active")) {
          openPlayerDetail(player.id);
        }
      }
    });
  });
}

function showView(viewId) {
  const allViews = document.querySelectorAll(".page-view");
  const moduleNav = document.getElementById("module-header-nav");
  const portalWrapper = document.querySelector(".app-portal-wrapper");

  allViews.forEach(v => v.classList.remove("active"));
  if (moduleNav) moduleNav.style.display = "none";

  if (viewId === "view-login") {
    if (portalWrapper) portalWrapper.style.display = "none";
    const loginView = document.getElementById("view-login");
    if (loginView) {
      loginView.style.display = "block";
      loginView.classList.add("active");
    }
  } else {
    if (portalWrapper) portalWrapper.style.display = "block";
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   NAVEGACIÓN PRINCIPAL DEL PORTAL DE LAS 6 ISLAS
   ========================================================================== */
function openModule(moduleName) {
  const coachOnlyModules = new Set(["users", "stats", "fitness", "coach-attendance"]);
  if (coachOnlyModules.has(moduleName) && !isCoachUser()) {
    showToast("Este módulo es privado del cuerpo técnico.", "error");
    return;
  }
  const homePortal = document.getElementById("view-home-portal");
  const loginView = document.getElementById("view-login");
  const moduleNav = document.getElementById("module-header-nav");
  const allViews = document.querySelectorAll(".page-view");
  const miniItems = document.querySelectorAll(".mini-item");

  if (loginView) loginView.classList.remove("active");

  if (moduleName === "home-portal" || moduleName === "home") {
    allViews.forEach(v => v.classList.remove("active"));
    if (homePortal) homePortal.classList.add("active");
    if (moduleNav) moduleNav.style.display = "none";
    try { renderHomePortalRSVP(); } catch(e){}
    try { renderHomeDashboard(); } catch(e){}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (homePortal) homePortal.classList.remove("active");
  if (moduleNav) moduleNav.style.display = "flex";

  allViews.forEach(v => v.classList.remove("active"));
  miniItems.forEach(i => i.classList.remove("active"));

  const targetView = document.getElementById(`view-${moduleName}`);
  const targetMini = document.getElementById(`mini-${moduleName}`);

  if (targetView) targetView.classList.add("active");
  if (targetMini) targetMini.classList.add("active");

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (moduleName === "calendar") {
    renderGoogleCalendar();
  } else if (moduleName === "wellness") {
    renderWellness();
    setTimeout(() => {
      try { renderWellnessCharts(); } catch(e){}
    }, 150);
  } else if (moduleName === "stats") {
    setTimeout(renderStats, 100);
  } else if (moduleName === "roster") {
    renderRoster();
  } else if (moduleName === "tactics") {
    renderTactics();
  } else if (moduleName === "competition") {
    renderCompetition();
  } else if (moduleName === "fitness") {
    renderFitnessModule();
  } else if (moduleName === "users") {
    renderUsers();
  } else if (moduleName === "coach-attendance") {
    renderCoachAttendanceList();
  } else if (moduleName === "goals") {
    renderWeeklyGoals();
  }

  if (window.lucide) lucide.createIcons();
}

window.openModule = openModule;
window.showView = showView;

function updateTeamHeaderInfo() {
  const info = appState.teamInfo || {};
  const teamName = info.name || "CV BUNYOLA";
  const category = info.category || "Cadete Femenino 1ª División";
  const season = info.season || "2026 - 2027";

  const homeTitle = document.getElementById("home-team-name");
  const homeCat = document.getElementById("home-team-category");
  const loginTitle = document.getElementById("login-team-name");
  const loginCat = document.getElementById("login-team-category");

  if (homeTitle) homeTitle.textContent = teamName;
  if (homeCat) homeCat.textContent = `${category} • Temporada ${season}`;
  if (loginTitle) loginTitle.textContent = teamName;
  if (loginCat) loginCat.textContent = `${category} • Temporada ${season}`;

  if (info.customLogo) {
    const logoImg = document.getElementById("home-team-logo");
    const loginLogoImg = document.getElementById("login-team-logo");
    if (logoImg) logoImg.src = info.customLogo;
    if (loginLogoImg) loginLogoImg.src = info.customLogo;
  }

  if (window.lucide) lucide.createIcons();
}

function applyCustomBg(bgDataUrl) {
  if (bgDataUrl) {
    document.documentElement.style.setProperty('--hero-bg-image', `url('${bgDataUrl}')`);
  }
}

function initBgUploadListener() {
  const fileInput = document.getElementById("bg-file-upload");
  const statusMsg = document.getElementById("bg-upload-status");

  if (!fileInput) return;

  fileInput.addEventListener("change", (e) => {
    if (!isCoachUser()) {
      showToast("Solo el perfil de entrenador/administrador puede cambiar el banner.");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (statusMsg) statusMsg.textContent = "Por favor, selecciona una imagen válida.";
      return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      const dataUrl = event.target.result;
      applyCustomBg(dataUrl);
      appState.teamInfo.customBg = dataUrl;
      saveAppData(appState);
      if (statusMsg) statusMsg.textContent = "¡Foto de fondo actualizada con éxito!";
      showToast("Foto de fondo actualizada");
    };
    reader.readAsDataURL(file);
  });
}

function initLogoUploadListener() {
  const logoInput = document.getElementById("logo-file-upload");
  const statusMsg = document.getElementById("logo-upload-status");

  if (!logoInput) return;

  logoInput.addEventListener("change", (e) => {
    if (!isCoachUser()) {
      showToast("Solo el perfil de entrenador/administrador puede cambiar el escudo.");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (statusMsg) statusMsg.textContent = "Por favor, selecciona una imagen válida.";
      return;
    }

    compressAndResizeImage(file, 300, 300, 0.85, (dataUrl) => {
      const logoImg = document.getElementById("home-team-logo");
      const loginLogoImg = document.getElementById("login-team-logo");
      if (logoImg) logoImg.src = dataUrl;
      if (loginLogoImg) loginLogoImg.src = dataUrl;

      appState.teamInfo.customLogo = dataUrl;

      // Sincronizar también en la tabla de clasificación
      if (appState.leagueTable) {
        const ownTeam = appState.leagueTable.find(t => t.isOwn);
        if (ownTeam) ownTeam.logo = dataUrl;
      }

      saveAppData(appState);
      if (statusMsg) statusMsg.textContent = "¡Escudo del club actualizado con éxito!";
      showToast("Escudo del club actualizado");
    });
  });
}

/* ==========================================================================
   1. GOOGLE CALENDAR DE 12 MESES
   ========================================================================== */
function renderGoogleCalendar() {
  const grid = document.getElementById("gcal-month-grid");
  const title = document.getElementById("gcal-month-title");
  const monthSelect = document.getElementById("gcal-select-month");

  if (!grid || !title || !monthSelect) return;

  grid.innerHTML = "";
  title.textContent = `${MONTH_NAMES[currentCalendarMonth]} ${currentCalendarYear}`;
  monthSelect.value = currentCalendarMonth;

  const firstDayObj = new Date(currentCalendarYear, currentCalendarMonth, 1);
  let startingDay = firstDayObj.getDay(); 
  startingDay = startingDay === 0 ? 6 : startingDay - 1;

  const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();

  const today = new Date();
  const isCurrentMonthReal = today.getFullYear() === currentCalendarYear && today.getMonth() === currentCalendarMonth;
  const todayDateNum = today.getDate();

  for (let i = startingDay - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement("div");
    cell.className = "gcal-day-cell other-month";
    cell.innerHTML = `
      <div class="gcal-day-header">
        <span class="gcal-day-number">${dayNum}</span>
      </div>
    `;
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    const isToday = isCurrentMonthReal && day === todayDateNum;
    cell.className = `gcal-day-cell ${isToday ? 'is-today' : ''}`;

    const formattedDate = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    cell.innerHTML = `
      <div class="gcal-day-header">
        <span class="gcal-day-number">${day}</span>
      </div>
      <div class="gcal-events-list" id="events-date-${formattedDate}"></div>
    `;

    cell.addEventListener("click", (e) => {
      if (e.target.closest(".gcal-event-chip")) return;
      if (isCoachUser()) openAddEventModalForDate(formattedDate);
    });

    grid.appendChild(cell);

    const dateEvents = appState.events.filter(evt => evt.date === formattedDate);
    const eventsContainer = cell.querySelector(`#events-date-${formattedDate}`);

    if (eventsContainer && dateEvents.length > 0) {
      dateEvents.forEach(evt => {
        const chip = document.createElement("div");
        const isMatch = evt.type === "Partido";
        const isTournament = evt.type === "Torneo";

        let chipClass = "chip-training";
        let icon = "🏋️";

        if (isMatch) {
          chipClass = "chip-match";
          icon = "🏐";
        } else if (isTournament) {
          chipClass = "chip-tournament";
          icon = "🏆";
        } else if (evt.title.toLowerCase().includes("pesas")) {
          icon = "🏋️";
        } else if (evt.title.toLowerCase().includes("entreno") || evt.title.toLowerCase().includes("voleibol")) {
          icon = "🏐";
        }

        chip.className = `gcal-event-chip ${chipClass}`;

        let logosHTML = "";
        const isMatchOrVs = isMatch || isTournament || evt.title.includes(" vs ");
        if (isMatchOrVs) {
          const matchLogos = getMatchLogosData(evt);
          if (matchLogos && matchLogos.team1 && matchLogos.team2) {
            logosHTML = `
              <span class="gcal-chip-logos" title="${matchLogos.team1.name} vs ${matchLogos.team2.name}">
                <img src="${matchLogos.team1.logo}" class="gcal-mini-logo" alt="${matchLogos.team1.name}">
                <img src="${matchLogos.team2.logo}" class="gcal-mini-logo" alt="${matchLogos.team2.name}">
              </span>
            `;
          }
        }

        const cleanTitle = evt.title.replace(/^[🏋️🏐🏆]\s*/, '');
        chip.innerHTML = `
          ${logosHTML}
          <span style="font-size: 0.68rem; font-weight: 800; opacity: 0.95; flex-shrink: 0; margin-right: 0.2rem;">${evt.time}</span> 
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cleanTitle}</span>
        `;

        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          openEventDetailModal(evt.id);
        });

        eventsContainer.appendChild(chip);
      });
    }
  }

  const totalCells = startingDay + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const cell = document.createElement("div");
    cell.className = "gcal-day-cell other-month";
    cell.innerHTML = `
      <div class="gcal-day-header">
        <span class="gcal-day-number">${i}</span>
      </div>
    `;
    grid.appendChild(cell);
  }

  // ==========================================
  // MOBILE AGENDA VIEW RENDER
  // ==========================================
  const agendaContainer = document.getElementById("gcal-agenda-view");
  if (agendaContainer) {
    agendaContainer.innerHTML = "";
    
    const monthEvents = appState.events.filter(evt => {
      const [y, m, d] = evt.date.split("-");
      return parseInt(y) === currentCalendarYear && parseInt(m) - 1 === currentCalendarMonth;
    });

    monthEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    if (monthEvents.length === 0) {
      agendaContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: #94a3b8; font-weight: 500;">No hay eventos este mes.</div>`;
    } else {
      monthEvents.forEach(evt => {
        const isMatch = evt.type === "Partido" || evt.type === "Torneo" || evt.title.includes(" vs ");
        const cardClass = isMatch ? "match-card" : "training-card";
        const icon = isMatch ? "🏐" : "🏋️";
        
        let logosHTML = "";
        if (isMatch) {
          const matchLogos = getMatchLogosData(evt);
          if (matchLogos && matchLogos.team1 && matchLogos.team2) {
            logosHTML = `
              <div class="agenda-logos">
                <img src="${matchLogos.team1.logo}" class="agenda-logo-img" alt="${matchLogos.team1.name}">
                <span class="agenda-vs">VS</span>
                <img src="${matchLogos.team2.logo}" class="agenda-logo-img" alt="${matchLogos.team2.name}">
              </div>
            `;
          }
        }
        
        const [y, m, d] = evt.date.split("-");
        const dateObj = new Date(y, m - 1, d);
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
        const dayNum = dateObj.getDate();
        const displayDate = `${dayName.toUpperCase()}, ${dayNum}`;

        const cleanTitle = evt.title.replace(/^[🏋️🏐🏆]\s*/, '');
        
        const card = document.createElement("div");
        card.className = `agenda-card ${cardClass}`;
        card.innerHTML = `
          <div class="agenda-header">
            <span class="agenda-date">${displayDate}</span>
            <span class="agenda-time"><i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${evt.time}</span>
          </div>
          <div class="agenda-body">
            ${logosHTML}
            <div>
              <div class="agenda-title">${icon} ${cleanTitle}</div>
              ${evt.location ? `<div class="agenda-desc"><i data-lucide="map-pin" style="width:12px; height:12px; display:inline-block;"></i> ${evt.location}</div>` : ''}
            </div>
          </div>
        `;
        
        card.addEventListener("click", () => openEventDetailModal(evt.id));
        agendaContainer.appendChild(card);
      });
    }
  }

  if (window.lucide) lucide.createIcons();
}

function initGoogleCalendarListeners() {
  document.getElementById("gcal-btn-prev")?.addEventListener("click", () => {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
      currentCalendarMonth = 11;
      currentCalendarYear--;
    }
    renderGoogleCalendar();
  });

  document.getElementById("gcal-btn-next")?.addEventListener("click", () => {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
      currentCalendarMonth = 0;
      currentCalendarYear++;
    }
    renderGoogleCalendar();
  });

  document.getElementById("gcal-btn-today")?.addEventListener("click", () => {
    const now = new Date();
    currentCalendarYear = now.getFullYear();
    currentCalendarMonth = now.getMonth();
    renderGoogleCalendar();
  });

  document.getElementById("gcal-select-month")?.addEventListener("change", (e) => {
    currentCalendarMonth = parseInt(e.target.value);
    renderGoogleCalendar();
  });
}

function openAddEventModalForDate(dateStr) {
  if (!isCoachUser()) return;
  document.getElementById("form-event").reset();
  document.getElementById("modal-event-form-title").textContent = "Agendar Nuevo Evento";
  document.getElementById("event-date-input").value = dateStr;
  document.getElementById("modal-add-event").classList.add("active");
}

function getMatchLogosData(evt) {
  const ownLogo = (appState.teamInfo && appState.teamInfo.customLogo) ? appState.teamInfo.customLogo : "assets/club_logo.png";
  const ownName = (appState.teamInfo && appState.teamInfo.name) ? appState.teamInfo.name : "CV BUNYOLA";

  let title = evt.title || "";
  let opponentName = "Rival";
  let isHome = true;

  if (title.includes(" vs ")) {
    const parts = title.split(" vs ");
    const team1NameRaw = parts[0].replace(/^[🏋️🏐🏆]\s*/, '').trim();
    const team2NameRaw = parts[1].trim();

    if (team1NameRaw.toLowerCase().includes("bunyola")) {
      isHome = true;
      opponentName = team2NameRaw;
    } else {
      isHome = false;
      opponentName = team1NameRaw;
    }
  } else if (evt.location && evt.location.toLowerCase().includes("bunyola")) {
    isHome = true;
  } else {
    isHome = false;
  }

  const opponentMatch = (appState.leagueTable || []).find(t => t.name.toLowerCase().trim() === opponentName.toLowerCase().trim());
  const opponentLogo = (opponentMatch && opponentMatch.logo && opponentMatch.logo !== "assets/default_avatar.svg") 
    ? opponentMatch.logo 
    : "assets/default_avatar.svg";

  let team1 = { name: ownName, logo: ownLogo, condition: "🏠 Local (Casa)" };
  let team2 = { name: opponentName, logo: opponentLogo, condition: "✈️ Visitante (Fuera)" };

  if (!isHome) {
    team1 = { name: opponentName, logo: opponentLogo, condition: "🏠 Local (Casa)" };
    team2 = { name: ownName, logo: ownLogo, condition: "✈️ Visitante (Fuera)" };
  }

  return { team1, team2, isHome };
}

/* ==========================================================================
   MODAL DE VER / EDITAR / ELIMINAR EVENTO
   ========================================================================== */
function openEventDetailModal(eventId) {
  const evt = appState.events.find(e => e.id === eventId);
  if (!evt) return;

  const isCoach = isCoachUser();
  const modal = document.getElementById("modal-event-detail");
  const title = document.getElementById("event-detail-title");
  const body = document.getElementById("event-detail-body");

  title.textContent = evt.title;
  const isMatch = evt.type === "Partido";
  const isTournament = evt.type === "Torneo";
  const isMatchOrTournament = isMatch || isTournament || evt.title.includes(" vs ");
  const matchLogos = isMatchOrTournament ? getMatchLogosData(evt) : null;

  body.innerHTML = `
    ${matchLogos ? `
      <div style="background: rgba(15, 23, 42, 0.85); padding: 1.25rem; border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-around; gap: 1rem;">
          <div style="flex: 1; text-align: center;">
            <img src="${matchLogos.team1.logo}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid #fbbf24; background: #fff; padding: 2px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #f8fafc; margin-top: 0.4rem;">${matchLogos.team1.name}</div>
            <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">${matchLogos.team1.condition}</span>
          </div>
          <div style="font-weight: 900; font-size: 1.5rem; color: #fbbf24; font-style: italic;">VS</div>
          <div style="flex: 1; text-align: center;">
            <img src="${matchLogos.team2.logo}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid #fbbf24; background: #fff; padding: 2px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #f8fafc; margin-top: 0.4rem;">${matchLogos.team2.name}</div>
            <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">${matchLogos.team2.condition}</span>
          </div>
        </div>
      </div>
    ` : ''}

    <div style="background: #f8fafc; padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
        <span class="badge ${isTournament ? 'badge-gold' : (isMatch ? 'badge-purple' : 'badge-cyan')}" style="font-size: 0.9rem;">${evt.type}</span>
        <span style="font-size: 0.85rem; color: var(--text-muted);"><i data-lucide="calendar" style="width:14px; vertical-align:middle;"></i> ${evt.date} • <i data-lucide="clock" style="width:14px; vertical-align:middle;"></i> ${evt.time}</span>
      </div>
      <p style="font-size: 0.95rem; color: #0f172a; margin-bottom: 0.5rem;"><i data-lucide="map-pin" style="width:16px; color: #d97706; vertical-align:middle;"></i> <strong>Ubicación:</strong> ${evt.location}</p>
      ${evt.plan ? `
        <div style="margin-top: 1rem; background: #ffffff; padding: 0.85rem; border-radius: 8px; border-left: 3px solid #fbbf24;">
          <h4 style="font-size: 0.85rem; color: #d97706; margin-bottom: 0.3rem;">Plan Táctico / Objetivos:</h4>
          <p style="font-size: 0.85rem; color: #334155; white-space: pre-line;">${evt.plan}</p>
        </div>
      ` : ''}
    </div>

    <div style="display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
      ${isCoach ? `
        <button class="btn btn-danger btn-sm" onclick="deleteEvent('${evt.id}')">
          <i data-lucide="trash-2"></i> Eliminar Evento
        </button>
      ` : '<div></div>'}

      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        ${(evt.type === 'Entrenamiento' && isCoach) ? `
          <button class="btn btn-primary btn-sm" style="background: #10b981; border: none; font-weight: 700;" onclick="openVerifyAttendanceModal('${evt.id}')">
            <i data-lucide="clipboard-check"></i> 📋 Pasar Lista / Validar Asistencia
          </button>
        ` : ''}
        ${isMatch ? `
          <button class="btn btn-purple btn-sm" onclick="openConvocatoriaModal('${evt.id}')">
            <i data-lucide="message-square"></i> WhatsApp Convocatoria
          </button>
        ` : ''}
        ${isCoach ? `
          <button class="btn btn-primary btn-sm" onclick="editEventFromModal('${evt.id}')">
            <i data-lucide="edit"></i> Editar Evento
          </button>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.add("active");
  if (window.lucide) lucide.createIcons();
}

function deleteEvent(eventId) {
  if (!isCoachUser()) return;
  if (confirm("¿Estás seguro de que deseas eliminar este evento del calendario?")) {
    appState.events = appState.events.filter(e => e.id !== eventId);
    saveAppData(appState);
    renderGoogleCalendar();
    renderTraining();
    renderStats();
    document.getElementById("modal-event-detail").classList.remove("active");
    showToast("Evento eliminado correctamente");
  }
}

function editEventFromModal(eventId) {
  if (!isCoachUser()) return;
  const evt = appState.events.find(e => e.id === eventId);
  if (!evt) return;

  document.getElementById("modal-event-detail").classList.remove("active");

  document.getElementById("modal-event-form-title").textContent = "Editar Evento";
  document.getElementById("event-type-input").value = evt.type;
  document.getElementById("event-title-input").value = evt.title;
  document.getElementById("event-date-input").value = evt.date;
  document.getElementById("event-time-input").value = evt.time;
  document.getElementById("event-location-input").value = evt.location;
  document.getElementById("event-plan-input").value = evt.plan || "";

  document.getElementById("modal-add-event").classList.add("active");
}

/* ==========================================================================
   2. PLANTILLA (REJILLA DE 4 COLUMNAS & OPCIÓN DE CAMBIAR FOTO)
   ========================================================================== */
function renderRoster(filterPosition = "all") {
  const container = document.getElementById("roster-grid-container");
  if (!container) return;
  container.innerHTML = "";

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  let players = appState.players || [];

  if (isCoach && filterPosition !== "all") {
    const key = filterPosition.toLowerCase().split("-")[0];
    players = players.filter(p => p.position.toLowerCase().includes(key));
  }

  players.forEach(p => {
    const card = document.createElement("div");
    card.className = "player-card";
    
    card.addEventListener("click", () => {
      openPlayerDetail(p.id);
    });
    
    let statusClass = "badge-green";
    if (p.status === "Duda") statusClass = "badge-gold";
    if (p.status === "Lesionada") statusClass = "badge-red";

    const isOwnCard = currentUser.username.toLowerCase() === p.username.toLowerCase();

    if (isCoach) {
      card.innerHTML = `
        <div class="player-header">
          <span class="player-number" title="Haz clic para cambiar dorsal" onclick="event.stopPropagation(); promptChangeDorsal('${p.id}')">#${p.number} ✎</span>
          <span class="badge ${statusClass}">${p.status}</span>
          <div class="player-avatar-container" title="Cambiar foto de jugadora" onclick="event.stopPropagation(); triggerAvatarUpload('${p.id}')" style="cursor: pointer;">
            <img src="${p.avatar}" alt="${p.name}">
          </div>
        </div>
        <div class="player-body">
          <h4 class="player-name">${p.name}</h4>
          <p class="player-position">${p.position} • <strong style="color:#d97706;">${p.birthDate}</strong></p>
          <p style="font-size: 0.72rem; color: #64748b; margin-top: 0.1rem;">Usuario: <strong style="color:#0f172a;">${p.username}</strong></p>
          <div class="player-stats-mini">
            <div class="stat-item-mini">
              <h5>${p.height}</h5>
              <p>Altura</p>
            </div>
            <div class="stat-item-mini">
              <h5>${p.cmj || p.reachAtaque}</h5>
              <p>Salto CMJ</p>
            </div>
            <div class="stat-item-mini">
              <h5>${p.birthDate}</h5>
              <p>Año Nac.</p>
            </div>
          </div>
        </div>
        <div class="player-footer">
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openPlayerDetail('${p.id}')">
            <i data-lucide="eye" style="width:14px;"></i> Ver Info
          </button>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openEditPlayer('${p.id}')">
            <i data-lucide="edit-2" style="width:14px;"></i> Editar
          </button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="player-header">
          <span class="player-number">#${p.number}</span>
          <div class="player-avatar-container" ${isOwnCard ? `title="Haz clic para cambiar tu foto" onclick="event.stopPropagation(); triggerAvatarUpload('${p.id}')" style="cursor: pointer;"` : ''}>
            <img src="${p.avatar}" alt="${p.name}">
          </div>
        </div>
        <div class="player-body" style="text-align: center; padding: 1.25rem 0.5rem;">
          <h4 class="player-name" style="font-size: 1.2rem; font-weight: 800; color: #0f172a;">${p.name}</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">Jugadora del Equipo</p>
          ${isOwnCard ? `
            <button class="btn btn-outline btn-sm" style="margin-top: 0.75rem;" onclick="event.stopPropagation(); triggerAvatarUpload('${p.id}')">
              <i data-lucide="camera" style="width:13px;"></i> Cambiar Mi Foto
            </button>
          ` : `
            <p style="font-size: 0.75rem; color: #d97706; margin-top: 0.5rem; font-weight: 600;">👆 Ver ficha</p>
          `}
        </div>
      `;
    }

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function promptChangeDorsal(playerId) {
  if (!isCoachUser()) return;
  const p = appState.players.find(x => x.id === playerId);
  if (!p) return;

  const newNumStr = prompt(`Cambiar dorsal para ${p.name}:`, p.number);
  if (newNumStr === null) return;

  const newNum = parseInt(newNumStr);
  if (isNaN(newNum) || newNum < 1 || newNum > 99) {
    showToast("Dorsal inválido. Introduce un número del 1 al 99.");
    return;
  }

  p.number = newNum;
  saveAppData(appState);
  renderRoster();
  renderTactics();
  showToast(`Dorsal de ${p.name} actualizado a #${newNum}`);
}

document.querySelectorAll(".filter-btn[data-filter]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    if (!isCoachUser()) return;
    document.querySelectorAll(".filter-btn[data-filter]").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    renderRoster(e.target.getAttribute("data-filter"));
  });
});

function exportRosterCSV() {
  if (!isCoachUser()) return;
  const players = appState.players || [];
  let csvContent = "data:text/csv;charset=utf-8,Dorsal,Nombre,Usuario,Posicion,Altura,CMJ,AnoNacimiento\n";

  players.forEach(p => {
    const row = [
      p.number, `"${p.name}"`, `"${p.username}"`, `"${p.position}"`, `"${p.height}"`,
      `"${p.cmj || p.reachAtaque}"`, p.birthDate
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Plantilla_${appState.teamInfo.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Plantilla descargada en formato CSV");
}

function renderBorgMatrix() {
  const theadTr = document.getElementById("borg-matrix-thead-tr");
  const tbody = document.getElementById("borg-matrix-tbody");

  if (!theadTr || !tbody) return;

  const totalWeeks = 24;
  const weeks = [];
  const startMonday = new Date(2026, 7, 31); // Lunes 31 de Agosto de 2026 (Semana 1)

  for (let w = 1; w <= totalWeeks; w++) {
    const wMon = new Date(startMonday);
    wMon.setDate(startMonday.getDate() + (w - 1) * 7);
    const mStr = String(wMon.getDate()).padStart(2, '0');
    const mMonth = String(wMon.getMonth() + 1).padStart(2, '0');
    weeks.push({ weekNum: w, label: `Setmana ${w}`, dateStr: `${mStr}/${mMonth}` });
  }

  theadTr.innerHTML = `
    <th style="min-width: 140px; text-align: left;">Jugadora</th>
    <th style="min-width: 60px;">Dorsal</th>
    <th style="min-width: 120px; text-align: left;">Posición</th>
    ${weeks.map(w => `<th style="min-width: 105px; text-align: center;">${w.label}<br><span style="font-size:0.72rem; font-weight:normal; color:#94a3b8;">${w.dateStr}</span></th>`).join('')}
    <th style="min-width: 85px; text-align: center;">Promedio</th>
  `;

  tbody.innerHTML = "";

  let players = appState.players || [];
  if (!isCoachUser()) {
    const user = getCurrentUser();
    if (user.playerId) {
      players = players.filter(p => p.id === user.playerId);
    }
  }

  players.forEach(p => {
    const tr = document.createElement("tr");
    let playerRowScores = [];

    let cellsHTML = weeks.map(wObj => {
      const log = (appState.wellnessLogs || []).find(l => l.playerId === p.id && l.weekNum === wObj.weekNum);

      if (log && log.fatigue) {
        const score = Math.min(5, Math.max(1, parseInt(log.fatigue)));
        playerRowScores.push(score);

        let labelBorg = "1 - Descanso (Azul)";
        if (score === 2) labelBorg = "2 - Sin Fatiga / Fresca (Verde)";
        else if (score === 3) labelBorg = "3 - Moderada (Amarillo)";
        else if (score === 4) labelBorg = "4 - Alta (Naranja)";
        else if (score === 5) labelBorg = "5 - Máxima (Rojo)";

        return `
          <td>
            <div class="borg-cell borg-${score}" title="${p.name} - ${wObj.label}: ${labelBorg}" onclick="openBorgLogPrompt('${p.id}', '${p.name}', ${wObj.weekNum}, ${score})">
              <span>${score}</span>
            </div>
          </td>
        `;
      } else {
        return `
          <td>
            <div class="borg-cell borg-empty" title="Pulsar para registrar fatiga de ${p.name} en ${wObj.label}" onclick="openBorgLogPrompt('${p.id}', '${p.name}', ${wObj.weekNum}, null)">
              <span>-</span>
            </div>
          </td>
        `;
      }
    }).join('');

    const avgScore = playerRowScores.length > 0 ? (playerRowScores.reduce((a,b) => a+b, 0) / playerRowScores.length).toFixed(1) : "-";

    let avgClass = "borg-empty";
    if (avgScore !== "-") {
      const roundedAvg = Math.round(parseFloat(avgScore));
      avgClass = `borg-${roundedAvg}`;
    }

    tr.innerHTML = `
      <td style="font-weight: 800; color: #0f172a; padding: 0.5rem 0.75rem;">${p.name}</td>
      <td style="text-align: center; font-weight: 800; color: #d97706;"><span style="background:#fef3c7; padding:0.2rem 0.5rem; border-radius:6px;">#${p.number}</span></td>
      <td style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem;">${p.position}</td>
      ${cellsHTML}
      <td>
        <div class="borg-cell ${avgClass}" style="cursor: default;" title="Promedio de Fatiga de la Temporada">
          <span>${avgScore}</span>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function openBorgLogPrompt(playerId, playerName, weekNum, currentScore) {
  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();

  if (!isCoach && currentUser.playerId !== playerId) {
    showToast("Solo puedes registrar o modificar tu propio nivel de fatiga.");
    return;
  }

  openAddWellnessModal(playerId, weekNum);
}

function initBorgMatrixListeners() {
  // No requiere botones adicionales
}

/* ==========================================================================
   3. BIENESTAR Y CARGA (WELLNESS)
   ========================================================================== */
function getCurrentWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');

  return {
    weekKey: `${y}-W${m}-${d}`,
    mondayDate: monday,
    sundayDate: sunday,
    mondayStr: monday.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
    sundayStr: sunday.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  };
}

function getPlayerWeeklyStatus(playerId) {
  const weekInfo = getCurrentWeekKey();
  const logs = appState.wellnessLogs || [];

  const existingLog = logs.find(l => {
    if (l.playerId !== playerId) return false;
    if (l.weekKey === weekInfo.weekKey) return true;
    if (l.date) {
      const lDate = new Date(l.date);
      return lDate >= weekInfo.mondayDate && lDate <= weekInfo.sundayDate;
    }
    return false;
  });

  return {
    isContestada: !!existingLog,
    log: existingLog,
    weekInfo
  };
}

function renderWellness() {
  renderBorgMatrix();

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  const bannerContainer = document.getElementById("wellness-status-banner-container");

  const matrixTitleEl = document.getElementById("borg-matrix-header-title");

  if (!isCoach) {
    if (matrixTitleEl) matrixTitleEl.innerHTML = "📊 Mi Registro Semanal";
  } else {
    if (matrixTitleEl) matrixTitleEl.innerHTML = "📊 Registro Semanal del Equipo";
  }

  let targetPlayerId = null;
  if (currentUser && currentUser.playerId) {
    targetPlayerId = currentUser.playerId;
  } else if (appState.players && appState.players.length > 0) {
    targetPlayerId = appState.players[0].id;
  }

  const status = targetPlayerId ? getPlayerWeeklyStatus(targetPlayerId) : { isContestada: false, weekInfo: getCurrentWeekKey() };

  if (bannerContainer) {
    bannerContainer.innerHTML = `
      <div style="margin-bottom: 1.25rem; display: flex; justify-content: flex-start; align-items: center;">
        <button class="btn btn-primary" style="padding: 0.75rem 1.4rem; font-size: 0.95rem; font-weight: 700; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3); display: flex; align-items: center; gap: 0.6rem; cursor: pointer;" onclick="openAddWellnessModal('${targetPlayerId}')">
          <i data-lucide="heart-pulse" style="width: 20px; height: 20px;"></i>
          ¿Cómo me siento hoy?
        </button>
      </div>
    `;
  }

  const tbody = document.getElementById("wellness-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  let logs = appState.wellnessLogs || [];
  if (!isCoachUser()) {
    const user = getCurrentUser();
    if (user.playerId) {
      logs = logs.filter(l => l.playerId === user.playerId);
    }
  }

  logs.forEach(log => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #e2e8f0";
    
    let fatigueBadge = "badge-green";
    if (log.fatigue >= 4) fatigueBadge = "badge-red";
    else if (log.fatigue === 3) fatigueBadge = "badge-gold";

    tr.innerHTML = `
      <td style="padding: 0.75rem; color: var(--text-muted);">${log.date}</td>
      <td style="padding: 0.75rem; font-weight: 700; color: #0f172a;">${log.playerName}</td>
      <td style="padding: 0.75rem;"><span class="badge ${fatigueBadge}">${log.fatigue} / 5</span></td>
      <td style="padding: 0.75rem; color: var(--text-muted);">${log.notes || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWellnessCharts() {
  const ctxTrend = document.getElementById("chart-wellness-weekly")?.getContext("2d");
  if (!ctxTrend) return;

  if (window.activeChartTrend) window.activeChartTrend.destroy();

  const isCoach = isCoachUser();
  const user = getCurrentUser();
  
  let rpes = appState.trainingRPEs || [];
  if (!isCoach && user && user.playerId) {
    rpes = rpes.filter(r => r.playerId === user.playerId);
  }

  // Join with events to get dates
  let chartData = [];
  rpes.forEach(r => {
    const evt = appState.events.find(e => e.id === r.eventId);
    if (evt) {
      chartData.push({
        date: evt.date,
        rpeVal: r.rpeVal,
        title: evt.title
      });
    }
  });

  // Sort by date ascending
  chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

  let labels = [];
  let dataPoints = [];

  if (chartData.length === 0) {
    labels = ["-"];
    dataPoints = [0];
  } else {
    // Group by date to handle coach view (multiple players per date)
    const grouped = {};
    chartData.forEach(d => {
      if (!grouped[d.date]) grouped[d.date] = [];
      grouped[d.date].push(d.rpeVal);
    });

    Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b)).forEach(dateStr => {
      const parts = dateStr.split("-");
      labels.push(`${parts[2]}/${parts[1]}`);
      const vals = grouped[dateStr];
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      dataPoints.push(avg);
    });
  }

  window.activeChartTrend = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: isCoach ? 'Fatiga Media del Equipo (Borg 1-10)' : 'Mi Evolución de Fatiga (Borg 1-10)',
          data: dataPoints,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#334155', font: { weight: '600' } } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
        y: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' }, min: 0, max: 10 }
      }
    }
  });
}

/* ==========================================================================
   4. ENTRENAMIENTO
   ========================================================================== */
function renderTraining() {
  const container = document.getElementById("training-list-container");
  if (!container) return;
  container.innerHTML = "";

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  const trainings = appState.events.filter(e => e.type === "Entrenamiento");
  
  if (trainings.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">No hay sesiones de entrenamiento programadas.</p>`;
    return;
  }

  const confirmations = appState.trainingConfirmations || [];

  trainings.forEach(tr => {
    const card = document.createElement("div");
    card.className = "card";
    
    const eventConfirmations = confirmations.filter(c => c.eventId === tr.id);
    const yesConfirmations = eventConfirmations.filter(c => c.status === "yes");
    const noConfirmations = eventConfirmations.filter(c => c.status === "no");

    let playerConfirm = null;
    if (currentUser && currentUser.playerId) {
      playerConfirm = eventConfirmations.find(c => c.playerId === currentUser.playerId);
    }

    let rsvpSectionHTML = "";
    if (!isCoach) {
      if (playerConfirm) {
        if (playerConfirm.status === "yes") {
          rsvpSectionHTML = `
            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
              <span class="rsvp-badge-yes">✓ Has confirmado tu asistencia</span>
              <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; color: #ef4444;" onclick="confirmTrainingAttendance('${tr.id}', 'no')">No podré acudir</button>
            </div>
          `;
        } else {
          rsvpSectionHTML = `
            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
              <span class="rsvp-badge-no">✗ Has registrado que no acudirás</span>
              <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; color: #10b981;" onclick="confirmTrainingAttendance('${tr.id}', 'yes')">Cambiar a Sí asistiré</button>
            </div>
          `;
        }
      } else {
        rsvpSectionHTML = `
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">¿Acudirás a este entrenamiento?</span>
            <button type="button" class="btn-rsvp-yes" onclick="confirmTrainingAttendance('${tr.id}', 'yes')">
              <i data-lucide="check-circle-2" style="width: 16px; height: 16px;"></i> Sí, asistiré
            </button>
            <button type="button" class="btn-rsvp-no" onclick="confirmTrainingAttendance('${tr.id}', 'no')">
              <i data-lucide="x-circle" style="width: 16px; height: 16px;"></i> No podré acudir
            </button>
          </div>
        `;
      }
    } else {
      const yesNames = yesConfirmations.map(c => {
        const p = appState.players.find(x => x.id === c.playerId);
        return p ? p.name : 'Jugadora';
      }).join(', ');

      const noNames = noConfirmations.map(c => {
        const p = appState.players.find(x => x.id === c.playerId);
        return p ? p.name : 'Jugadora';
      }).join(', ');

      rsvpSectionHTML = `
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.4rem;">
            <div style="display: flex; gap: 1.25rem; align-items: center;">
              <strong style="color: #0f172a;">Confirmaciones:</strong>
              <span style="color: #059669; font-weight: 700;">🟢 ${yesConfirmations.length} Asistirán</span>
              <span style="color: #dc2626; font-weight: 700;">🔴 ${noConfirmations.length} Bajas</span>
            </div>
            <button type="button" class="btn btn-primary btn-sm" style="background: #10b981; border: none; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;" onclick="openVerifyAttendanceModal('${tr.id}')">
              <i data-lucide="clipboard-check" style="width: 16px; height: 16px;"></i> Pasar Lista / Validar Asistencia
            </button>
          </div>
          ${yesNames ? `<div style="color: #059669; font-size: 0.8rem; margin-top: 0.2rem;"><strong>Asistirán:</strong> ${yesNames}</div>` : ''}
          ${noNames ? `<div style="color: #dc2626; font-size: 0.8rem; margin-top: 0.2rem;"><strong>No acudirán:</strong> ${noNames}</div>` : ''}
        </div>
      `;
    }

    const currentRpe = tr.rpe !== undefined ? tr.rpe : 6;
    let rpeColor = "#eab308";
    let rpeLabelText = "Duro / Exigente";

    if (currentRpe <= 2) { rpeColor = "#10b981"; rpeLabelText = "Muy Suave / Reposo"; }
    else if (currentRpe <= 4) { rpeColor = "#0284c7"; rpeLabelText = "Moderado"; }
    else if (currentRpe <= 6) { rpeColor = "#f59e0b"; rpeLabelText = "Exigente / Duro"; }
    else if (currentRpe <= 8) { rpeColor = "#f97316"; rpeLabelText = "Muy Duro"; }
    else { rpeColor = "#ef4444"; rpeLabelText = "Esfuerzo Máximo"; }

    const rpeButtonsHTML = [0,1,2,3,4,5,6,7,8,9,10].map(n => `
      <button type="button" class="btn-rpe-level ${currentRpe === n ? 'active' : ''}" onclick="setTrainingRPE('${tr.id}', ${n})" title="Valorar Esfuerzo RPE ${n}/10">
        ${n}
      </button>
    `).join('');

    const rpeHTML = `
      <div style="margin-top: 0.85rem; background: #ffffff; padding: 0.85rem 1rem; border-radius: 12px; border: 1.5px solid #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span style="font-weight: 800; font-size: 0.88rem; color: #0f172a; display: flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="zap" style="color: ${rpeColor}; width: 18px; height: 18px;"></i> Carga RPE (Esfuerzo Percibido 0 - 10):
          </span>
          <span class="badge" style="background: ${rpeColor}; color: #ffffff; font-weight: 900; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.82rem;">
            RPE ${currentRpe} / 10 • ${rpeLabelText}
          </span>
        </div>
        <div class="rpe-selector-container">
          ${rpeButtonsHTML}
        </div>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.4rem; margin-bottom: 0; font-weight: 600;">
          💡 Pulsa un número del <strong>0 al 10</strong> para registrar la carga percibida de este entreno.
        </p>
      </div>
    `;

    card.innerHTML = `
      <div class="card-header">
        <h3><i data-lucide="dumbbell" style="color: #d97706"></i> ${tr.title}</h3>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">
        <i data-lucide="calendar" style="width:14px; vertical-align:middle;"></i> ${tr.date} • <i data-lucide="clock" style="width:14px; vertical-align:middle;"></i> ${tr.time} • <i data-lucide="map-pin" style="width:14px; vertical-align:middle;"></i> ${tr.location}
      </p>
      ${rpeHTML}
      <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 0.85rem;">
        <h4 style="font-size: 0.9rem; color: #d97706; margin-bottom: 0.5rem;">Plan de la Sesión:</h4>
        <p style="font-size: 0.85rem; color: #0f172a; white-space: pre-line; line-height: 1.6;">${tr.plan || 'Sin planificación especificada.'}</p>
      </div>
      ${tr.sessionImage ? `
        <div style="margin-top: 0.85rem;">
          <button type="button" class="btn btn-outline" style="width: 100%; padding: 0.75rem; font-weight: 700; color: #059669; border: 2px dashed #10b981; background: #ecfdf5; display: flex; align-items: center; justify-content: center; gap: 0.5rem;" onclick="openImageModal('${tr.sessionImage}')">
            <i data-lucide="file-text" style="width: 18px;"></i> Ver Archivo de Sesión (PDF / Pizarra)
          </button>
        </div>
      ` : ''}
      ${rsvpSectionHTML}
    `;
    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function openAddEventModalWithType(type) {
  if (!isCoachUser()) return;
  document.getElementById("form-event").reset();
  document.getElementById("modal-event-form-title").textContent = "Agendar Nuevo Evento";
  document.getElementById("event-type-input").value = type;
  document.getElementById("modal-add-event").classList.add("active");
}

/* ==========================================================================
   5. PLAN DE JUEGO (PIZARRA DE SCOUTING - 4 PISTAS)
   ========================================================================== */
function renderTactics() {
  if (!appState.scouting) {
    appState.scouting = {
      recZ5: "", recZ6: "", recZ1: "",
      attZ4: { linea: false, diag: false, corta: false },
      attZ2: { linea: false, diag: false, corta: false },
      attZ3: { z1: false, z5: false, finta: false },
      serveZones: { z1: false, z2: false, z3: false, z4: false, z5: false, z6: false }
    };
  }

  const s = appState.scouting;

  const rZ5 = document.getElementById("scout-rec-z5");
  const rZ6 = document.getElementById("scout-rec-z6");
  const rZ1 = document.getElementById("scout-rec-z1");
  if (rZ5) rZ5.value = s.recZ5;
  if (rZ6) rZ6.value = s.recZ6;
  if (rZ1) rZ1.value = s.recZ1;
  
  const cbZ4Linea = document.getElementById("scout-att-z4-linea");
  if (cbZ4Linea) cbZ4Linea.checked = s.attZ4.linea;
  const cbZ4Diag = document.getElementById("scout-att-z4-diag");
  if (cbZ4Diag) cbZ4Diag.checked = s.attZ4.diag;
  const cbZ4Corta = document.getElementById("scout-att-z4-corta");
  if (cbZ4Corta) cbZ4Corta.checked = s.attZ4.corta;

  const cbZ2Linea = document.getElementById("scout-att-z2-linea");
  if (cbZ2Linea) cbZ2Linea.checked = s.attZ2.linea;
  const cbZ2Diag = document.getElementById("scout-att-z2-diag");
  if (cbZ2Diag) cbZ2Diag.checked = s.attZ2.diag;
  const cbZ2Corta = document.getElementById("scout-att-z2-corta");
  if (cbZ2Corta) cbZ2Corta.checked = s.attZ2.corta;

  const cbZ3Z1 = document.getElementById("scout-att-z3-z1");
  if (cbZ3Z1) cbZ3Z1.checked = s.attZ3.z1;
  const cbZ3Z5 = document.getElementById("scout-att-z3-z5");
  if (cbZ3Z5) cbZ3Z5.checked = s.attZ3.z5;
  const cbZ3Finta = document.getElementById("scout-att-z3-finta");
  if (cbZ3Finta) cbZ3Finta.checked = s.attZ3.finta;

  document.querySelectorAll(".scout-serve-zone").forEach(el => {
    const zoneNum = el.getAttribute("data-zone");
    const isFrequent = s.serveZones[`z${zoneNum}`];
    if (isFrequent) {
      el.style.backgroundColor = "rgba(244, 63, 94, 0.6)"; 
      el.style.borderColor = "#f43f5e";
    } else {
      el.style.backgroundColor = "transparent";
      el.style.borderColor = "#475569";
    }
  });
}

window.saveScoutingData = function() {
  if (!isCoachUser()) {
    showToast("No tienes permisos para guardar esta información.");
    return;
  }
  const s = appState.scouting;
  if (!s) return;

  s.recZ5 = document.getElementById("scout-rec-z5")?.value || "";
  s.recZ6 = document.getElementById("scout-rec-z6")?.value || "";
  s.recZ1 = document.getElementById("scout-rec-z1")?.value || "";

  s.attZ4.linea = document.getElementById("scout-att-z4-linea")?.checked || false;
  s.attZ4.diag = document.getElementById("scout-att-z4-diag")?.checked || false;
  s.attZ4.corta = document.getElementById("scout-att-z4-corta")?.checked || false;

  s.attZ2.linea = document.getElementById("scout-att-z2-linea")?.checked || false;
  s.attZ2.diag = document.getElementById("scout-att-z2-diag")?.checked || false;
  s.attZ2.corta = document.getElementById("scout-att-z2-corta")?.checked || false;

  s.attZ3.z1 = document.getElementById("scout-att-z3-z1")?.checked || false;
  s.attZ3.z5 = document.getElementById("scout-att-z3-z5")?.checked || false;
  s.attZ3.finta = document.getElementById("scout-att-z3-finta")?.checked || false;

  saveAppData(appState);
  showToast("✅ Plan de Partido guardado correctamente.");
};

document.addEventListener("click", (e) => {
  const serveZone = e.target.closest(".scout-serve-zone");
  if (serveZone && isCoachUser()) {
    const zoneNum = serveZone.getAttribute("data-zone");
    if (appState.scouting) {
      appState.scouting.serveZones[`z${zoneNum}`] = !appState.scouting.serveZones[`z${zoneNum}`];
      renderTactics(); 
    }
  }
});

/* ==========================================================================
   6. ESTADÍSTICA DE PARTIDOS DE LIGA & GRÁFICOS GLOBALES (# + =)
   ========================================================================== */
function renderStats() {
  const container = document.getElementById("stats-matches-list");
  if (!container) return;
  container.innerHTML = "";

  const isCoach = isCoachUser();
  const matches = appState.events.filter(e => e.type === "Partido");
  matches.sort((a, b) => new Date(a.date) - new Date(b.date));

  const finishedMatches = matches.filter(m => m.status === "Finalizado" && m.stats);

  let totalRec = 0, totalRecError = 0, totalRecPerfect = 0;
  let totalAces = 0, totalBlocks = 0;
  let wins = 0, losses = 0;

  matches.forEach(m => {
    if (m.result) {
      if (m.result.includes("Victoria")) wins++;
      else if (m.result.includes("Derrot")) losses++;
    }
    if (m.stats) {
      totalRec += (m.stats.recTotal || 0);
      totalRecError += (m.stats.recError || 0);
      totalRecPerfect += (m.stats.recPerfect || 0);
      totalAces += (m.stats.aces || 0);
      totalBlocks += (m.stats.bloqueos || 0);
    }
  });

  const avgRecErrorPct = totalRec > 0 ? ((totalRecError / totalRec) * 100).toFixed(1) : "0.0";
  const avgRecPerfectPct = totalRec > 0 ? ((totalRecPerfect / totalRec) * 100).toFixed(1) : "0.0";

  const recErrorEl = document.getElementById("stats-avg-rec-error");
  const recPerfEl = document.getElementById("stats-avg-rec-perfect");
  const recordEl = document.getElementById("stats-record");
  const acesBlocksEl = document.getElementById("stats-total-aces-blocks");

  if (recErrorEl) recErrorEl.textContent = `${avgRecErrorPct}%`;
  if (recPerfEl) recPerfEl.textContent = `${avgRecPerfectPct}%`;
  if (recordEl) recordEl.textContent = `${wins}V - ${losses}D`;
  if (acesBlocksEl) acesBlocksEl.textContent = `${totalAces} Aces / ${totalBlocks} Bloq`;

  renderGlobalStatsCharts(finishedMatches);

  matches.forEach(m => {
    const card = document.createElement("div");
    card.className = "match-stat-card";

    const isFinished = m.status === "Finalizado";
    const st = m.stats;

    let recErrorPct = 0, recPerfPct = 0;
    if (st && st.recTotal > 0) {
      recErrorPct = Math.round((st.recError / st.recTotal) * 100);
      recPerfPct = Math.round((st.recPerfect / st.recTotal) * 100);
    }

    card.innerHTML = `
      <div class="match-stat-header">
        <div>
          <span class="match-round-badge">Jornada ${m.round || '?'}</span>
          <h4 class="match-stat-title" style="margin-top:0.3rem;">${m.title}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted);"><i data-lucide="calendar" style="width:13px; vertical-align:middle;"></i> ${m.date} • ${m.location}</p>
        </div>
        <span class="badge ${m.result && m.result.includes('Victoria') ? 'badge-green' : isFinished ? 'badge-red' : 'badge-cyan'}">
          ${m.result || m.status}
        </span>
      </div>

      <div class="match-stat-body">
        ${isFinished && st ? `
          <div class="match-metrics-row">
            <div class="metric-pill">
              <span class="lbl">% Error Recepción (=)</span>
              <span class="val ${recErrorPct <= 8 ? 'good' : 'bad'}">${recErrorPct}%</span>
            </div>
            <div class="metric-pill">
              <span class="lbl">% Recepción Perfecta (# +)</span>
              <span class="val ${recPerfPct >= 65 ? 'good' : ''}">${recPerfPct}%</span>
            </div>
          </div>

          <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted); display:flex; justify-content:space-between;">
            <span>Distribución de Recepción:</span>
            <span>${st.recPerfect} perfectas / ${st.recError} errores de ${st.recTotal}</span>
          </div>
          <div class="rec-progress-bar">
            <div class="rec-progress-fill perfect" style="width: ${recPerfPct}%"></div>
            <div class="rec-progress-fill error" style="width: ${recErrorPct}%"></div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 0.75rem; font-size: 0.75rem; text-align: center;">
            <div style="background: #f1f5f9; padding: 0.4rem; border-radius: 6px;">
              <strong style="color: #d97706;">${st.aces || 0}</strong> Aces / ${st.saquesError || 0} Errores
            </div>
            <div style="background: #f1f5f9; padding: 0.4rem; border-radius: 6px;">
              <strong style="color: #0284c7;">${st.ataquesPunto || 0}</strong> Pts Ataque
            </div>
            <div style="background: #f1f5f9; padding: 0.4rem; border-radius: 6px;">
              <strong style="color: #16a34a;">${st.bloqueos || 0}</strong> Bloqueos
            </div>
          </div>
        ` : `
          <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 0.75rem 0;">
            <i data-lucide="clock" style="width:16px; vertical-align:middle;"></i> Partido pendiente de disputar o añadir estadística.
          </p>
        `}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button class="btn btn-outline btn-sm" onclick="openConvocatoriaModal('${m.id}')">
          <i data-lucide="message-square"></i> WhatsApp
        </button>
        ${isCoach ? `
          <button class="btn btn-primary btn-sm" onclick="openMatchStatsModal('${m.id}')">
            <i data-lucide="edit-3"></i> ${st ? 'Editar Estadística' : '+ Añadir Estadística'}
          </button>
        ` : ''}
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function renderGlobalStatsCharts(finishedMatches) {
  const ctxError = document.getElementById("chart-global-reception-error")?.getContext("2d");
  const ctxPerfect = document.getElementById("chart-global-reception-perfect")?.getContext("2d");

  if (!ctxError || !ctxPerfect) return;

  if (activeChartGlobalRecError) activeChartGlobalRecError.destroy();
  if (activeChartGlobalRecPerfect) activeChartGlobalRecPerfect.destroy();

  const labels = finishedMatches.map(m => `J${m.round || '?'}`);
  const errorData = finishedMatches.map(m => {
    if (!m.stats || !m.stats.recTotal) return 0;
    return parseFloat(((m.stats.recError / m.stats.recTotal) * 100).toFixed(1));
  });

  const perfectData = finishedMatches.map(m => {
    if (!m.stats || !m.stats.recTotal) return 0;
    return parseFloat(((m.stats.recPerfect / m.stats.recTotal) * 100).toFixed(1));
  });

  activeChartGlobalRecError = new Chart(ctxError, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '% Error de Recepción (=)',
        data: errorData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#ef4444',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#334155', font: { weight: '700' } } }
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
        y: { ticks: { color: '#64748b', callback: (val) => `${val}%` }, grid: { color: '#e2e8f0' }, min: 0, max: 25 }
      }
    }
  });

  activeChartGlobalRecPerfect = new Chart(ctxPerfect, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '% Recepción Perfecta (# +)',
        data: perfectData,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#16a34a',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#334155', font: { weight: '700' } } }
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
        y: { ticks: { color: '#64748b', callback: (val) => `${val}%` }, grid: { color: '#e2e8f0' }, min: 30, max: 90 }
      }
    }
  });
}

function openMatchStatsModal(matchId) {
  if (!isCoachUser()) return;
  const match = appState.events.find(e => e.id === matchId);
  if (!match) return;

  document.getElementById("match-stats-id-input").value = match.id;
  document.getElementById("modal-match-stats-title").textContent = `Estadísticas: ${match.title}`;

  const st = match.stats || {};
  document.getElementById("stats-rec-total").value = st.recTotal || "";
  document.getElementById("stats-rec-perfect").value = st.recPerfect || "";
  document.getElementById("stats-rec-error").value = st.recError || "";
  document.getElementById("stats-saques-total").value = st.saquesTotal || "";
  document.getElementById("stats-aces").value = st.aces || "";
  document.getElementById("stats-saques-error").value = st.saquesError || "";
  document.getElementById("stats-ataques-total").value = st.ataquesTotal || "";
  document.getElementById("stats-ataques-punto").value = st.ataquesPunto || "";
  document.getElementById("stats-ataques-error").value = st.ataquesError || "";
  document.getElementById("stats-bloqueos").value = st.bloqueos || "";

  document.getElementById("modal-edit-match-stats").classList.add("active");
}

function initMatchStatsFormListener() {
  const form = document.getElementById("form-match-stats");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isCoachUser()) return;

    const matchId = document.getElementById("match-stats-id-input").value;
    const match = appState.events.find(e => e.id === matchId);
    if (!match) return;

    const statsObj = {
      recTotal: parseInt(document.getElementById("stats-rec-total").value) || 0,
      recPerfect: parseInt(document.getElementById("stats-rec-perfect").value) || 0,
      recError: parseInt(document.getElementById("stats-rec-error").value) || 0,
      saquesTotal: parseInt(document.getElementById("stats-saques-total").value) || 0,
      aces: parseInt(document.getElementById("stats-aces").value) || 0,
      saquesError: parseInt(document.getElementById("stats-saques-error").value) || 0,
      ataquesTotal: parseInt(document.getElementById("stats-ataques-total").value) || 0,
      ataquesPunto: parseInt(document.getElementById("stats-ataques-punto").value) || 0,
      ataquesError: parseInt(document.getElementById("stats-ataques-error").value) || 0,
      bloqueos: parseInt(document.getElementById("stats-bloqueos").value) || 0
    };

    match.stats = statsObj;
    match.status = "Finalizado";

    saveAppData(appState);
    renderStats();
    showToast("Estadística de partido guardada correctamente");
    document.getElementById("modal-edit-match-stats").classList.remove("active");
  });
}

function openConvocatoriaModal(eventId) {
  const evt = appState.events.find(e => e.id === eventId) || appState.events[0];
  const team = appState.teamInfo;
  const availablePlayers = appState.players.filter(p => p.status !== "Lesionada");

  let text = `🏐 *CONVOCATORIA OFICIAL - ${team.name.toUpperCase()}*\n`;
  text += `🏆 ${team.category} (${team.season})\n\n`;
  text += `📌 *Evento:* ${evt.title}\n`;
  text += `📅 *Fecha:* ${evt.date}\n`;
  text += `⏰ *Hora:* ${evt.time}\n`;
  text += `📍 *Lugar:* ${evt.location}\n\n`;
  text += `📋 *JUGADORAS CONVOCADAS (${availablePlayers.length}):*\n`;

  availablePlayers.forEach((p, idx) => {
    text += `${idx + 1}. #${p.number} ${p.name}\n`;
  });

  text += `\n💬 *INDICACIONES DEL ENTRENADOR:*\n`;
  text += `${evt.plan || 'Puntualidad en el pabellón 45 minutos antes. Equipación oficial de partido.'}\n\n`;
  text += `¡A por la victoria! 💪🏐🔥`;

  document.getElementById("convocatoria-modal-title").textContent = `Convocatoria: ${evt.title}`;
  document.getElementById("whatsapp-text-box").textContent = text;
  document.getElementById("modal-convocatoria").classList.add("active");
}

function copyWhatsappText() {
  const text = document.getElementById("whatsapp-text-box").textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Texto copiado al portapapeles. ¡Listo para enviar!");
  }).catch(() => {
    showToast("Texto preparado en la caja.");
  });
}

function printConvocatoria() { window.print(); }

function initExportAndSettings() {
  document.getElementById("btn-export-csv")?.addEventListener("click", exportRosterCSV);

  document.getElementById("btn-club-settings")?.addEventListener("click", () => {
    if (!isCoachUser()) return;
    const info = appState.teamInfo || {};
    document.getElementById("club-name-input").value = info.name || "CV BUNYOLA";
    document.getElementById("club-category-input").value = info.category || "Cadete Femenino 1ª División";
    document.getElementById("club-season-input").value = info.season || "2026 - 2027";
    document.getElementById("club-coach-input").value = info.coach || "Entrenador Principal";

    document.getElementById("modal-club-settings").classList.add("active");
  });

  document.getElementById("form-club-settings")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isCoachUser()) return;

    const name = document.getElementById("club-name-input").value;
    const category = document.getElementById("club-category-input").value;
    const season = document.getElementById("club-season-input").value;
    const coach = document.getElementById("club-coach-input").value;

    appState.teamInfo = { ...appState.teamInfo, name, category, season, coach };
    saveAppData(appState);
    updateTeamHeaderInfo();

    document.getElementById("modal-club-settings").classList.remove("active");
    showToast("Ajustes del club guardados con éxito");
  });
}

function initModalListeners() {
  document.querySelectorAll(".modal-close, .modal-close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
    });
  });

  document.getElementById("btn-add-player")?.addEventListener("click", () => {
    if (!isCoachUser()) return;
    document.getElementById("modal-form-player-title").textContent = "Añadir Nueva Jugadora";
    document.getElementById("form-player").reset();
    document.getElementById("player-id-input").value = "";
    document.getElementById("modal-add-player").classList.add("active");
  });

  document.getElementById("btn-add-event")?.addEventListener("click", () => {
    if (!isCoachUser()) return;
    document.getElementById("form-event").reset();
    document.getElementById("modal-event-form-title").textContent = "Agendar Nuevo Evento";
    document.getElementById("modal-add-event").classList.add("active");
  });

  document.getElementById("btn-add-wellness-view")?.addEventListener("click", () => openAddWellnessModal());
}

function openAddWellnessModal(targetPlayerId, targetWeekNum) {
  const select = document.getElementById("wellness-player-select");
  const modal = document.getElementById("modal-add-wellness");
  const lockMsgContainer = document.getElementById("wellness-modal-lock-msg");
  const submitBtn = document.getElementById("btn-submit-wellness");
  if (!select || !modal) return;

  select.innerHTML = "";
  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();

  if (!isCoach && currentUser.playerId) {
    const player = appState.players.find(p => p.id === currentUser.playerId);
    select.innerHTML = `<option value="${currentUser.playerId}">${player ? player.name : currentUser.name} (#${player ? player.number : ''})</option>`;
    select.value = currentUser.playerId;
    select.disabled = true;
  } else {
    appState.players.forEach(p => {
      const isSelected = targetPlayerId ? (targetPlayerId === p.id) : (currentUser.playerId === p.id);
      select.innerHTML += `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.name} (#${p.number})</option>`;
    });
    if (targetPlayerId) select.value = targetPlayerId;
    select.disabled = false;
  }

  const selectedPId = select.value;
  const status = getPlayerWeeklyStatus(selectedPId);
  const now = new Date();
  const currentDay = now.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié...
  const isMondayOrTuesday = currentDay === 1 || currentDay === 2;

  let isLockedForPlayer = false;
  let lockReasonHTML = "";
  let btnLabelText = "💾 Enviar Evaluación Semanal (Borg)";

  if (!isCoach) {
    if (status.isContestada) {
      isLockedForPlayer = true;
      lockReasonHTML = `
        <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 1rem; border-radius: 10px; color: #065f46; font-size: 0.85rem; font-weight: 600;">
          ✅ <strong>Evaluación Ya Contestada Esta Semana</strong><br>
          Ya has enviado tu registro de fatiga (Nivel Borg: <strong>${status.log.fatigue}/5</strong>). Tu respuesta está guardada y se volverá a habilitar el próximo Lunes.
        </div>
      `;
      btnLabelText = "✅ Evaluación Ya Enviada para Esta Semana";
    } else if (!isMondayOrTuesday) {
      isLockedForPlayer = true;
      lockReasonHTML = `
        <div style="background: #fffdf5; border: 1.5px solid #fbbf24; padding: 1rem; border-radius: 10px; color: #92400e; font-size: 0.85rem; font-weight: 600;">
          🗓️ <strong>Registro Disponible Lunes y Martes</strong><br>
          El estado de fatiga y bienestar debe completarse los <strong>Lunes antes del entrenamiento</strong> (hasta el <strong>Martes a las 23:59</strong>). El formulario volverá a abrirse el próximo Lunes.
        </div>
      `;
      btnLabelText = "🔒 Formulario Cerrado (Disponible Lunes y Martes)";
    }
  }

  if (lockMsgContainer) {
    if (isLockedForPlayer) {
      lockMsgContainer.style.display = "block";
      lockMsgContainer.innerHTML = lockReasonHTML;
    } else if (isCoach && status.isContestada) {
      lockMsgContainer.style.display = "block";
      lockMsgContainer.innerHTML = `
        <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 1rem; border-radius: 10px; color: #0369a1; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div>✅ Valoración ya completada (Nivel: ${status.log.fatigue}/5)</div>
          <button type="button" class="btn btn-sm" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.6rem;" onclick="deleteWellnessLog('${status.log.playerId}', ${status.log.weekNum})">Eliminar</button>
        </div>
      `;
    } else {
      lockMsgContainer.style.display = "none";
      lockMsgContainer.innerHTML = "";
    }
  }

  // Controles del formulario
  const fatigueSlider = document.getElementById("wellness-fatigue-slider");
  const notesInp = document.getElementById("wellness-notes");

  if (isLockedForPlayer) {
    if (fatigueSlider) fatigueSlider.disabled = true;
    if (notesInp) notesInp.disabled = true;
    document.querySelectorAll(".borg-btn-option").forEach(btn => btn.style.pointerEvents = "none");

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.5";
      submitBtn.style.cursor = "not-allowed";
      submitBtn.textContent = btnLabelText;
    }
  } else {
    if (fatigueSlider) fatigueSlider.disabled = false;
    if (notesInp) notesInp.disabled = false;
    document.querySelectorAll(".borg-btn-option").forEach(btn => btn.style.pointerEvents = "auto");

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";
      submitBtn.textContent = "💾 Enviar Evaluación Semanal (Borg)";
    }
  }

  const existingLog = status.log || (appState.wellnessLogs || []).find(l => l.playerId === selectedPId && l.weekNum === (targetWeekNum || 1));

  const initialFatigue = existingLog ? existingLog.fatigue : 2;
  updateBorgInteractiveUI(initialFatigue);

  if (existingLog) {
    if (document.getElementById("wellness-sleep-hours")) document.getElementById("wellness-sleep-hours").value = existingLog.sleepHours || 8;
    if (document.getElementById("wellness-sleep-qual")) document.getElementById("wellness-sleep-qual").value = existingLog.sleepQuality || 4;
    if (document.getElementById("wellness-notes")) document.getElementById("wellness-notes").value = existingLog.notes || "";
  } else {
    if (document.getElementById("wellness-sleep-hours")) document.getElementById("wellness-sleep-hours").value = 8;
    if (document.getElementById("wellness-sleep-qual")) document.getElementById("wellness-sleep-qual").value = 4;
    if (document.getElementById("wellness-notes")) document.getElementById("wellness-notes").value = "";
  }

  modal.classList.add("active");
}

function openPlayerDetail(playerId) {
  const p = appState.players.find(x => x.id === playerId);
  if (!p) return;

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  const isOwnCard = currentUser.username.toLowerCase() === p.username.toLowerCase();

  const modal = document.getElementById("modal-player-detail");
  const body = document.getElementById("modal-player-body");

  if (isCoach) {
    body.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem;">
        <div style="position: relative; cursor: pointer;" title="Cambiar foto de esta jugadora" onclick="triggerAvatarUpload('${p.id}')">
          <img src="${p.avatar}" alt="${p.name}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #fbbf24;">
          <span style="position: absolute; bottom: 0; right: 0; background: #d97706; color: #fff; padding: 4px; border-radius: 50%; font-size: 0.75rem;"><i data-lucide="camera" style="width:14px;"></i></span>
        </div>
        <div>
          <h2 style="font-family: var(--font-heading); color: #0f172a;">#${p.number} ${p.name}</h2>
          <p style="color: #d97706; font-weight: 700; font-size: 1.05rem;">${p.position}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Usuario de Acceso: <strong style="color:#0f172a;">${p.username}</strong></p>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Año de Nacimiento: <strong>${p.birthDate}</strong></p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div>
          <p style="font-size: 0.75rem; color: var(--text-muted); font-weight:700;">MEDIDAS & SALTO</p>
          <p style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 0.2rem;">Altura: ${p.height}</p>
          <p style="font-size: 0.95rem; font-weight: 700; color: #d97706; margin-top: 0.2rem;">CMJ (Salto): ${p.cmj || p.reachAtaque}</p>
        </div>
        <div>
          <p style="font-size: 0.75rem; color: var(--text-muted); font-weight:700;">ESTADÍSTICAS TEMPORADA</p>
          <p style="font-size: 0.9rem; font-weight: 600; color: #0f172a;">Partidos Jugados: ${p.stats?.matches || 0}</p>
          <p style="font-size: 0.9rem; font-weight: 600; color: #0f172a;">Aces: ${p.stats?.aces || 0}</p>
          <p style="font-size: 0.9rem; font-weight: 600; color: #0f172a;">Puntos Totales: ${p.stats?.puntosTotales || 0}</p>
        </div>
      </div>

      <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
        <h4 style="font-size: 0.9rem; color: #b45309; margin-bottom: 0.3rem;">Notas de Rendimiento:</h4>
        <p style="font-size: 0.85rem; color: #78350f;">${p.healthNote || 'Sin observaciones.'}</p>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 0.75rem;">
        <button class="btn btn-outline btn-sm" onclick="triggerAvatarUpload('${p.id}')">
          <i data-lucide="camera"></i> Cambiar Foto
        </button>
        <button class="btn btn-primary btn-sm" onclick="promptChangeDorsal('${p.id}'); document.getElementById('modal-player-detail').classList.remove('active');">
          <i data-lucide="hash"></i> Cambiar Dorsal
        </button>
        <button class="btn btn-sm" style="background: #ef4444; color: white; border: none; padding: 0.4rem 0.7rem;" onclick="deletePlayer('${p.id}')">
          <i data-lucide="trash-2" style="width: 14px;"></i> Eliminar
        </button>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1rem 0;">
        <div style="position: relative; cursor: pointer;" title="Cambiar mi foto" onclick="triggerAvatarUpload('${p.id}')">
          <img src="${p.avatar}" alt="${p.name}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #fbbf24; margin-bottom: 1rem;">
          ${isOwnCard ? `<span style="position: absolute; bottom: 10px; right: 0; background: #d97706; color: #fff; padding: 6px; border-radius: 50%;"><i data-lucide="camera" style="width:16px;"></i></span>` : ''}
        </div>
        <span style="font-size: 1.5rem; font-weight: 800; color: #d97706; background: #fef3c7; padding: 0.2rem 0.8rem; border-radius: 8px; margin-bottom: 0.5rem;">#${p.number}</span>
        <h2 style="font-family: var(--font-heading); color: #0f172a; font-size: 1.6rem; font-weight: 800;">${p.name}</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem;">Jugadora del Equipo</p>
        
        ${isOwnCard ? `
          <button class="btn btn-primary btn-sm" style="margin-top: 1.25rem;" onclick="triggerAvatarUpload('${p.id}')">
            <i data-lucide="camera"></i> Cambiar Mi Foto de Perfil
          </button>
        ` : ''}
      </div>
    `;
  }

  modal.classList.add("active");
  if (window.lucide) lucide.createIcons();
}

function openEditPlayer(playerId) {
  if (!isCoachUser()) return;
  const p = appState.players.find(x => x.id === playerId);
  if (!p) return;

  document.getElementById("modal-form-player-title").textContent = "Editar Jugadora";
  document.getElementById("player-id-input").value = p.id;
  document.getElementById("player-name-input").value = p.name;
  document.getElementById("player-num-input").value = p.number;
  document.getElementById("player-pos-input").value = p.position;
  document.getElementById("player-status-input").value = p.status;
  document.getElementById("player-height-input").value = p.height;
  document.getElementById("player-reach-input").value = p.cmj || p.reachAtaque;
  document.getElementById("player-notes-input").value = p.healthNote || "";

  document.getElementById("modal-add-player").classList.add("active");
}

function initFormListeners() {
  document.getElementById("form-player")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isCoachUser()) return;

    const id = document.getElementById("player-id-input").value;
    const name = document.getElementById("player-name-input").value;
    const number = parseInt(document.getElementById("player-num-input").value);
    const position = document.getElementById("player-pos-input").value;
    const status = document.getElementById("player-status-input").value;
    const height = document.getElementById("player-height-input").value || "165 cm";
    const reach = document.getElementById("player-reach-input").value || "28 cm";
    const notes = document.getElementById("player-notes-input").value;

    if (id) {
      const idx = appState.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        appState.players[idx] = {
          ...appState.players[idx],
          name, number, position, status, height, cmj: reach, reachAtaque: reach, healthNote: notes
        };
      }
      showToast("Jugadora y dorsal actualizados con éxito");
    } else {
      const parts = name.trim().split(" ");
      const firstLetter = parts[0].substring(0, 1).toLowerCase();
      const lastName = parts.length > 1 ? parts[parts.length - 1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n") : "jugadora";
      const generatedUsername = (firstLetter + lastName).toLowerCase();

      const newPlayer = {
        id: "p_" + Date.now(),
        name, number, position, status, height, cmj: reach, reachAtaque: reach, reachBloqueo: "25 cm",
        birthDate: "2012",
        username: generatedUsername,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        phone: "", email: `${generatedUsername}@bunyola.com`,
        stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
        healthNote: notes
      };
      appState.players.push(newPlayer);

      appState.users.push({
        username: generatedUsername,
        password: "bunyola123",
        name: name,
        role: "player",
        playerId: newPlayer.id
      });

      showToast(`Nueva jugadora añadida #${number} (Usuario: ${generatedUsername})`);
    }

    saveAppData(appState);
    renderRoster();
    document.getElementById("modal-add-player").classList.remove("active");
  });

  const typeSelect = document.getElementById("event-type-input");
  if (typeSelect) {
    typeSelect.addEventListener("change", updateMatchQuickSelectUI);
  }

  const oppSelect = document.getElementById("match-opponent-select");
  if (oppSelect) {
    oppSelect.addEventListener("change", autoFillMatchTitleAndLocation);
  }

  const condSelect = document.getElementById("match-condition-select");
  if (condSelect) {
    condSelect.addEventListener("change", autoFillMatchTitleAndLocation);
  }

  const sessionFileInput = document.getElementById("event-session-file");
  if (sessionFileInput) {
    sessionFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64Input = document.getElementById("event-session-base64");
          if (base64Input) base64Input.value = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  document.getElementById("form-event")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isCoachUser()) return;

    const type = document.getElementById("event-type-input").value;
    const title = document.getElementById("event-title-input").value;
    const date = document.getElementById("event-date-input").value;
    const time = document.getElementById("event-time-input").value;
    const location = document.getElementById("event-location-input").value;
    const plan = document.getElementById("event-plan-input").value;
    const base64Input = document.getElementById("event-session-base64");
    const sessionImage = base64Input ? base64Input.value : "";

    const currentMatches = appState.events.filter(e => e.type === "Partido");
    const nextRound = currentMatches.length + 1;

    const newEvt = {
      id: "e_" + Date.now(),
      round: type === "Partido" ? nextRound : null,
      type, title, date, time, location, plan, status: "Próximo",
      sessionImage: type === "Entrenamiento" ? sessionImage : null
    };

    appState.events.push(newEvt);
    saveAppData(appState);
    renderGoogleCalendar();
    renderTraining();
    renderStats();
    showToast("Evento guardado en el calendario");
    document.getElementById("modal-add-event").classList.remove("active");
  });

  document.getElementById("form-wellness")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const playerId = document.getElementById("wellness-player-select").value;
    const player = appState.players.find(p => p.id === playerId);
    
    const fatigueValInp = document.getElementById("wellness-fatigue-val");
    const fatigue = fatigueValInp ? (parseInt(fatigueValInp.value) || 2) : 2;

    const sleepHoursInp = document.getElementById("wellness-sleep-hours");
    const sleepHours = sleepHoursInp && sleepHoursInp.value ? parseFloat(sleepHoursInp.value) : 8;

    const sleepQualInp = document.getElementById("wellness-sleep-qual");
    const sleepQuality = sleepQualInp ? parseInt(sleepQualInp.value) : 4;

    const rpeInp = document.getElementById("wellness-rpe");
    const rpe = rpeInp ? parseInt(rpeInp.value) : 6;

    const notesInp = document.getElementById("wellness-notes");
    const notes = notesInp ? notesInp.value : "";

    const userLogs = (appState.wellnessLogs || []).filter(l => l.playerId === playerId);
    const weekNum = Math.min(24, userLogs.length + 1);
    const weekInfo = getCurrentWeekKey();

    const existingLogIndex = (appState.wellnessLogs || []).findIndex(l => {
      if (l.playerId !== playerId) return false;
      if (l.weekKey === weekInfo.weekKey) return true;
      if (l.date) {
        const lDate = new Date(l.date);
        return lDate >= weekInfo.mondayDate && lDate <= weekInfo.sundayDate;
      }
      return false;
    });

    if (existingLogIndex !== -1) {
      appState.wellnessLogs[existingLogIndex].fatigue = fatigue;
      appState.wellnessLogs[existingLogIndex].sleepHours = sleepHours;
      appState.wellnessLogs[existingLogIndex].sleepQuality = sleepQuality;
      appState.wellnessLogs[existingLogIndex].rpe = rpe;
      appState.wellnessLogs[existingLogIndex].weekKey = weekInfo.weekKey;
      if (notes) appState.wellnessLogs[existingLogIndex].notes = notes;
    } else {
      const newLog = {
        id: "w_" + Date.now(),
        playerId,
        playerName: player ? player.name : "Jugadora",
        weekNum: weekNum,
        weekKey: weekInfo.weekKey,
        date: new Date().toISOString().split("T")[0],
        sleepHours,
        sleepQuality,
        fatigue,
        rpe,
        notes
      };
      appState.wellnessLogs.unshift(newLog);
    }

    saveAppData(appState);
    renderWellness();
    showToast("¡Evaluación semanal de Borg enviada correctamente!");
    document.getElementById("modal-add-wellness").classList.remove("active");
  });
}

function updateBorgInteractiveUI(val) {
  const numVal = parseInt(val) || 2;
  const hiddenInput = document.getElementById("wellness-fatigue-val");
  const slider = document.getElementById("wellness-fatigue-slider");
  const badge = document.getElementById("borg-interactive-badge");

  if (hiddenInput) hiddenInput.value = numVal;
  if (slider && parseInt(slider.value) !== numVal) slider.value = numVal;

  document.querySelectorAll(".borg-btn-option").forEach(btn => {
    const bVal = parseInt(btn.getAttribute("data-val"));
    if (bVal === numVal) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });

  if (badge) {
    let labelText = "😊 2 - Sin Fatiga / Fresca";
    let bg = "#22c55e";
    let textColor = "#ffffff";

    if (numVal === 1) { labelText = "😌 1 - Descanso / Muy suave"; bg = "#3b82f6"; textColor = "#ffffff"; }
    else if (numVal === 2) { labelText = "😊 2 - Sin Fatiga / Fresca"; bg = "#22c55e"; textColor = "#ffffff"; }
    else if (numVal === 3) { labelText = "😐 3 - Fatiga Moderada"; bg = "#eab308"; textColor = "#0f172a"; }
    else if (numVal === 4) { labelText = "😫 4 - Fatiga Alta / Exigente"; bg = "#f97316"; textColor = "#ffffff"; }
    else if (numVal === 5) { labelText = "🥵 5 - Fatiga Máxima / Alerta"; bg = "#ef4444"; textColor = "#ffffff"; }

    badge.textContent = labelText;
    badge.style.background = bg;
    badge.style.color = textColor;
  }
}

function initBorgInteractiveBar() {
  document.querySelectorAll(".borg-btn-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-val");
      updateBorgInteractiveUI(val);
    });
  });

  const slider = document.getElementById("wellness-fatigue-slider");
  if (slider) {
    slider.addEventListener("input", (e) => {
      updateBorgInteractiveUI(e.target.value);
    });
  }
}

function initRangeSliders() {
  const sliders = [
    { input: "wellness-sleep-qual", badge: "val-sleep-qual" },
    { input: "wellness-fatigue", badge: "val-fatigue" },
    { input: "wellness-rpe", badge: "val-rpe" }
  ];

  sliders.forEach(s => {
    const inp = document.getElementById(s.input);
    const bdg = document.getElementById(s.badge);
    if (inp && bdg) {
      inp.addEventListener("input", (e) => {
        bdg.textContent = e.target.value;
      });
    }
  });
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i data-lucide="check-circle-2" style="color: #d97706;"></i> <span>${message}</span>`;
  container.appendChild(toast);

  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

/* ==========================================================================
   7. COMPETICIÓN (TABLA DE CLASIFICACIÓN DE LA LIGA - 12 EQUIPOS)
   ========================================================================== */
let activeEditingTeamLogo = null;

function renderCompetition() {
  const tbody = document.getElementById("league-table-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const isCoach = isCoachUser();

  const resetBtn = document.getElementById("coach-competition-actions");
  if (resetBtn) resetBtn.style.display = isCoach ? "flex" : "none";

  const actionThs = document.querySelectorAll(".th-competition-actions");
  actionThs.forEach(th => th.style.display = isCoach ? "table-cell" : "none");

  let teams = [...(appState.leagueTable || [])];

  // Ordenar por Puntos desc, luego por Diferencia de Sets desc
  teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffB = (b.sf || 0) - (b.sc || 0);
    const diffA = (a.sf || 0) - (a.sc || 0);
    return diffB - diffA;
  });

  teams.forEach((t, idx) => {
    const pos = idx + 1;
    const tr = document.createElement("tr");

    let rowStyle = "border-bottom: 1px solid #e2e8f0;";
    if (t.isOwn) {
      rowStyle += " background: #fffdf5; border-left: 4px solid #fbbf24;";
    }

    tr.style.cssText = rowStyle;

    let posBadge = `<span style="font-weight: 800; color: #64748b;">${pos}º</span>`;
    if (pos === 1) posBadge = `<span style="font-weight: 800; color: #b45309; background:#fef3c7; padding:2px 8px; border-radius:6px;">🥇 1º</span>`;
    else if (pos === 2) posBadge = `<span style="font-weight: 800; color: #475569; background:#f1f5f9; padding:2px 8px; border-radius:6px;">🥈 2º</span>`;
    else if (pos === 3) posBadge = `<span style="font-weight: 800; color: #78350f; background:#ffedd5; padding:2px 8px; border-radius:6px;">🥉 3º</span>`;

    tr.innerHTML = `
      <td style="text-align: center;">${posBadge}</td>
      <td style="text-align: center; padding: 0.4rem;">
        <img src="${t.logo || 'assets/default_avatar.svg'}" alt="${t.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: contain; background: #fff; border: 1px solid #cbd5e1;">
      </td>
      <td style="font-weight: 800; color: #0f172a; padding: 0.5rem 0.75rem;">
        ${t.name} ${t.isOwn ? '<span class="badge badge-gold" style="margin-left: 0.4rem;">NUESTRO EQUIPO ⭐</span>' : ''}
      </td>
      <td style="text-align: center; font-weight: 800; font-size: 1rem; color: #b45309; background: #fffbeb;">${t.points}</td>
      <td style="text-align: center; color: #334155; font-weight: 600;">${t.pj}</td>
      <td style="text-align: center; color: #16a34a; font-weight: 700;">${t.pg}</td>
      <td style="text-align: center; color: #dc2626; font-weight: 700;">${t.pp}</td>
      <td style="text-align: center; color: #334155;">${t.sf}</td>
      <td style="text-align: center; color: #334155;">${t.sc}</td>
      ${isCoach ? `
        <td style="text-align: center;">
          <button class="btn btn-outline btn-sm" onclick="openEditTeamModal('${t.id}')">
            <i data-lucide="edit-2" style="width:13px;"></i> Editar
          </button>
        </td>
      ` : ''}
    `;

    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

function openEditTeamModal(teamId) {
  if (!isCoachUser()) return;
  const team = (appState.leagueTable || []).find(t => t.id === teamId);
  if (!team) return;

  activeEditingTeamLogo = null;
  document.getElementById("edit-team-id").value = team.id;
  document.getElementById("edit-team-name").value = team.name;
  document.getElementById("edit-team-points").value = team.points;
  document.getElementById("edit-team-pj").value = team.pj;
  document.getElementById("edit-team-pg").value = team.pg;
  document.getElementById("edit-team-pp").value = team.pp;
  document.getElementById("edit-team-sf").value = team.sf;
  document.getElementById("edit-team-sc").value = team.sc;

  const preview = document.getElementById("edit-team-logo-preview");
  if (preview) preview.src = team.logo || "assets/default_avatar.svg";

  document.getElementById("modal-edit-team").classList.add("active");
}

function resetLeagueTable() {
  if (!isCoachUser()) return;
  if (confirm("¿Estás seguro de reiniciar los puntos y estadísticas de la tabla de clasificación?")) {
    appState.leagueTable.forEach(t => {
      t.points = 0; t.pj = 0; t.pg = 0; t.pp = 0; t.sf = 0; t.sc = 0;
    });
    saveAppData(appState);
    renderCompetition();
    showToast("Clasificación de liga reiniciada");
  }
}

function initCompetitionListeners() {
  const logoInput = document.getElementById("edit-team-logo-input");
  if (logoInput) {
    logoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Por favor selecciona un archivo de imagen válido.");
        return;
      }

      compressAndResizeImage(file, 300, 300, 0.85, (dataUrl) => {
        activeEditingTeamLogo = dataUrl;
        const preview = document.getElementById("edit-team-logo-preview");
        if (preview) preview.src = activeEditingTeamLogo;
        showToast("Escudo procesado y listo para guardar");
      });
    });
  }

  const form = document.getElementById("form-edit-team");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!isCoachUser()) return;

      const teamId = document.getElementById("edit-team-id").value;
      const team = (appState.leagueTable || []).find(t => t.id === teamId);
      if (!team) return;

      team.name = document.getElementById("edit-team-name").value;
      team.points = parseInt(document.getElementById("edit-team-points").value) || 0;
      team.pj = parseInt(document.getElementById("edit-team-pj").value) || 0;
      team.pg = parseInt(document.getElementById("edit-team-pg").value) || 0;
      team.pp = parseInt(document.getElementById("edit-team-pp").value) || 0;
      team.sf = parseInt(document.getElementById("edit-team-sf").value) || 0;
      team.sc = parseInt(document.getElementById("edit-team-sc").value) || 0;

      if (activeEditingTeamLogo) {
        team.logo = activeEditingTeamLogo;
        if (team.isOwn) {
          appState.teamInfo.customLogo = activeEditingTeamLogo;
          updateTeamHeaderInfo();
        }
      }

      saveAppData(appState);
      renderCompetition();
      showToast(`Equipo "${team.name}" actualizado en la clasificación`);
      document.getElementById("modal-edit-team").classList.remove("active");
    });
  }
}

function populateMatchOpponentsSelect() {
  const select = document.getElementById("match-opponent-select");
  if (!select) return;
  select.innerHTML = "";

  const teams = (appState.leagueTable || []).filter(t => !t.isOwn);
  teams.forEach(t => {
    select.innerHTML += `<option value="${t.name}">${t.name}</option>`;
  });
}

function updateMatchQuickSelectUI() {
  const typeSelect = document.getElementById("event-type-input");
  const quickBox = document.getElementById("match-quick-select-box");
  const uploadBox = document.getElementById("training-session-upload-box");
  if (!typeSelect || !quickBox) return;

  if (typeSelect.value === "Partido" || typeSelect.value === "Torneo") {
    quickBox.style.display = "block";
    if (uploadBox) uploadBox.style.display = "none";
    populateMatchOpponentsSelect();
    autoFillMatchTitleAndLocation();
  } else if (typeSelect.value === "Entrenamiento") {
    quickBox.style.display = "none";
    if (uploadBox) uploadBox.style.display = "block";
  } else {
    quickBox.style.display = "none";
    if (uploadBox) uploadBox.style.display = "none";
  }
}

function autoFillMatchTitleAndLocation() {
  const typeSelect = document.getElementById("event-type-input");
  if (typeSelect && typeSelect.value !== "Partido" && typeSelect.value !== "Torneo") return;

  const opponentSelect = document.getElementById("match-opponent-select");
  const conditionSelect = document.getElementById("match-condition-select");
  const titleInp = document.getElementById("event-title-input");
  const locInp = document.getElementById("event-location-input");

  if (!opponentSelect || !conditionSelect || !titleInp || !locInp) return;

  const opponent = opponentSelect.value || "Rival";
  const condition = conditionSelect.value;

  if (condition === "Local") {
    titleInp.value = `CV BUNYOLA vs ${opponent}`;
    locInp.value = "Pabellón Municipal de Bunyola";
  } else {
    titleInp.value = `${opponent} vs CV BUNYOLA`;
    locInp.value = `Pabellón de ${opponent}`;
  }
}

/* ==========================================================================
   8. USUARIOS Y ACCESOS (PANEL PRIVADO PARA EL ENTRENADOR)
   ========================================================================== */


/* ==========================================================================
   MÓDULO DE PREPARACIÓN FÍSICA Y SALUD
   ========================================================================== */
let activeFitnessChart = null;

function renderFitnessModule() {
  renderFitnessWarmup();
  renderFitnessPrevention();
  renderFitnessStretching();
  renderFitnessStrengthJump();
}

function switchFitnessSubTab(tabName) {
  const tabs = document.querySelectorAll(".fitness-tab-btn");
  const contents = document.querySelectorAll(".fitness-tab-content");

  tabs.forEach(t => {
    if (t.dataset.tab === tabName) t.classList.add("active");
    else t.classList.remove("active");
  });

  contents.forEach(c => {
    if (c.id === `fitness-tab-${tabName}`) {
      c.style.display = "block";
      c.classList.add("active");
    } else {
      c.style.display = "none";
      c.classList.remove("active");
    }
  });

  if (tabName === "strength-jump") {
    setTimeout(renderFitnessStrengthJump, 100);
  }
}

function renderFitnessWarmup() {
  const container = document.getElementById("fitness-warmup-container");
  if (!container) return;

  const data = (appState.fitnessData && appState.fitnessData.warmup) || [];
  container.innerHTML = data.map(item => `
    <div class="fitness-routine-card">
      <div class="fitness-routine-header">
        <div class="fitness-routine-title">
          <i data-lucide="flame"></i> ${item.title}
        </div>
        <span class="fitness-badge fitness-badge-orange">${item.duration}</span>
      </div>
      <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.75rem;">Categoría: ${item.category}</p>
      <ul class="fitness-step-list">
        ${item.steps.map(step => `
          <li class="fitness-step-item">
            <i data-lucide="check-circle-2"></i>
            <span>${step}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderFitnessPrevention() {
  const container = document.getElementById("fitness-prevention-container");
  if (!container) return;

  const data = (appState.fitnessData && appState.fitnessData.prevention) || [];
  container.innerHTML = data.map(item => `
    <div class="fitness-routine-card">
      <div class="fitness-routine-header" style="margin-bottom: 0.75rem;">
        <div class="fitness-routine-title">
          <i data-lucide="${item.icon || 'shield'}"></i> ${item.zone}
        </div>
        <span class="fitness-badge fitness-badge-blue">Preventivo</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${item.exercises.map(ex => `
          <div style="background: rgba(15, 23, 42, 0.6); padding: 0.6rem 0.8rem; border-radius: 8px; border-left: 3px solid #38bdf8;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <strong style="color: #f8fafc; font-size: 0.9rem;">${ex.name}</strong>
              <span class="fitness-badge fitness-badge-green">${ex.series}</span>
            </div>
            <p style="font-size: 0.8rem; color: #cbd5e1; margin: 0;">${ex.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderFitnessStretching() {
  const container = document.getElementById("fitness-stretching-container");
  if (!container) return;

  const data = (appState.fitnessData && appState.fitnessData.stretching) || [];
  container.innerHTML = data.map(item => `
    <div class="fitness-routine-card">
      <div class="fitness-routine-header">
        <div class="fitness-routine-title">
          <i data-lucide="heart"></i> ${item.title}
        </div>
        <span class="fitness-badge fitness-badge-green">${item.duration}</span>
      </div>
      <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.75rem;">Momento: ${item.type}</p>
      <ul class="fitness-step-list">
        ${item.exercises.map(ex => `
          <li class="fitness-step-item">
            <i data-lucide="sparkles"></i>
            <span>${ex}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderFitnessStrengthJump() {
  populateFitnessPlayerDropdowns();
  updateFitnessPlayerCharts();
  renderFitnessRecordsTable();
}

function populateFitnessPlayerDropdowns() {
  const selectFilter = document.getElementById("fitness-player-select");
  const selectForm = document.getElementById("fitness-record-player");
  if (!selectFilter || !selectForm) return;

  const players = appState.players || [];
  const currentUser = getCurrentUser();

  let filterOptionsHTML = players.map(p => `<option value="${p.id}">${p.name} (#${p.number})</option>`).join('');
  let formOptionsHTML = players.map(p => `<option value="${p.id}">${p.name} (#${p.number})</option>`).join('');

  selectFilter.innerHTML = filterOptionsHTML;
  selectForm.innerHTML = formOptionsHTML;

  if (currentUser && currentUser.playerId) {
    selectFilter.value = currentUser.playerId;
    selectForm.value = currentUser.playerId;
  }

  const dateInput = document.getElementById("fitness-record-date");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

function updateFitnessPlayerCharts() {
  const selectFilter = document.getElementById("fitness-player-select");
  const canvas = document.getElementById("chart-cmj-history");
  if (!selectFilter || !canvas) return;

  const playerId = selectFilter.value;
  const records = (appState.fitnessData && appState.fitnessData.jumpStrengthRecords) || [];

  const playerRecords = records
    .filter(r => r.playerId === playerId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const player = (appState.players || []).find(p => p.id === playerId);
  const playerName = player ? player.name : "Jugadora";

  const labels = playerRecords.map(r => r.date);
  const dataCMJ = playerRecords.map(r => r.cmj || 0);
  const dataCMJBrazos = playerRecords.map(r => r.cmjBrazos || 0);

  if (activeFitnessChart) {
    activeFitnessChart.destroy();
  }

  const ctx = canvas.getContext("2d");
  activeFitnessChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Sin datos'],
      datasets: [
        {
          label: `CMJ (Manos Caderas) - ${playerName}`,
          data: dataCMJ.length > 0 ? dataCMJ : [0],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderWidth: 3,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: '#fbbf24',
          pointRadius: 5
        },
        {
          label: `CMJ Brazos Libres - ${playerName}`,
          data: dataCMJBrazos.length > 0 ? dataCMJBrazos : [0],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 3,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: '#34d399',
          pointRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f8fafc', font: { weight: '700' } } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Centímetros (cm)', color: '#94a3b8' } }
      }
    }
  });
}

function renderFitnessRecordsTable() {
  const tbody = document.getElementById("fitness-records-table-body");
  if (!tbody) return;

  const players = appState.players || [];
  const records = (appState.fitnessData && appState.fitnessData.jumpStrengthRecords) || [];

  tbody.innerHTML = players.map(p => {
    const pRecords = records.filter(r => r.playerId === p.id);
    let bestCMJ = "--";
    let bestCMJBrazos = "--";
    let bestAlcance = "--";
    let lastDate = "Sin registros";

    if (pRecords.length > 0) {
      const maxCMJ = Math.max(...pRecords.map(r => r.cmj || 0));
      const maxCMJBrazos = Math.max(...pRecords.map(r => r.cmjBrazos || 0));
      const maxAlcance = Math.max(...pRecords.map(r => r.alcance || 0));

      if (maxCMJ > 0) bestCMJ = `${maxCMJ.toFixed(1)} cm`;
      if (maxCMJBrazos > 0) bestCMJBrazos = `${maxCMJBrazos.toFixed(1)} cm`;
      if (maxAlcance > 0) bestAlcance = `${maxAlcance} cm`;

      const lastRec = pRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (lastRec) {
        const parts = lastRec.date.split("-");
        lastDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : lastRec.date;
      }
    }

    return `
      <tr>
        <td style="font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem;">
          <img src="${p.avatar || DEFAULT_AVATAR}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #fbbf24;">
          ${p.name}
        </td>
        <td><span style="background: #fef3c7; color: #b45309; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 800;">#${p.number}</span></td>
        <td>${p.position}</td>
        <td><strong style="color: #fbbf24;">${bestCMJ}</strong></td>
        <td><strong style="color: #34d399;">${bestCMJBrazos}</strong></td>
        <td><strong style="color: #38bdf8;">${bestAlcance}</strong></td>
        <td style="font-size: 0.8rem; color: #94a3b8; font-weight: 700;">${lastDate}</td>
      </tr>
    `;
  }).join('');
}

function initFitnessFormListener() {
  const form = document.getElementById("form-fitness-record");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const playerId = document.getElementById("fitness-record-player").value;
    const date = document.getElementById("fitness-record-date").value;
    const cmj = parseFloat(document.getElementById("fitness-record-cmj").value) || 0;
    const cmjBrazos = parseFloat(document.getElementById("fitness-record-cmj-brazos").value) || 0;
    const alcance = parseFloat(document.getElementById("fitness-record-alcance").value) || 0;

    if (!playerId || !date || cmj <= 0 || cmjBrazos <= 0 || alcance <= 0) {
      showToast("Por favor ingresa todos los datos del test de salto y alcance.", "error");
      return;
    }

    if (!appState.fitnessData) appState.fitnessData = {};
    if (!appState.fitnessData.jumpStrengthRecords) appState.fitnessData.jumpStrengthRecords = [];

    const player = appState.players.find(p => p.id === playerId);
    const newRecord = { 
      id: "ft_" + Date.now(),
      playerId, 
      playerName: player ? player.name : "Jugadora",
      date, 
      cmj, 
      cmjBrazos, 
      alcance 
    };

    appState.fitnessData.jumpStrengthRecords.push(newRecord);

    if (player) {
      player.cmj = `${cmjBrazos.toFixed(1)} cm`;
      player.reachAtaque = `${alcance} cm`;
    }

    saveAppData(appState);
    renderFitnessStrengthJump();
    renderRoster();

    showToast("¡Test de salto y alcance registrado con éxito!");

    document.getElementById("fitness-record-cmj").value = "";
    document.getElementById("fitness-record-cmj-brazos").value = "";
    document.getElementById("fitness-record-alcance").value = "";
  });
}

window.switchFitnessSubTab = switchFitnessSubTab;
window.updateFitnessPlayerCharts = updateFitnessPlayerCharts;

// Cálculo de Asistencia a Entrenamientos y Sistema de Logros/Recompensas
function calculatePlayerAttendanceAndAchievements(playerId) {
  const now = new Date();
  const records = (appState.attendanceData || [])
    .filter(r => r.playerId === playerId && (!r.date || new Date(r.date) <= now))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const isPresent = r => r.status === "present" || r.status === "attended";
  const isAbsent = r => r.status === "absent" || r.status === "missed";
  const totalAttended = records.filter(isPresent).length;
  const totalMissed = records.filter(isAbsent).length;
  const total = totalAttended + totalMissed;
  const ratio = total ? Math.round(totalAttended * 100 / total) : 0;

  let running = 0, maxStreak = 0;
  records.forEach(r => { running = isPresent(r) ? running + 1 : (isAbsent(r) ? 0 : running); maxStreak = Math.max(maxStreak, running); });
  const currentStreak = running;

  const wellnessCount = (appState.wellnessLogs || []).filter(l => l.playerId === playerId).length;
  const confirmationsEarly = (appState.trainingConfirmations || []).filter(c => c.playerId === playerId && c.status === "yes").length;
  const goals = (appState.weeklyGoals || []).filter(g => g.isTeamGoal || g.playerId === playerId);
  const completedGoals = goals.filter(g => (g.completions || []).some(c => c.playerId === playerId && c.completed));
  const completedWeekKeys = [...new Set(completedGoals.map(g => g.weekKey))];
  const completeWeeks = completedWeekKeys.filter(wk => {
    const weekGoals = goals.filter(g => g.weekKey === wk && g.required !== false);
    return weekGoals.length && weekGoals.every(g => (g.completions || []).some(c => c.playerId === playerId && c.completed));
  }).length;

  const months = {};
  records.forEach(r => { const key=(r.date||"").slice(0,7); if(!key)return; months[key] ||= {present:0, absent:0}; isPresent(r)?months[key].present++:months[key].absent++; });
  const perfectMonths = Object.values(months).filter(m => m.present >= 4 && m.absent === 0).length;

  const matchAttendance = records.filter(r => {
    const evt=(appState.events||[]).find(e=>e.id===r.eventId); return evt && evt.type === "Partido" && isPresent(r);
  }).length;
  const points = totalAttended*10 + wellnessCount*3 + confirmationsEarly*2 + completeWeeks*10 + matchAttendance*15;
  const levels = [
    {name:"Inicio", min:0}, {name:"Compromiso", min:50}, {name:"Constancia", min:150},
    {name:"Referente", min:300}, {name:"Líder de equipo", min:500}
  ];
  let levelIndex=0; levels.forEach((l,i)=>{ if(points>=l.min) levelIndex=i; });
  const level=levels[levelIndex], nextLevel=levels[levelIndex+1] || null;
  const levelProgress = nextLevel ? Math.round((points-level.min)*100/(nextLevel.min-level.min)) : 100;

  const defs = [
    ["firstClass","Primer entrenamiento","Asistir al primer entrenamiento validado","circle-check",totalAttended,1],
    ["streak5","Racha de 5","Completar 5 entrenamientos consecutivos","flame",maxStreak,5],
    ["streak10","Racha de 10","Completar 10 entrenamientos consecutivos","flame",maxStreak,10],
    ["perfectMonth","Mes perfecto","Completar un mes sin ausencias","calendar-check",perfectMonths,1],
    ["wellness5","Cuidarse también entrena","Responder 5 cuestionarios wellness","heart-pulse",wellnessCount,5],
    ["wellness10","Autoconocimiento","Responder 10 cuestionarios wellness","activity",wellnessCount,10],
    ["goalsWeek1","Semana completa","Completar todos los objetivos obligatorios de una semana","target",completeWeeks,1],
    ["goalsWeek5","Constancia semanal","Completar 5 semanas de objetivos","badge-check",completeWeeks,5],
    ["eliteAttendance","Asistencia 90%","Mantener al menos un 90% de asistencia","award",ratio,90]
  ];
  const achievements = defs.map(([id,title,desc,icon,value,target]) => ({
    id,title,desc,icon,unlocked:value>=target,
    progress:Math.min(100,Math.round(value*100/target)),
    progressText:value>=target?"¡Desbloqueado!":`${value} / ${target}`
  }));

  return { totalAttended,totalMissed,ratio,currentStreak,maxStreak,wellnessCount,completeWeeks,points,level:level.name,nextLevel:nextLevel?.name||null,pointsToNext:nextLevel?nextLevel.min-points:0,levelProgress,achievements };
}

window.calculatePlayerAttendanceAndAchievements = calculatePlayerAttendanceAndAchievements;

// SISTEMA DE CONFIRMACIÓN DE ASISTENCIA A ENTRENAMIENTOS ("¿ACUDIRÉ AL ENTRENAMIENTO?")
function confirmTrainingAttendance(eventId, status, note = "") {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.playerId) {
    showToast("Solo las jugadoras con perfil asignado pueden confirmar asistencia.", "error");
    return;
  }

  if (!appState.trainingConfirmations) {
    appState.trainingConfirmations = [];
  }

  appState.trainingConfirmations = appState.trainingConfirmations.filter(
    c => !(c.eventId === eventId && c.playerId === currentUser.playerId)
  );

  appState.trainingConfirmations.push({
    eventId,
    playerId: currentUser.playerId,
    status,
    note,
    timestamp: new Date().toISOString()
  });

  saveAppData(appState);
  renderHomePortalRSVP();
  renderTraining();
  renderHomeDashboard();

  const isYes = status === 'yes';
  showToast(
    isYes
      ? `🟢 ¡Asistencia confirmada para el entrenamiento!`
      : `🔴 Registrada tu ausencia al entrenamiento.`
  );
}

function renderHomePortalRSVP() {
  const container = document.getElementById("home-rsvp-widget");
  if (!container) return;

  const currentUser = getCurrentUser();
  const isCoach = isCoachUser();

  const trainings = (appState.events || []).filter(e => e.type === "Entrenamiento");
  const upcomingTraining = trainings.length > 0 ? trainings[0] : {
    id: "evt-default-train",
    title: "Entrenamiento del Equipo",
    date: "Próxima Sesión",
    time: "18:30 - 20:30",
    location: "Pabellón Municipal Bunyola"
  };

  const confirmations = appState.trainingConfirmations || [];
  const eventConfirmations = confirmations.filter(c => c.eventId === upcomingTraining.id);
  const yesCount = eventConfirmations.filter(c => c.status === "yes").length;
  const noCount = eventConfirmations.filter(c => c.status === "no").length;

  let playerConfirm = null;
  if (currentUser && currentUser.playerId) {
    playerConfirm = eventConfirmations.find(c => c.playerId === currentUser.playerId);
  }

  let actionHTML = "";
  if (!isCoach) {
    if (playerConfirm) {
      if (playerConfirm.status === "yes") {
        actionHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="rsvp-badge-yes">✓ Asistencia Confirmada</span>
            <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; color: #ef4444;" onclick="confirmTrainingAttendance('${upcomingTraining.id}', 'no')">Cambiar a No acudiré</button>
          </div>
        `;
      } else {
        actionHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="rsvp-badge-no">✗ Ausencia Registrada</span>
            <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; color: #10b981;" onclick="confirmTrainingAttendance('${upcomingTraining.id}', 'yes')">Cambiar a Sí acudiré</button>
          </div>
        `;
      }
    } else {
      actionHTML = `
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn-rsvp-yes" onclick="confirmTrainingAttendance('${upcomingTraining.id}', 'yes')">
            <i data-lucide="check-circle-2" style="width: 18px; height: 18px;"></i> Sí, asistiré
          </button>
          <button type="button" class="btn-rsvp-no" onclick="confirmTrainingAttendance('${upcomingTraining.id}', 'no')">
            <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i> No podré acudir
          </button>
        </div>
      `;
    }
  } else {
    actionHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <div style="background: rgba(15, 23, 42, 0.5); padding: 0.55rem 1rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem; font-weight: 700; color: #f8fafc;">
          <span style="color: #10b981;">🟢 ${yesCount} Confirmadas</span> • <span style="color: #ef4444;">🔴 ${noCount} Bajas</span>
        </div>
        <button type="button" class="btn btn-primary" style="background: #10b981; border: none; font-weight: 800; padding: 0.6rem 1.25rem; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);" onclick="openVerifyAttendanceModal('${upcomingTraining.id}')">
          <i data-lucide="clipboard-check" style="width: 18px; height: 18px;"></i> 📋 Pasar Lista / Validar Asistencia
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="rsvp-card">
      <div class="rsvp-title-box">
        <div class="rsvp-icon-pulse">
          <i data-lucide="dumbbell"></i>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #f59e0b;">¿Acudirás al entrenamiento?</span>
            <span class="badge badge-gold" style="font-size: 0.7rem;">Próxima Sesión</span>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #f8fafc; margin: 0.2rem 0;">${upcomingTraining.title}</h3>
          <p style="font-size: 0.82rem; color: #94a3b8; margin: 0;">
            📅 ${upcomingTraining.date} • 🕒 ${upcomingTraining.time} • 📍 ${upcomingTraining.location}
          </p>
        </div>
      </div>
      <div>
        ${actionHTML}
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

window.confirmTrainingAttendance = confirmTrainingAttendance;
window.renderHomePortalRSVP = renderHomePortalRSVP;

// VERIFICACIÓN OFICIAL DE ASISTENCIA ("PASAR LISTA" POR EL ENTRENADOR)
function openVerifyAttendanceModal(eventId) {
  const modal = document.getElementById("modal-verify-attendance");
  const container = document.getElementById("verify-attendance-list-container");
  const inputEventId = document.getElementById("verify-attendance-event-id");

  if (!modal || !container) return;

  const event = appState.events.find(e => e.id === eventId);
  const title = document.getElementById("verify-attendance-title");
  if (title && event) {
    title.innerHTML = `<i data-lucide="clipboard-check"></i> Pasar Lista: ${event.title} (${event.date})`;
  }

  inputEventId.value = eventId;
  container.innerHTML = "";

  const confirmations = appState.trainingConfirmations || [];
  const eventConfirmations = confirmations.filter(c => c.eventId === eventId);
  const verifiedLogs = appState.attendanceData || [];

  appState.players.forEach(p => {
    const playerRSVP = eventConfirmations.find(c => c.playerId === p.id);
    const existingLog = verifiedLogs.find(a => a.eventId === eventId && a.playerId === p.id);

    let isChecked = false;
    if (existingLog) {
      isChecked = existingLog.status === "present" || existingLog.status === "attended";
    } else if (playerRSVP) {
      isChecked = playerRSVP.status === "yes";
    }

    let rsvpTag = `<span class="rsvp-tag-none">Sin responder</span>`;
    if (playerRSVP) {
      rsvpTag = playerRSVP.status === "yes" 
        ? `<span class="rsvp-tag-yes">✓ Dijo que Sí</span>`
        : `<span class="rsvp-tag-no">✗ Dijo que No</span>`;
    }

    const row = document.createElement("div");
    row.className = `verify-attendance-item ${isChecked ? 'is-checked' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <input type="checkbox" id="verify-p-${p.id}" value="${p.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981; cursor: pointer;" onchange="this.closest('.verify-attendance-item').classList.toggle('is-checked', this.checked)">
        <label for="verify-p-${p.id}" style="cursor: pointer; font-weight: 700; color: #0f172a;">
          #${p.number} ${p.name}
        </label>
      </div>
      <div>
        ${rsvpTag}
      </div>
    `;
    container.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
  modal.classList.add("active");
}

function initVerifyAttendanceFormListener() {
  const form = document.getElementById("form-verify-attendance");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const eventId = document.getElementById("verify-attendance-event-id").value;
    const event = appState.events.find(x => x.id === eventId);
    const dateStr = event ? event.date : new Date().toLocaleDateString('es-ES');

    if (!appState.attendanceData) appState.attendanceData = [];

    // Limpiar asistencias previas de esta sesión
    appState.attendanceData = appState.attendanceData.filter(a => a.eventId !== eventId);

    let presentCount = 0;
    appState.players.forEach(p => {
      const checkbox = document.getElementById(`verify-p-${p.id}`);
      const isPresent = checkbox ? checkbox.checked : false;

      if (isPresent) presentCount++;

      appState.attendanceData.push({
        id: `att-${Date.now()}-${p.id}`,
        eventId,
        playerId: p.id,
        playerName: p.name,
        date: dateStr,
        status: isPresent ? 'present' : 'absent'
      });
    });

    saveAppData(appState);
    showToast(`✅ Lista validada oficialmente: ${presentCount} jugadoras con asistencia computada.`);
    
    document.getElementById("modal-verify-attendance").classList.remove("active");
    renderTraining();
    renderHomePortalRSVP();
  });
}

window.openVerifyAttendanceModal = openVerifyAttendanceModal;

/* ==========================================================================
   MODAL ESCALA DE BORG Y ASISTENTE DEL EQUIPO (BOT CHATBOT)
   ========================================================================== */
function openBorgScaleModal() {
  const modal = document.getElementById("modal-borg-scale-info");
  if (modal) modal.classList.add("active");
  if (window.lucide) try { lucide.createIcons(); } catch(e){}
}

function closeBorgScaleModal() {
  const modal = document.getElementById("modal-borg-scale-info");
  if (modal) modal.classList.remove("active");
}

window.openBorgScaleModal = openBorgScaleModal;
window.closeBorgScaleModal = closeBorgScaleModal;


function setTrainingRPE(eventId, rpeVal) {
  const currentUser = getCurrentUser();
  const tr = appState.events.find(e => e.id === eventId);
  if (!tr) return;

  const numVal = parseInt(rpeVal);
  tr.rpe = numVal;

  if (!appState.trainingRPEs) appState.trainingRPEs = [];

  const playerId = currentUser ? currentUser.playerId : null;
  if (playerId) {
    const existingIndex = appState.trainingRPEs.findIndex(r => r.eventId === eventId && r.playerId === playerId);
    if (existingIndex !== -1) {
      appState.trainingRPEs[existingIndex].rpeVal = numVal;
    } else {
      appState.trainingRPEs.push({ eventId, playerId, rpeVal: numVal, date: new Date().toISOString().split('T')[0] });
    }
  }

  saveAppData(appState);
  renderTraining();
  renderHomePortalRSVP();
  showToast(`⚡ Carga RPE asignada: ${numVal} / 10 para la sesión`);
}

window.setTrainingRPE = setTrainingRPE;

window.deletePlayer = function(playerId) {
  if(!confirm("¿Seguro que deseas eliminar a esta jugadora? Esta acción no se puede deshacer.")) return;
  appState.players = appState.players.filter(p => p.id !== playerId);
  appState.users = appState.users.filter(u => u.playerId !== playerId);
  saveAppData(appState);
  document.getElementById('modal-player-detail').classList.remove('active');
  renderRoster();
  renderUsers();
  showToast("Jugadora eliminada correctamente.");
};

window.deleteWellnessLog = function(playerId, weekNum) {
  if(!confirm("¿Seguro que deseas eliminar esta valoración de Borg?")) return;
  appState.wellnessLogs = (appState.wellnessLogs || []).filter(l => !(l.playerId === playerId && l.weekNum === weekNum));
  saveAppData(appState);
  document.getElementById("modal-add-wellness").classList.remove("active");
  renderWellness();
  showToast("Valoración eliminada");
};

window.openImageModal = function(src) {
  const modal = document.getElementById("modal-image-viewer");
  if (!modal) return;
  const contentDiv = modal.querySelector(".modal-content");
  
  contentDiv.innerHTML = `<button class="modal-close" style="position: absolute; top: -40px; right: 0; color: white; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.5rem; z-index: 1000;" onclick="document.getElementById('modal-image-viewer').classList.remove('active')">&times;</button>`;
  
  if (src.startsWith("data:application/pdf")) {
    contentDiv.innerHTML += `<iframe src="${src}" style="width: 100%; height: 85vh; border-radius: 12px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.5); background: white;"></iframe>`;
  } else {
    contentDiv.innerHTML += `<img src="${src}" alt="Visor de archivo" style="max-width: 100%; max-height: 85vh; border-radius: 12px; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">`;
  }
  
  modal.classList.add("active");
};

function initMobileNavListeners() {
  const navItems = document.querySelectorAll('#mobile-bottom-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const target = item.getAttribute('data-target');
      
      // Update active state in bottom nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Navigate
      openModule(target);
      window.scrollTo(0, 0);
    });
  });
}
document.addEventListener('DOMContentLoaded', initMobileNavListeners);

// Override openModule to sync the mobile bottom nav
const originalOpenModule = window.openModule;
if (originalOpenModule) {
  window.openModule = function(moduleName) {
    originalOpenModule(moduleName);
    
    // Sync bottom nav
    const navItems = document.querySelectorAll('#mobile-bottom-nav .nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    
    let target = moduleName;
    if (moduleName === "home-portal" || moduleName === "home") target = "home";
    
    const activeItem = document.querySelector(`#mobile-bottom-nav .nav-item[data-target="${target}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  };
}

// ==========================================
// CONTROL DE ASISTENCIA Y ESFUERZO (COACH)
// ==========================================
function renderCoachAttendanceList() {
  const container = document.getElementById("coach-attendance-list");
  if (!container) return;
  
  const pastEvents = appState.events.filter(e => {
    const isTrainingOrMatch = e.type === "Entrenamiento" || e.title.toLowerCase().includes("entreno");
    if (!isTrainingOrMatch) return false;
    
    const [y, m, d] = e.date.split("-");
    const evtDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0,0,0,0);
    return evtDate <= today;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = "";
  
  if (pastEvents.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #64748b;">No hay entrenamientos registrados.</div>`;
    return;
  }
  
  pastEvents.forEach(evt => {
    const attendanceRecords = (appState.attendanceData || []).filter(a => a.eventId === evt.id);
    const presentCount = attendanceRecords.filter(a => a.status === "present").length;
    
    const rpeRecords = (appState.trainingRPEs || []).filter(r => r.eventId === evt.id);
    let avgRPE = 0;
    if (rpeRecords.length > 0) {
      const sum = rpeRecords.reduce((acc, curr) => acc + curr.rpeVal, 0);
      avgRPE = (sum / rpeRecords.length).toFixed(1);
    }
    
    const div = document.createElement("div");
    div.className = "attendance-card";
    const rpeColor = avgRPE >= 8 ? '#ef4444' : (avgRPE >= 5 ? '#f59e0b' : '#3b82f6');
    const rpeDisplay = avgRPE || '-';
    div.innerHTML = `
      <div class="att-card-left">
        <span style="font-weight: 800; color: #0f172a; font-size: 1.05rem;">${evt.title}</span>
        <span style="color: #64748b; font-size: 0.85rem;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> ${evt.date} &bull; ${evt.time}</span>
      </div>
      <div class="att-card-right">
        <div class="att-stat">
          <span class="att-stat-val" style="color: #10b981;">${presentCount}/${appState.players.length}</span>
          <span class="att-stat-lbl">Asisten</span>
        </div>
        <div class="att-stat">
          <span class="att-stat-val" style="color: ${rpeColor};">${rpeDisplay}</span>
          <span class="att-stat-lbl">Fatiga</span>
        </div>
        <i data-lucide="chevron-right" style="color: #cbd5e1;"></i>
      </div>
    `;
    div.onclick = () => openCoachAttendanceDetail(evt.id);
    container.appendChild(div);
  });
  if (window.lucide) lucide.createIcons();
}

function openCoachAttendanceDetail(eventId) {
  const evt = appState.events.find(e => e.id === eventId);
  if (!evt) return;
  
  document.getElementById("coach-attendance-list").style.display = "none";
  document.getElementById("coach-attendance-detail").style.display = "flex";
  
  document.getElementById("coach-attendance-detail-title").textContent = evt.title + " (" + evt.date + ")";
  
  const tbody = document.getElementById("coach-attendance-table-body");
  tbody.innerHTML = "";
  
  const attendanceRecords = (appState.attendanceData || []).filter(a => a.eventId === eventId);
  const rpeRecords = (appState.trainingRPEs || []).filter(r => r.eventId === eventId);
  
  appState.players.forEach(p => {
    const attRec = attendanceRecords.find(a => a.playerId === p.id);
    const isPresent = attRec && attRec.status === "present";
    const isAbsent = attRec && attRec.status === "absent";
    
    let attIcon = `<span style="color: #94a3b8;"><i data-lucide="minus"></i></span>`;
    if (isPresent) attIcon = `<span style="color: #10b981;"><i data-lucide="check-circle"></i></span>`;
    if (isAbsent) attIcon = `<span style="color: #ef4444;"><i data-lucide="x-circle"></i></span>`;
    
    const rpeRec = rpeRecords.find(r => r.playerId === p.id);
    let rpeHtml = `<span class="badge-borg borg-none">-</span>`;
    if (rpeRec) {
      let rpeClass = "borg-green";
      if (rpeRec.rpeVal >= 5 && rpeRec.rpeVal <= 7) rpeClass = "borg-yellow";
      if (rpeRec.rpeVal >= 8) rpeClass = "borg-red";
      rpeHtml = `<span class="badge-borg ${rpeClass}">${rpeRec.rpeVal}</span>`;
    }
    
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.innerHTML = `
      <td style="padding: 1rem; font-weight: 600; color: #1e293b;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${p.photo}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
          ${p.name}
        </div>
      </td>
      <td style="padding: 1rem; text-align: center;">${attIcon}</td>
      <td style="padding: 1rem; text-align: center;">${rpeHtml}</td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function closeCoachAttendanceDetail() {
  document.getElementById("coach-attendance-list").style.display = "flex";
  document.getElementById("coach-attendance-detail").style.display = "none";
}

window.openCoachAttendanceDetail = openCoachAttendanceDetail;
window.closeCoachAttendanceDetail = closeCoachAttendanceDetail;



/* ==========================================================================\n   DASHBOARD, OBJETIVOS SEMANALES Y GAMIFICACIÓN 2.0\n   ========================================================================== */
function parseEventStart(evt) {
  const time = ((evt.time || "00:00").match(/\d{1,2}:\d{2}/) || ["00:00"])[0];
  return new Date(`${evt.date}T${time}:00`);
}
function getUpcomingEvent(type) {
  const now = new Date();
  return (appState.events || []).filter(e => e.type === type && parseEventStart(e) >= now).sort((a,b)=>parseEventStart(a)-parseEventStart(b))[0] || null;
}
function getLatestPlayedMatch() {
  return (appState.events || []).filter(e => e.type === "Partido" && (e.result || e.status === "Finalizado")).sort((a,b)=>parseEventStart(b)-parseEventStart(a))[0] || null;
}
function formatEventDate(dateStr) {
  if (!dateStr) return "Por determinar";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("es-ES", {weekday:"short", day:"numeric", month:"short"});
}
function getWeekKeyFromDate(value=new Date()) {
  const d = new Date(value); const day=d.getDay(); d.setDate(d.getDate()+(day===0?-6:1-day)); d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function getGoalsForPlayer(playerId, weekKey=getWeekKeyFromDate()) {
  return (appState.weeklyGoals || []).filter(g => g.weekKey === weekKey && (g.isTeamGoal || g.playerId === playerId));
}
function isGoalCompleted(goal, playerId) { return (goal.completions || []).some(c => c.playerId===playerId && c.completed); }
function getWellnessStatusCounts() {
  const latest = new Map();
  (appState.wellnessLogs || []).forEach(l => { const old=latest.get(l.playerId); if(!old || new Date(l.date||0)>new Date(old.date||0)) latest.set(l.playerId,l); });
  let green=0,yellow=0,red=0; const alerts=[];
  (appState.players||[]).forEach(p=>{ const l=latest.get(p.id); if(!l) return; const f=Number(l.fatigue||0); if(f>=4){red++;alerts.push(p.name)} else if(f===3) yellow++; else green++; });
  return {green,yellow,red,alerts};
}
function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}
function getRelativeEventDate(evt) {
  if (!evt || !evt.date) return "Fecha por determinar";
  const today = new Date(); today.setHours(0,0,0,0);
  const date = new Date(`${evt.date}T12:00:00`); date.setHours(0,0,0,0);
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff > 1 && diff < 7) return `Dentro de ${diff} días`;
  return formatEventDate(evt.date);
}
function populateDashboardHero(user) {
  const info = appState.teamInfo || {};
  const greeting = document.getElementById("dashboard-greeting");
  const welcome = document.getElementById("dashboard-user-welcome");
  const role = document.getElementById("dashboard-user-role");
  const season = document.getElementById("dashboard-season-label");
  const hero = document.getElementById("dashboard-hero");
  if (greeting) greeting.textContent = getGreetingByTime();
  if (welcome) welcome.textContent = user.name || user.username || "Equipo";
  if (role) role.textContent = isCoachUser() ? "Entrenador principal" : "Jugadora del equipo";
  if (season) season.textContent = `Temporada ${(info.season || "2026 - 2027").replace(" - ", "/")}`;
  if (hero && info.customBg) hero.style.backgroundImage = `url('${info.customBg}')`;
}
function renderHomeDashboard() {
  const el = document.getElementById("home-dashboard");
  const user = getCurrentUser();
  if (!el || !user) return;
  populateDashboardHero(user);

  const coach = isCoachUser();
  const nextTraining = getUpcomingEvent("Entrenamiento");
  const nextMatch = getUpcomingEvent("Partido");
  const confirmations = (appState.trainingConfirmations || []).filter(c => nextTraining && c.eventId === nextTraining.id);
  const yes = confirmations.filter(c => c.status === "yes").length;
  const no = confirmations.filter(c => c.status === "no").length;
  const pending = Math.max(0, (appState.players || []).length - yes - no);
  const matchLogos = nextMatch ? getMatchLogosData(nextMatch) : null;
  const playerId = user.playerId;
  const game = playerId ? calculatePlayerAttendanceAndAchievements(playerId) : null;
  const weekGoals = playerId ? getGoalsForPlayer(playerId) : [];
  const done = playerId ? weekGoals.filter(g => isGoalCompleted(g, playerId)).length : 0;
  const wellness = getWellnessStatusCounts();
  const lastMatch = getLatestPlayedMatch();
  const allStats = (appState.players || []).map(p => calculatePlayerAttendanceAndAchievements(p.id));
  const teamAttendance = allStats.length ? Math.round(allStats.reduce((a,b) => a + b.ratio, 0) / allStats.length) : 0;
  const playerConfirm = playerId && nextTraining ? confirmations.find(c => c.playerId === playerId) : null;
  const teamGoals = (appState.weeklyGoals || []).filter(g => g.weekKey === getWeekKeyFromDate());
  const requiredPending = teamGoals.filter(g => g.required).reduce((sum,g) => sum + (appState.players || []).filter(p => (g.isTeamGoal || g.playerId === p.id) && !isGoalCompleted(g,p.id)).length, 0);

  const trainingActions = !nextTraining ? "" : coach
    ? `<div class="dashboard-actions"><button class="btn btn-primary btn-sm" onclick="openModule('training')"><i data-lucide="dumbbell"></i>Abrir entrenamiento</button><button class="btn btn-outline btn-sm" onclick="openVerifyAttendanceModal('${nextTraining.id}')"><i data-lucide="clipboard-check"></i>Pasar lista</button></div>`
    : (playerConfirm
      ? `<span class="dashboard-status ${playerConfirm.status === 'yes' ? 'ok' : 'danger'}">${playerConfirm.status === 'yes' ? 'Asistencia confirmada' : 'Ausencia comunicada'}</span>`
      : `<div class="dashboard-actions dashboard-rsvp-actions"><button class="btn-rsvp-yes" onclick="confirmTrainingAttendance('${nextTraining.id}','yes')">Sí, asistiré</button><button class="btn-rsvp-no" onclick="confirmTrainingAttendance('${nextTraining.id}','no')">No podré</button></div>`);

  const trainingCard = `<article class="dashboard-card dashboard-card-main dashboard-card-training">
    <div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="dumbbell"></i> Próximo entrenamiento</span>${nextTraining ? `<span class="dashboard-countdown">${getRelativeEventDate(nextTraining)}</span>` : ''}</div>
    <div class="dashboard-primary-content"><div><h3>${nextTraining ? nextTraining.title : 'Sin entrenamiento programado'}</h3>${nextTraining ? `<p class="dashboard-event-time">${formatEventDate(nextTraining.date)} · ${nextTraining.time}</p><p><i data-lucide="map-pin"></i>${nextTraining.location || 'Ubicación pendiente'}</p>` : `<p>Cuando se programe una sesión aparecerá aquí.</p>`}</div></div>
    ${coach && nextTraining ? `<div class="dashboard-metrics"><span><b>${yes}</b> confirmadas</span><span><b>${no}</b> bajas</span><span><b>${pending}</b> pendientes</span></div>` : ''}
    ${trainingActions}</article>`;

  const matchCard = `<article class="dashboard-card dashboard-card-match"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="trophy"></i> Próximo partido</span>${nextMatch ? `<span class="dashboard-countdown soft">${getRelativeEventDate(nextMatch)}</span>` : ''}</div>
    ${nextMatch && matchLogos ? `<div class="dashboard-versus"><div><img src="${matchLogos.team1.logo}" alt="${matchLogos.team1.name}"><span>${matchLogos.team1.name}</span></div><strong>VS</strong><div><img src="${matchLogos.team2.logo}" alt="${matchLogos.team2.name}"><span>${matchLogos.team2.name}</span></div></div><p class="dashboard-match-meta">${formatEventDate(nextMatch.date)} · ${nextMatch.time}<br>${nextMatch.location || 'Pabellón por confirmar'}</p><button class="dashboard-link" onclick="openModule('tactics')">Ver plan de juego <i data-lucide="arrow-right"></i></button>` : `<div class="dashboard-empty-state"><i data-lucide="calendar-x"></i><h3>Sin partido programado</h3><p>El próximo encuentro aparecerá aquí.</p></div>`}</article>`;

  let summaryCards = '';
  let lowerCards = '';
  if (coach) {
    summaryCards = `<div class="dashboard-summary-grid">
      <article class="dashboard-summary-card state-good"><i data-lucide="heart-pulse"></i><div><strong>${wellness.green}</strong><span>En buen estado</span></div></article>
      <article class="dashboard-summary-card state-warning"><i data-lucide="triangle-alert"></i><div><strong>${wellness.yellow}</strong><span>Requieren atención</span></div></article>
      <article class="dashboard-summary-card state-danger"><i data-lucide="circle-alert"></i><div><strong>${wellness.red}</strong><span>Alertas activas</span></div></article>
      <article class="dashboard-summary-card state-info"><i data-lucide="clipboard-check"></i><div><strong>${teamAttendance}%</strong><span>Asistencia media</span></div></article>
    </div>`;
    lowerCards = `<article class="dashboard-card dashboard-card-wide"><span class="dashboard-eyebrow"><i data-lucide="target"></i> Seguimiento semanal</span><div class="dashboard-followup-grid"><div><strong>${pending}</strong><span>Asistencias pendientes</span></div><div><strong>${requiredPending}</strong><span>Objetivos obligatorios pendientes</span></div><div><strong>${wellness.alerts.length}</strong><span>Jugadoras a revisar</span></div></div><button class="dashboard-link" onclick="openModule('goals')">Gestionar objetivos <i data-lucide="arrow-right"></i></button></article>
      <article class="dashboard-card"><span class="dashboard-eyebrow"><i data-lucide="history"></i> Último resultado</span><div class="dashboard-result-block"><strong>${lastMatch ? (lastMatch.result || 'Finalizado') : '—'}</strong><span>${lastMatch ? lastMatch.title : 'La temporada todavía no ha comenzado'}</span></div>${lastMatch ? `<button class="dashboard-link" onclick="openModule('stats')">Ver estadísticas <i data-lucide="arrow-right"></i></button>` : ''}</article>`;
  } else {
    const pct = weekGoals.length ? Math.round(done * 100 / weekGoals.length) : 0;
    const myLatest = game && game.achievements ? game.achievements.filter(a => a.unlocked).slice(-1)[0] : null;
    summaryCards = `<div class="dashboard-summary-grid">
      <article class="dashboard-summary-card state-info"><i data-lucide="activity"></i><div><strong>${game ? game.ratio : 0}%</strong><span>Mi asistencia</span></div></article>
      <article class="dashboard-summary-card state-warning"><i data-lucide="flame"></i><div><strong>${game ? game.currentStreak : 0}</strong><span>Racha actual</span></div></article>
      <article class="dashboard-summary-card state-good"><i data-lucide="target"></i><div><strong>${pct}%</strong><span>Objetivos completados</span></div></article>
      <article class="dashboard-summary-card state-purple"><i data-lucide="sparkles"></i><div><strong>${game ? game.points : 0}</strong><span>Puntos de compromiso</span></div></article>
    </div>`;
    lowerCards = `<article class="dashboard-card dashboard-card-wide"><span class="dashboard-eyebrow"><i data-lucide="target"></i> Objetivos de esta semana</span><div class="dashboard-goals-progress"><div><strong>${done}/${weekGoals.length}</strong><span>${pct}% completado</span></div><div class="progress-track"><span style="width:${pct}%"></span></div></div><div class="dashboard-goal-list">${weekGoals.filter(g => !isGoalCompleted(g, playerId)).slice(0,3).map(g => `<span><i data-lucide="circle"></i>${g.title}</span>`).join('') || '<p>Todo al día. ¡Buen trabajo!</p>'}</div><button class="dashboard-link" onclick="openModule('goals')">Ver todos los objetivos <i data-lucide="arrow-right"></i></button></article>
      <article class="dashboard-card"><span class="dashboard-eyebrow"><i data-lucide="award"></i> Mi progreso</span><div class="dashboard-result-block"><strong>${game ? game.level : 'Nivel 1'}</strong><span>${myLatest ? `Último logro: ${myLatest.title}` : 'Sigue sumando para desbloquear logros'}</span></div>${game ? `<div class="progress-track"><span style="width:${game.levelProgress}%"></span></div><p>${game.nextLevel ? `${game.pointsToNext} puntos para ${game.nextLevel}` : 'Nivel máximo alcanzado'}</p>` : ''}</article>`;
  }

  el.innerHTML = `<div class="dashboard-section-heading dashboard-overview-heading"><div><span>${coach ? 'Panel técnico' : 'Mi semana'}</span><h2>${coach ? 'Lo importante, de un vistazo' : 'Tu actividad del equipo'}</h2></div><p>${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p></div>
    <div class="dashboard-main-grid">${trainingCard}${matchCard}</div>${summaryCards}<div class="dashboard-lower-grid">${lowerCards}</div>`;
  if (window.lucide) lucide.createIcons();
  applyRolePermissions();
}



function updateDashboardQuickAccess() {
  const setMeta = (module, text, tone = "neutral") => {
    const el = document.querySelector(`[data-module-meta="${module}"]`);
    const card = el?.closest(".island-card");
    if (!el || !card) return;
    el.textContent = text;
    card.dataset.statusTone = tone;
  };

  const events = appState.events || [];
  const players = appState.players || [];
  const now = new Date();
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const upcomingWeek = events.filter(e => {
    const d = parseEventStart(e);
    return d >= now && d <= weekEnd;
  });
  const nextTraining = getUpcomingEvent("Entrenamiento");
  const nextMatch = getUpcomingEvent("Partido");
  const wellness = getWellnessStatusCounts();
  const user = getCurrentUser();
  const coach = isCoachUser();
  const weekKey = getWeekKeyFromDate();
  const goals = appState.weeklyGoals || [];
  const currentGoals = goals.filter(g => g.weekKey === weekKey && (coach || g.isTeamGoal || g.playerId === user?.playerId));
  const completedGoals = user?.playerId ? currentGoals.filter(g => isGoalCompleted(g, user.playerId)).length : 0;
  const pendingWellness = Math.max(0, players.length - (wellness.green + wellness.yellow + wellness.red));
  const totalTrainings = events.filter(e => e.type === "Entrenamiento").length;
  const completedMatches = events.filter(e => e.type === "Partido" && (e.result || e.status === "Finalizado")).length;

  setMeta("calendar", upcomingWeek.length ? `${upcomingWeek.length} evento${upcomingWeek.length === 1 ? "" : "s"} esta semana` : "Sin eventos esta semana", upcomingWeek.length ? "info" : "neutral");
  setMeta("roster", `${players.length} jugadoras activas`, "neutral");
  setMeta("competition", nextMatch ? `Próximo partido ${getRelativeEventDate(nextMatch).toLowerCase()}` : "Sin partido programado", nextMatch ? "gold" : "neutral");
  setMeta("wellness", coach ? (pendingWellness ? `${pendingWellness} respuesta${pendingWellness === 1 ? "" : "s"} pendiente${pendingWellness === 1 ? "" : "s"}` : (wellness.red ? `${wellness.red} alerta${wellness.red === 1 ? "" : "s"} activa${wellness.red === 1 ? "" : "s"}` : "Todo el equipo registrado")) : "Registrar mi estado", wellness.red ? "danger" : pendingWellness ? "warning" : "success");
  setMeta("training", nextTraining ? `Próximo: ${formatEventDate(nextTraining.date)}` : `${totalTrainings} sesiones programadas`, nextTraining ? "info" : "neutral");
  setMeta("tactics", nextMatch ? `Preparar ${nextMatch.title.replace(/^.*?vs\s*/i, "vs ")}` : "Scouting y rotaciones", nextMatch ? "gold" : "neutral");
  setMeta("goals", coach ? `${currentGoals.length} objetivo${currentGoals.length === 1 ? "" : "s"} esta semana` : `${completedGoals} de ${currentGoals.length} completados`, currentGoals.length && completedGoals === currentGoals.length ? "success" : "warning");
  setMeta("stats", completedMatches ? `${completedMatches} partido${completedMatches === 1 ? "" : "s"} registrado${completedMatches === 1 ? "" : "s"}` : "Sin partidos registrados", completedMatches ? "info" : "neutral");
  setMeta("fitness", "Evolución y prevención", "success");
  setMeta("users", `${(appState.users || []).length} accesos configurados`, "neutral");
  setMeta("coach-attendance", nextTraining ? "Preparar próxima asistencia" : "Revisar historial", nextTraining ? "success" : "neutral");
}

function initWeeklyGoals() {
  const form=document.getElementById('form-weekly-goal'); const scope=document.getElementById('weekly-goal-scope');
  scope?.addEventListener('change',()=>{ document.getElementById('weekly-goal-player-row').style.display=scope.value==='individual'?'block':'none'; });
  form?.addEventListener('submit',e=>{ e.preventDefault(); saveWeeklyGoalFromForm(); });
}
function openWeeklyGoalModal(goalId=null) {
  if(!isCoachUser()){showToast('Solo el entrenador puede crear objetivos.','error');return;}
  const modal=document.getElementById('modal-weekly-goal'), form=document.getElementById('form-weekly-goal'); form.reset();
  const select=document.getElementById('weekly-goal-player'); select.innerHTML=(appState.players||[]).map(p=>`<option value="${p.id}">#${p.number} ${p.name}</option>`).join('');
  document.getElementById('weekly-goal-week').value=getWeekKeyFromDate(); document.getElementById('weekly-goal-id').value=''; document.getElementById('weekly-goal-player-row').style.display='none';
  if(goalId){ const g=(appState.weeklyGoals||[]).find(x=>x.id===goalId); if(!g)return; document.getElementById('weekly-goal-modal-title').textContent='Editar objetivo semanal'; document.getElementById('weekly-goal-id').value=g.id; document.getElementById('weekly-goal-title').value=g.title; document.getElementById('weekly-goal-description').value=g.description||''; document.getElementById('weekly-goal-type').value=g.type; document.getElementById('weekly-goal-week').value=g.weekKey; document.getElementById('weekly-goal-scope').value=g.isTeamGoal?'team':'individual'; document.getElementById('weekly-goal-player').value=g.playerId||''; document.getElementById('weekly-goal-required').checked=g.required!==false; document.getElementById('weekly-goal-player-row').style.display=g.isTeamGoal?'none':'block'; } else document.getElementById('weekly-goal-modal-title').textContent='Crear objetivo semanal';
  modal.classList.add('active'); if(window.lucide) lucide.createIcons();
}
function closeWeeklyGoalModal(){document.getElementById('modal-weekly-goal')?.classList.remove('active');}
function saveWeeklyGoalFromForm(){
  if(!isCoachUser())return; const id=document.getElementById('weekly-goal-id').value; const isTeam=document.getElementById('weekly-goal-scope').value==='team';
  const payload={id:id||`goal_${Date.now()}`,title:document.getElementById('weekly-goal-title').value.trim(),description:document.getElementById('weekly-goal-description').value.trim(),type:document.getElementById('weekly-goal-type').value,weekKey:getWeekKeyFromDate(document.getElementById('weekly-goal-week').value),playerId:isTeam?null:document.getElementById('weekly-goal-player').value,isTeamGoal:isTeam,required:document.getElementById('weekly-goal-required').checked,createdAt:new Date().toISOString(),completions:[]};
  appState.weeklyGoals ||= []; const old=appState.weeklyGoals.find(g=>g.id===id); if(old){payload.createdAt=old.createdAt;payload.completions=old.completions||[];Object.assign(old,payload);}else appState.weeklyGoals.push(payload);
  saveAppData(appState); closeWeeklyGoalModal(); renderWeeklyGoals(); renderHomeDashboard(); showToast(id?'Objetivo actualizado':'Objetivo creado');
}
function toggleGoalCompletion(goalId){
  const user=getCurrentUser(); if(!user?.playerId){showToast('Solo una jugadora puede completar este objetivo.','error');return;} const g=(appState.weeklyGoals||[]).find(x=>x.id===goalId); if(!g || (!g.isTeamGoal&&g.playerId!==user.playerId))return;
  g.completions ||= []; let c=g.completions.find(x=>x.playerId===user.playerId); if(!c){c={playerId:user.playerId,completed:true,completedAt:new Date().toISOString()};g.completions.push(c);}else{c.completed=!c.completed;c.completedAt=c.completed?new Date().toISOString():null;}
  saveAppData(appState); renderWeeklyGoals(); renderHomeDashboard(); showToast(c.completed?'Objetivo completado':'Objetivo marcado como pendiente');
}
function deleteWeeklyGoal(goalId){if(!isCoachUser())return;if(!confirm('¿Eliminar este objetivo?'))return;appState.weeklyGoals=(appState.weeklyGoals||[]).filter(g=>g.id!==goalId);saveAppData(appState);renderWeeklyGoals();renderHomeDashboard();showToast('Objetivo eliminado');}
function renderWeeklyGoals(){
  const container=document.getElementById('weekly-goals-container'), summary=document.getElementById('weekly-goals-summary'); if(!container)return; const user=getCurrentUser(),coach=isCoachUser(),weekKey=getWeekKeyFromDate();
  document.getElementById('goals-week-label').textContent=`Semana del ${formatEventDate(weekKey)}`;
  let goals=(appState.weeklyGoals||[]).filter(g=>g.weekKey===weekKey); if(!coach)goals=goals.filter(g=>g.isTeamGoal||g.playerId===user.playerId);
  const done=!coach?goals.filter(g=>isGoalCompleted(g,user.playerId)).length:goals.reduce((n,g)=>n+(g.completions||[]).filter(c=>c.completed).length,0);
  summary.innerHTML=coach?`<div><strong>${goals.length}</strong><span>objetivos activos</span></div><div><strong>${done}</strong><span>cumplimientos registrados</span></div>`:`<div><strong>${done}/${goals.length}</strong><span>completados</span></div><div><strong>${goals.length?Math.round(done*100/goals.length):0}%</strong><span>progreso semanal</span></div>`;
  if(!goals.length){container.innerHTML='<div class="empty-goals"><i data-lucide="target"></i><h3>No hay objetivos esta semana</h3><p>Cuando se creen aparecerán aquí.</p></div>';if(window.lucide)lucide.createIcons();return;}
  container.innerHTML=goals.map(g=>{const complete=!coach&&isGoalCompleted(g,user.playerId); const assignee=g.isTeamGoal?'Todo el equipo':((appState.players||[]).find(p=>p.id===g.playerId)?.name||'Jugadora'); const completions=(g.completions||[]).filter(c=>c.completed); return `<article class="goal-card ${complete?'completed':''}"><div class="goal-card-top"><span class="goal-type"><i data-lucide="${goalTypeIcon(g.type)}"></i>${g.type}</span>${g.required!==false?'<span class="required-pill">Obligatorio</span>':''}</div><h3>${g.title}</h3><p>${g.description||'Sin descripción adicional.'}</p><div class="goal-meta"><span><i data-lucide="users"></i>${assignee}</span>${coach?`<span><i data-lucide="check-circle"></i>${completions.length} completado(s)</span>`:''}</div>${coach?`<div class="goal-actions"><button class="btn btn-outline btn-sm" onclick="openWeeklyGoalModal('${g.id}')"><i data-lucide="edit-2"></i>Editar</button><button class="btn btn-danger btn-sm" onclick="deleteWeeklyGoal('${g.id}')"><i data-lucide="trash-2"></i></button></div>`:`<button class="goal-complete-btn ${complete?'done':''}" onclick="toggleGoalCompletion('${g.id}')"><i data-lucide="${complete?'check-circle-2':'circle'}"></i>${complete?'Completado':'Marcar como completado'}</button>`}</article>`;}).join(''); if(window.lucide)lucide.createIcons();
}
function goalTypeIcon(type){return ({asistencia:'calendar-check','recuperación':'heart-pulse','sueño':'moon','hidratación':'droplets','físico':'dumbbell','técnico':'crosshair','táctico':'layout','vídeo':'play-circle',personalizado:'sparkles'})[type]||'target';}
window.renderHomeDashboard=renderHomeDashboard; window.updateDashboardQuickAccess=updateDashboardQuickAccess; window.openWeeklyGoalModal=openWeeklyGoalModal; window.closeWeeklyGoalModal=closeWeeklyGoalModal; window.toggleGoalCompletion=toggleGoalCompletion; window.deleteWeeklyGoal=deleteWeeklyGoal; window.renderWeeklyGoals=renderWeeklyGoals;
