// ==========================================================================
// VolleyCoach Hub - Main Application Logic (Pizarra Táctica 100% Editable)
// ==========================================================================

let appState = getAppData();
let activeChartTrend = null;
let activeChartSleep = null;
let activeChartGlobalRecError = null;
let activeChartGlobalRecPerfect = null;

const calendarToday = new Date();
let currentCalendarYear = calendarToday.getFullYear();
let currentCalendarMonth = calendarToday.getMonth(); // Abrir siempre en el mes actual
let activePlayerIdForAvatar = null;
let pendingSessionFile = null;
let activeScoutingMatchId = null;
let scoutingPreviewMode = false;
let mobileModuleReturnTarget = "home-portal";
let activeSessionReturnTarget = "training";

const MODULE_TITLES = {
  calendar:"Calendario", roster:"Plantilla", training:"Entrenamientos", wellness:"Bienestar y Carga",
  tactics:"Plan de juego", stats:"Estadísticas", competition:"Competición", users:"Usuarios",
  "coach-attendance":"Asistencia", goals:"Objetivos", planning:"Planificación", fitness:"Rendimiento"
};

function updateMobileModuleHeader(moduleName) {
  const title = document.getElementById("mobile-module-title");
  if (title) title.textContent = MODULE_TITLES[moduleName] || "Volver";
}

let moduleBackInProgress = false;
function handleModuleBack(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (moduleBackInProgress) return;
  moduleBackInProgress = true;
  try {
    if (activeSessionId) {
      closeSessionCenter();
    } else {
      openModule(mobileModuleReturnTarget || "home-portal", { preserveReturnTarget: true });
    }
  } finally {
    window.setTimeout(() => { moduleBackInProgress = false; }, 220);
  }
}
function initModuleBackButton(){
  const btn=document.getElementById('module-back-btn');
  if(!btn || btn.dataset.bound==='1') return;
  btn.dataset.bound='1';
  btn.addEventListener('click', handleModuleBack, {passive:false});
}
window.handleModuleBack = handleModuleBack;


// Arquitectura central: todas las funciones de entrenamiento leen de la misma sesión.
function normalizeSessionArchitecture() {
  appState.events = Array.isArray(appState.events) ? appState.events : [];
  appState.wellnessLogs = Array.isArray(appState.wellnessLogs) ? appState.wellnessLogs : [];
  appState.trainingConfirmations = Array.isArray(appState.trainingConfirmations) ? appState.trainingConfirmations : [];
  appState.trainingRPEs = Array.isArray(appState.trainingRPEs) ? appState.trainingRPEs : [];
  appState.sessionPlayerComments = Array.isArray(appState.sessionPlayerComments) ? appState.sessionPlayerComments : [];

  let changed = false;
  appState.events.forEach(evt => {
    if (evt.type !== 'Entrenamiento') return;
    if (!evt.sessionVersion) { evt.sessionVersion = 2; changed = true; }
    if (!evt.status) { evt.status = isTrainingFinished(evt) ? 'completed' : 'scheduled'; changed = true; }
    if (evt.coachNotes == null) { evt.coachNotes = ''; changed = true; }
    if (evt.coachAssessment == null) { evt.coachAssessment = ''; changed = true; }
  });

  // Vincula registros antiguos de wellness con la sesión del mismo día cuando existe.
  appState.wellnessLogs.forEach(log => {
    const dateKey = log.dateKey || log.date || (log.createdAt ? getLocalDateKey(new Date(log.createdAt)) : null);
    if (dateKey && !log.dateKey) { log.dateKey = dateKey; changed = true; }
    if (dateKey && !log.date) { log.date = dateKey; changed = true; }
    if (!log.sessionId && dateKey) {
      const sameDay = appState.events.filter(e => e.type === 'Entrenamiento' && e.date === dateKey);
      if (sameDay.length === 1) { log.sessionId = sameDay[0].id; changed = true; }
    }
  });
  if (changed) saveAppData(appState);
}

function openSeasonEvent(eventId) {
  const evt = (appState.events || []).find(e => e.id === eventId);
  if (!evt) return;
  if (evt.type === 'Entrenamiento') {
    openModule('training', { returnTarget: 'home-portal' });
    setTimeout(() => openSessionCenter(eventId, 'home-portal'), 0);
  } else {
    openEventDetailModal(eventId);
  }
}
window.openSeasonEvent = openSeasonEvent;

// Archivos de sesión: se guardan en IndexedDB para no saturar localStorage.
const SESSION_FILES_DB = "volleycoach_session_files";
const SESSION_FILES_STORE = "files";
function openSessionFilesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SESSION_FILES_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_FILES_STORE)) db.createObjectStore(SESSION_FILES_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveSessionFile(file, existingId = null) {
  if (!file) return existingId;
  const db = await openSessionFilesDB();
  const id = existingId || `sf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_FILES_STORE, "readwrite");
    tx.objectStore(SESSION_FILES_STORE).put({ id, name:file.name, type:file.type || "application/octet-stream", size:file.size, blob:file, savedAt:new Date().toISOString() });
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function getSessionFile(id) {
  if (!id) return null;
  const db = await openSessionFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_FILES_STORE, "readonly");
    const req = tx.objectStore(SESSION_FILES_STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function openSessionAttachment(eventId) {
  const evt = (appState.events || []).find(e => e.id === eventId);
  if (!evt) return;
  try {
    let url = null;
    let type = evt.attachmentType || '';
    let name = evt.attachmentName || 'Material de la sesión';
    if (!evt.attachmentId && evt.sessionImage) {
      url = evt.sessionImage;
      type = type || 'image/jpeg';
    } else {
      const record = await getSessionFile(evt.attachmentId);
      if (!record?.blob) return showToast("No se ha encontrado el archivo adjunto.", "error");
      url = URL.createObjectURL(record.blob);
      type = record.type || type;
      name = record.name || name;
    }

    let viewer = document.getElementById('session-file-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'session-file-viewer';
      viewer.className = 'session-file-viewer';
      viewer.innerHTML = `<div class="session-file-viewer-dialog"><header><div><span>Material de la sesión</span><strong id="session-file-viewer-name"></strong></div><button type="button" aria-label="Cerrar" onclick="closeSessionAttachment()"><i data-lucide="x"></i></button></header><div id="session-file-viewer-body" class="session-file-viewer-body"></div></div>`;
      document.body.appendChild(viewer);
      viewer.addEventListener('click', e => { if (e.target === viewer) closeSessionAttachment(); });
    }
    const body = viewer.querySelector('#session-file-viewer-body');
    viewer.querySelector('#session-file-viewer-name').textContent = name;
    viewer.dataset.objectUrl = url.startsWith('blob:') ? url : '';
    if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      body.innerHTML = `<iframe src="${url}" title="${escapeSessionText(name)}"></iframe>`;
    } else {
      body.innerHTML = `<img src="${url}" alt="${escapeSessionText(name)}">`;
    }
    viewer.classList.add('active');
    document.body.classList.add('modal-open');
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error(error);
    showToast("No se ha podido abrir el archivo adjunto.", "error");
  }
}
function closeSessionAttachment() {
  const viewer = document.getElementById('session-file-viewer');
  if (!viewer) return;
  viewer.classList.remove('active');
  viewer.querySelector('#session-file-viewer-body').innerHTML = '';
  const objectUrl = viewer.dataset.objectUrl;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  viewer.dataset.objectUrl = '';
  document.body.classList.remove('modal-open');
}
window.openSessionAttachment = openSessionAttachment;
window.closeSessionAttachment = closeSessionAttachment;

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

document.addEventListener("DOMContentLoaded", async () => {
  const safeInit = (name, fn) => {
    try {
      if (typeof fn === "function") fn();
    } catch (error) {
      console.error(`[VolleyCoach] Error al iniciar ${name}:`, error);
    }
  };

  safeInit("arquitectura de sesiones", normalizeSessionArchitecture);

  // El acceso debe inicializarse antes que cualquier módulo. Así, un error en
  // calendario, gráficas o dashboard nunca deja inservible el formulario.
  safeInit("login", initLoginListener);
  safeInit("iconos", () => {
    if (window.lucide) window.lucide.createIcons();
  });
  safeInit("avatares", initPlayerAvatarUploadListener);

  const dateOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const dateEl = document.getElementById("current-date-display");
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString("es-ES", dateOptions);

  safeInit("cabecera", updateTeamHeaderInfo);

  const loginView = document.getElementById("view-login");
  const portalWrapper = document.querySelector(".app-portal-wrapper");
  const currentUser = await restoreSupabaseSession();
  const isAuthenticated = Boolean(currentUser && currentUser.username);

  if (!isAuthenticated) {
    clearLocalAuthCache();
    if (loginView) loginView.classList.add("active");
    if (portalWrapper) portalWrapper.style.display = "none";
  } else {
    if (loginView) loginView.classList.remove("active");
    if (portalWrapper) portalWrapper.style.display = "block";
    safeInit("portal", () => openModule("home-portal"));
    safeInit("permisos", applyRolePermissions);
    safeInit("perfil de navegación", renderNavUserProfile);
    safeInit("recordatorio de bienestar semanal", maybeOpenWeeklyWellnessPrompt);
  }

  [
    // Las vistas pesadas se renderizan bajo demanda al abrir cada módulo.
    // Esto evita construir calendario, gráficas, plantilla y estadísticas durante el arranque.
    ["navegación atrás", initModuleBackButton],
    ["listeners de calendario", initGoogleCalendarListeners],
    ["modales", initModalListeners],
    ["formularios", initFormListeners],
    ["tests de salto", initJumpTestFormListener],
    ["sliders", initRangeSliders],
    ["exportación y ajustes", initExportAndSettings],
    ["carga de fondo", initBgUploadListener],
    ["carga de escudo", initLogoUploadListener],
    ["estadísticas de partido", initMatchStatsFormListener],
    ["competición", initCompetitionListeners],
    ["matriz Borg", initBorgMatrixListeners],
    ["barra Borg", initBorgInteractiveBar],
    ["verificación de asistencia", initVerifyAttendanceFormListener],
    ["objetivos semanales", initWeeklyGoals],
    ["dashboard", renderHomeDashboard]
  ].forEach(([name, fn]) => safeInit(name, fn));
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

function clearLocalAuthCache() {
  sessionStorage.removeItem("volley_authenticated");
  sessionStorage.removeItem("volley_current_user");
}

function mapSupabaseIdentityToLegacy(identity) {
  if (!identity?.profile) return null;
  const { profile, player, authUser, teams = [] } = identity;
  const roleMap = { administrator: "admin", coach: "coach", player: "player" };
  const localPlayer = player
    ? (appState.players || []).find(p =>
        String(p.id) === String(player.legacy_id || player.id) ||
        String(p.username || "").toLowerCase() === String(profile.username || "").toLowerCase()
      )
    : null;
  const primaryTeam = teams[0] || player?.teams || null;

  return {
    authId: authUser?.id || profile.id,
    username: profile.username,
    name: profile.full_name,
    role: roleMap[profile.role] || "player",
    supabaseRole: profile.role,
    clubId: profile.club_id || null,
    teamId: player?.team_id || primaryTeam?.id || null,
    teamName: primaryTeam?.name || null,
    teamCategory: primaryTeam?.category || null,
    teams: (teams || []).map(team => ({ id: team.id, name: team.name, category: team.category, active: team.active !== false })),
    language: profile.preferred_language || "es",
    supabasePlayerId: player?.id || null,
    playerId: localPlayer?.id || player?.legacy_id || player?.id || null,
    avatar: profile.avatar_path || localPlayer?.avatar || null,
    active: profile.active !== false && player?.active !== false,
    lastLogin: profile.last_login_at || null
  };
}

function hydrateLocalProfileFromSupabase(identity) {
  if (!identity?.profile) return null;
  const { profile, player, teams = [] } = identity;
  appState.users = Array.isArray(appState.users) ? appState.users : [];
  appState.players = Array.isArray(appState.players) ? appState.players : [];

  const roleMap = { administrator: "administrator", coach: "coach", player: "player" };
  let localUser = appState.users.find(user => String(user.authId || "") === String(profile.id));
  if (!localUser) {
    localUser = appState.users.find(user => String(user.username || "").toLowerCase() === String(profile.username || "").toLowerCase());
  }
  const userPayload = {
    authId: profile.id,
    username: profile.username,
    name: profile.full_name,
    role: roleMap[profile.role] || "player",
    active: profile.active !== false,
    avatar: profile.avatar_path || localUser?.avatar || null,
    language: profile.preferred_language || "es",
    clubId: profile.club_id || null,
    teamId: player?.team_id || teams[0]?.id || null,
    lastLogin: profile.last_login_at || null
  };
  if (localUser) Object.assign(localUser, userPayload);
  else {
    localUser = { ...userPayload, password: null, playerId: null };
    appState.users.push(localUser);
  }

  if (profile.role === "player" && player) {
    let localPlayer = appState.players.find(item =>
      String(item.id) === String(player.legacy_id || "") ||
      String(item.supabaseId || "") === String(player.id) ||
      String(item.username || "").toLowerCase() === String(profile.username || "").toLowerCase()
    );
    const localId = localPlayer?.id || player.legacy_id || player.id;
    const privateData = player.private_data && typeof player.private_data === "object" ? player.private_data : {};
    const playerPayload = {
      id: localId,
      supabaseId: player.id,
      authId: profile.id,
      teamId: player.team_id || null,
      username: profile.username,
      name: profile.full_name,
      number: player.dorsal ?? localPlayer?.number ?? "",
      birthDate: player.birth_date || localPlayer?.birthDate || "",
      position: player.position || localPlayer?.position || "",
      status: player.status || localPlayer?.status || "Disponible",
      avatar: profile.avatar_path || localPlayer?.avatar || DEFAULT_AVATAR,
      height: privateData.height || localPlayer?.height || "",
      healthNote: privateData.healthNote || localPlayer?.healthNote || ""
    };
    if (localPlayer) Object.assign(localPlayer, playerPayload);
    else {
      localPlayer = { ...playerPayload, stats: {}, cmj: "", reachAtaque: "", reachBloqueo: "", phone: "", email: "" };
      appState.players.push(localPlayer);
    }
    localUser.playerId = localPlayer.id;
  }

  const selectedTeam = teams[0] || player?.teams || null;
  if (selectedTeam && appState.teamInfo) {
    appState.teamInfo.currentTeamId = selectedTeam.id;
    appState.teamInfo.currentTeamName = selectedTeam.name;
    if (selectedTeam.category) appState.teamInfo.category = selectedTeam.category;
  }

  try { saveAppData(appState); } catch (error) { console.warn("[Supabase Profile] No se pudo guardar la copia local:", error); }
  return { localUser, selectedTeam };
}

async function restoreSupabaseSession() {
  try {
    if (!window.VolleySupabase || window.VolleySupabase.config?.authMode !== "supabase") {
      return getCurrentUser();
    }
    const { data: sessionData, error: sessionError } = await window.VolleySupabase.getSession();
    if (sessionError || !sessionData?.session) return null;

    const { data: identity, error: identityError } = await window.VolleySupabase.getIdentity();
    if (identityError || !identity?.profile || identity.profile.active === false) {
      await window.VolleySupabase.signOut();
      return null;
    }

    hydrateLocalProfileFromSupabase(identity);
    const user = mapSupabaseIdentityToLegacy(identity);
    if (!user) return null;
    sessionStorage.setItem("volley_authenticated", "true");
    sessionStorage.setItem("volley_current_user", JSON.stringify(user));
    return user;
  } catch (error) {
    console.error("[Supabase Auth] No se pudo restaurar la sesión:", error);
    return null;
  }
}

function isCoachUser() {
  const user = getCurrentUser();
  return user && ["admin", "coach"].includes(user.role);
}

let volleyLogoutInProgress = false;
async function handleLogout(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  if (volleyLogoutInProgress) return;
  volleyLogoutInProgress = true;

  document.querySelectorAll('.dashboard-logout-btn').forEach(button => {
    button.disabled = true;
    button.classList.add('is-leaving');
  });
  try { if (window.flushAppDataSave) window.flushAppDataSave(); } catch (_) {}
  try {
    if (window.VolleySupabase?.config?.authMode === "supabase") {
      await window.VolleySupabase.signOut();
    }
  } catch (error) {
    console.warn("[Supabase Auth] Error al cerrar sesión:", error);
  }
  clearLocalAuthCache();
  localStorage.removeItem('volleycoach_unsaved_draft');
  localStorage.removeItem('volleycoach_unsaved_draft_meta');
  window.location.replace(window.location.pathname + window.location.search);
}
window.handleLogout = handleLogout;

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
  const addEventBtn = document.getElementById("btn-add-event");
  if (addEventBtn) addEventBtn.style.display = isCoach ? "inline-flex" : "none";

  // Requerimiento 6: Ocultar + Planificar Sesión en Entrenamientos para jugadoras
  const addTrainingBtn = document.getElementById("btn-add-training-session");
  if (addTrainingBtn) addTrainingBtn.style.display = isCoach ? "inline-flex" : "none";

  const exportCsvBtn = document.getElementById("btn-export-csv");
  if (exportCsvBtn) exportCsvBtn.style.display = isCoach ? "inline-flex" : "none";
  const addPlayerBtn = document.getElementById("btn-add-player");
  if (addPlayerBtn) addPlayerBtn.style.display = isCoach ? "inline-flex" : "none";
  const addGoalBtn = document.getElementById("btn-add-weekly-goal");
  if (addGoalBtn) addGoalBtn.style.display = isCoach ? "none" : "inline-flex";
  const newJumpTestBtn = document.getElementById("btn-new-jump-test");
  if (newJumpTestBtn) newJumpTestBtn.style.display = isCoach ? "inline-flex" : "none";

  // Requerimiento 9: Ocultar Editar Rotación Táctica en Plan de Juego para jugadoras
  const editTacticBtn = document.getElementById("btn-edit-tactic");
  if (editTacticBtn) editTacticBtn.style.display = isCoach ? "inline-flex" : "none";
}

function initLoginListener() {
  const formLogin = document.getElementById("form-login");
  const loginErrorMsg = document.getElementById("login-error-msg");

  if (formLogin && formLogin.dataset.listenerReady !== "true") {
    formLogin.dataset.listenerReady = "true";
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginErrorMsg) loginErrorMsg.style.display = "none";

      const usernameInput = document.getElementById("login-username");
      const passwordInput = document.getElementById("login-password");
      const submitButton = formLogin.querySelector('button[type="submit"]');
      const userVal = (usernameInput?.value || "").trim().toLowerCase();
      const passVal = passwordInput?.value || "";

      if (!userVal || !passVal) return;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.textContent = "Entrando…";
      }

      try {
        const { error: signInError } = await window.VolleySupabase.signInWithUsername(userVal, passVal);
        if (signInError) throw signInError;

        const { data: identity, error: identityError } = await window.VolleySupabase.getIdentity();
        if (identityError || !identity?.profile) throw identityError || new Error("La cuenta no tiene un perfil asociado.");
        if (identity.profile.active === false) {
          await window.VolleySupabase.signOut();
          throw new Error("Esta cuenta está desactivada.");
        }

        hydrateLocalProfileFromSupabase(identity);
        const authenticatedUser = mapSupabaseIdentityToLegacy(identity);
        sessionStorage.setItem("volley_authenticated", "true");
        sessionStorage.setItem("volley_current_user", JSON.stringify(authenticatedUser));
        window.VolleySupabase.touchLastLogin().catch(() => {});

        const loginScreen = document.getElementById("view-login");
        const appPortal = document.querySelector(".app-portal-wrapper");
        if (loginScreen) loginScreen.classList.remove("active");
        if (appPortal) appPortal.style.display = "block";

        applyRolePermissions();
        try { renderNavUserProfile(); } catch(e){}
        openModule("home-portal");
        maybeOpenWeeklyWellnessPrompt();
        try { loadEventsFromSupabase({ silent: true }); } catch(e){}
      } catch (error) {
        console.error("[Supabase Auth] Inicio de sesión rechazado:", error);
        if (loginErrorMsg) {
          const text = loginErrorMsg.querySelector('span') || loginErrorMsg;
          text.textContent = error?.message === "Invalid login credentials"
            ? "Usuario o contraseña incorrectos."
            : (error?.message || "No se ha podido iniciar sesión.");
          loginErrorMsg.style.display = "flex";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitButton.dataset.originalText || "Entrar";
        }
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

        if (['administrator','admin','coach'].includes(currentUser.role)) {
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
              <span>${currentUser.role === 'coach' ? 'Entrenador' : 'Administrador'}</span>
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
              <label>Fecha de nacimiento</label>
              <span>${player ? formatRosterBirthDate(player.birthDate) : 'Fecha pendiente'}</span>
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
      document.body.classList.add("profile-modal-open");
    }
  };

  if (btnProfileHeader) btnProfileHeader.addEventListener("click", openProfile);
  if (btnProfileHome) btnProfileHome.addEventListener("click", openProfile);

  const formProfile = document.getElementById("form-my-profile");
  if (formProfile) formProfile.addEventListener("submit", (e) => { e.preventDefault(); modalProfile.classList.remove("active"); });

  const passwordModal = document.getElementById("modal-change-password");
  document.getElementById("btn-open-password-modal")?.addEventListener("click", () => {
    modalProfile.classList.remove("active");
    document.getElementById("form-change-password")?.reset();
    passwordModal?.classList.add("active");
  });
  document.getElementById("form-change-password")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass1 = document.getElementById("profile-new-password")?.value || "";
    const pass2 = document.getElementById("profile-confirm-password")?.value || "";
    if (pass1 !== pass2) return showToast("Las contraseñas nuevas no coinciden.", "error");
    if (pass1.length < 6) return showToast("La contraseña debe tener mínimo 6 caracteres.", "error");

    const submitButton = e.currentTarget.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      const { error } = await window.VolleySupabase.updatePassword(pass1);
      if (error) throw error;
      e.currentTarget.reset();
      passwordModal?.classList.remove("active");
      showToast("Contraseña actualizada correctamente.");
    } catch (error) {
      showToast(error?.message || "No se ha podido cambiar la contraseña.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // Listener para cambiar foto de perfil (CUALQUIER ROL)
  const avatarUpload = document.getElementById("my-profile-avatar-upload");
  if (avatarUpload) {
    avatarUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      openAvatarCropEditor(file);
    });
  }
}


let avatarCropImage = null;

function openAvatarCropEditor(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Selecciona una imagen válida.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    const image = new Image();
    image.onload = () => {
      avatarCropImage = image;
      ["avatar-crop-zoom", "avatar-crop-x", "avatar-crop-y"].forEach((id, index) => {
        const input = document.getElementById(id);
        if (input) input.value = index === 0 ? "1" : "0";
      });
      const modal = document.getElementById("modal-avatar-crop");
      if (modal) {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
      }
      renderAvatarCropPreview();
      if (window.lucide) lucide.createIcons();
    };
    image.onerror = () => showToast("No se ha podido abrir la imagen.", "error");
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function getAvatarCropSettings() {
  return {
    zoom: Number(document.getElementById("avatar-crop-zoom")?.value || 1),
    x: Number(document.getElementById("avatar-crop-x")?.value || 0),
    y: Number(document.getElementById("avatar-crop-y")?.value || 0)
  };
}

function drawAvatarCrop(canvas, outputSize = 500) {
  if (!canvas || !avatarCropImage) return;
  const ctx = canvas.getContext("2d");
  const { zoom, x, y } = getAvatarCropSettings();
  canvas.width = outputSize;
  canvas.height = outputSize;
  const baseScale = Math.max(outputSize / avatarCropImage.naturalWidth, outputSize / avatarCropImage.naturalHeight);
  const scale = baseScale * zoom;
  const drawWidth = avatarCropImage.naturalWidth * scale;
  const drawHeight = avatarCropImage.naturalHeight * scale;
  const overflowX = Math.max(0, (drawWidth - outputSize) / 2);
  const overflowY = Math.max(0, (drawHeight - outputSize) / 2);
  const drawX = (outputSize - drawWidth) / 2 - (x / 100) * overflowX;
  const drawY = (outputSize - drawHeight) / 2 - (y / 100) * overflowY;
  ctx.clearRect(0, 0, outputSize, outputSize);
  ctx.drawImage(avatarCropImage, drawX, drawY, drawWidth, drawHeight);
}

function renderAvatarCropPreview() {
  drawAvatarCrop(document.getElementById("avatar-crop-canvas"), 500);
}

function closeAvatarCropEditor() {
  const modal = document.getElementById("modal-avatar-crop");
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }
  avatarCropImage = null;
  const upload = document.getElementById("my-profile-avatar-upload");
  if (upload) upload.value = "";
}

function saveAvatarCrop() {
  const canvas = document.createElement("canvas");
  drawAvatarCrop(canvas, 500);
  if (!canvas.width) return;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const userMatch = (appState.users || []).find(u => String(u.username).toLowerCase() === String(currentUser.username).toLowerCase());
  if (userMatch) userMatch.avatar = dataUrl;
  if (currentUser.role === "admin") {
    if (!appState.teamInfo) appState.teamInfo = {};
    appState.teamInfo.coachAvatar = dataUrl;
  }
  const playerId = currentUser.playerId || userMatch?.playerId;
  const player = (appState.players || []).find(p => p.id === playerId || String(p.username).toLowerCase() === String(currentUser.username).toLowerCase());
  if (player) player.avatar = dataUrl;
  currentUser.avatar = dataUrl;
  sessionStorage.setItem("volley_current_user", JSON.stringify(currentUser));
  saveAppData(appState);
  renderNavUserProfile();
  const preview = document.getElementById("my-profile-avatar-preview");
  if (preview) preview.src = dataUrl;
  try { renderRoster(); } catch (error) { console.warn(error); }
  try { renderHomeDashboard(); } catch (error) { console.warn(error); }
  closeAvatarCropEditor();
  showToast("Foto de perfil actualizada.");
}

["avatar-crop-zoom", "avatar-crop-x", "avatar-crop-y"].forEach(id => {
  document.addEventListener("input", event => {
    if (event.target && event.target.id === id) renderAvatarCropPreview();
  });
});

window.openAvatarCropEditor = openAvatarCropEditor;
window.closeAvatarCropEditor = closeAvatarCropEditor;
window.saveAvatarCrop = saveAvatarCrop;

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
  if (moduleNav) { moduleNav.style.display = "none"; moduleNav.classList.add("is-hidden"); }

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

  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ==========================================================================
   NAVEGACIÓN PRINCIPAL DEL PORTAL DE LAS 6 ISLAS
   ========================================================================== */
const viewRenderCache = new Map();
let homeDashboardCache = { revision: -1, role: "", dayKey: "" };

function getUiDataRevision() {
  return Number(window.__appDataRevision || 0);
}

function getCurrentRoleCacheKey() {
  const user = getCurrentUser && getCurrentUser();
  return `${user?.role || "guest"}:${user?.playerId || user?.username || ""}`;
}

function shouldRenderModule(moduleName) {
  const key = `${getCurrentRoleCacheKey()}:${getUiDataRevision()}`;
  if (viewRenderCache.get(moduleName) === key) return false;
  viewRenderCache.set(moduleName, key);
  return true;
}

function invalidateViewRenderCache(moduleName) {
  if (moduleName) viewRenderCache.delete(moduleName);
  else viewRenderCache.clear();
}
window.invalidateViewRenderCache = invalidateViewRenderCache;

function renderHomeIfNeeded() {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const revision = getUiDataRevision();
  const role = getCurrentRoleCacheKey();
  const isFresh = homeDashboardCache.revision === revision && homeDashboardCache.role === role && homeDashboardCache.dayKey === dayKey;

  if (!isFresh) {
    try { renderHomePortalRSVP(); } catch(e) { console.warn(e); }
    try { renderHomeDashboard(); } catch(e) { console.warn(e); }
    homeDashboardCache = { revision, role, dayKey };
  } else {
    // Actualizaciones baratas que sí pueden variar sin que cambien los datos.
    try { populateDashboardHero(getCurrentUser()); } catch(e) {}
  }
}

function openModule(moduleName, options = {}) {
  const coachOnlyModules = new Set(["users", "fitness", "coach-attendance", "planning"]);
  if (coachOnlyModules.has(moduleName) && !isCoachUser()) {
    showToast("Este módulo es privado del cuerpo técnico.", "error");
    return;
  }
  if (!options.preserveReturnTarget && moduleName !== "home-portal" && moduleName !== "home") {
    mobileModuleReturnTarget = options.returnTarget || "home-portal";
  }
  updateMobileModuleHeader(moduleName);
  const homePortal = document.getElementById("view-home-portal");
  const loginView = document.getElementById("view-login");
  const moduleNav = document.getElementById("module-header-nav");
  const allViews = document.querySelectorAll(".page-view");
  const miniItems = document.querySelectorAll(".mini-item");

  if (loginView) loginView.classList.remove("active");

  if (moduleName === "home-portal" || moduleName === "home") {
    allViews.forEach(v => v.classList.remove("active"));
    if (homePortal) homePortal.classList.add("active");
    if (moduleNav) { moduleNav.style.display = "none"; moduleNav.classList.add("is-hidden"); }
    renderHomeIfNeeded();
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  if (homePortal) homePortal.classList.remove("active");
  if (moduleNav) { moduleNav.classList.remove("is-hidden"); moduleNav.style.display = "flex"; }

  allViews.forEach(v => v.classList.remove("active"));
  miniItems.forEach(i => i.classList.remove("active"));

  const targetView = document.getElementById(`view-${moduleName}`);
  const targetMini = document.getElementById(`mini-${moduleName}`);

  if (targetView) targetView.classList.add("active");
  if (targetMini) targetMini.classList.add("active");

  window.scrollTo({ top: 0, behavior: 'auto' });

  const needsRender = shouldRenderModule(moduleName);
  if (!needsRender) return;

  if (moduleName === "calendar") {
    renderGoogleCalendar();
  } else if (moduleName === "wellness") {
    renderWellness();
    requestAnimationFrame(() => {
      try { renderWellnessCharts(); } catch(e){}
    });
  } else if (moduleName === "stats") {
    renderStats();
  } else if (moduleName === "training") {
    closeSessionCenter(true);
    renderTraining();
  } else if (moduleName === "roster") {
    renderRoster();
  } else if (moduleName === "tactics") {
    renderTactics();
  } else if (moduleName === "competition") {
    renderCompetition();
  } else if (moduleName === "users") {
    renderUsers();
  } else if (moduleName === "coach-attendance") {
    renderCoachAttendanceList();
  } else if (moduleName === "goals") {
    renderWeeklyGoals();
  } else if (moduleName === "planning") {
    renderPlanningViewer();
  }

  if (window.lucide) {
    requestAnimationFrame(() => { try { lucide.createIcons(); } catch (_) {} });
  }
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
function getBirthdayEventsForYear(year) {
  return (appState.players || []).flatMap(player => {
    const match = String(player.birthDate || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!match) return [];
    const [, month, day] = match;
    return [{
      id: `birthday_${player.id}_${year}`,
      type: "Cumpleaños",
      title: `Cumpleaños de ${player.name}`,
      date: `${year}-${month}-${day}`,
      time: "Todo el día",
      playerId: player.id,
      isBirthday: true
    }];
  });
}
function getCalendarEventsForDate(dateKey) {
  const year = Number(String(dateKey).slice(0, 4));
  return [
    ...(appState.events || []).filter(evt => evt.date === dateKey),
    ...getBirthdayEventsForYear(year).filter(evt => evt.date === dateKey)
  ];
}
function getCalendarEventsForMonth(year, monthIndex) {
  return [
    ...(appState.events || []).filter(evt => {
      const [y,m] = String(evt.date || "").split("-").map(Number);
      return y === year && m - 1 === monthIndex;
    }),
    ...getBirthdayEventsForYear(year).filter(evt => Number(evt.date.slice(5,7)) - 1 === monthIndex)
  ];
}
function renderGoogleCalendar() {
  const addEventBtn = document.getElementById("btn-add-event");
  if (addEventBtn) addEventBtn.style.display = isCoachUser() ? "inline-flex" : "none";
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

    const dateEvents = getCalendarEventsForDate(formattedDate);
    const eventsContainer = cell.querySelector(`#events-date-${formattedDate}`);

    if (eventsContainer && dateEvents.length > 0) {
      dateEvents.forEach(evt => {
        const chip = document.createElement("div");
        const isMatch = evt.type === "Partido" || evt.type === "Amistoso";
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
        if (evt.isBirthday) {
          chip.classList.add("gcal-birthday-chip");
          chip.innerHTML = `<span class="gcal-training-chip-icon">🎂</span><span class="gcal-training-chip-content"><strong>${cleanTitle}</strong><small>Todo el día</small></span>`;
        } else if (!isMatch && !isTournament) {
          chip.classList.add("gcal-training-chip");
          chip.setAttribute("aria-label", `Abrir entrenamiento del ${formattedDate} a las ${evt.time}`);
          chip.innerHTML = `
            <span class="gcal-training-chip-icon"><i data-lucide="dumbbell"></i></span>
            <span class="gcal-training-chip-content">
              <strong>Entrenamiento</strong>
              <small>${evt.time}</small>
            </span>
            <i data-lucide="chevron-right" class="gcal-training-chip-arrow"></i>
          `;
        } else if (isTournament) {
          const ownLogo = appState.teamInfo?.customLogo || "assets/bunyola_logo.png";
          chip.innerHTML = `
            <span class="gcal-tournament-main">
              <span aria-hidden="true">🏆</span>
              <img src="${ownLogo}" class="gcal-tournament-own-logo" alt="CV Bunyola">
              <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cleanTitle || 'Torneo'}</strong>
            </span>
            <span style="font-size:.68rem;font-weight:800;margin-left:auto;">${evt.time}</span>`;
        } else {
          chip.innerHTML = `
            ${logosHTML}
            <span style="font-size: 0.68rem; font-weight: 800; opacity: 0.95; flex-shrink: 0; margin-right: 0.2rem;">${evt.time}</span> 
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cleanTitle}</span>
          `;
        }

        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!evt.isBirthday) openSeasonEvent(evt.id);
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
    
const monthEvents = getCalendarEventsForMonth(currentCalendarYear, currentCalendarMonth);

    monthEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    if (monthEvents.length === 0) {
      agendaContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: #94a3b8; font-weight: 500;">No hay eventos este mes.</div>`;
    } else {
      monthEvents.forEach(evt => {
        const isTournament = evt.type === "Torneo";
        const isMatch = evt.type === "Partido" || evt.type === "Amistoso" || isTournament || evt.title.includes(" vs ");
        const cardClass = isTournament ? "tournament-card" : (isMatch ? "match-card" : "training-card");
        const icon = isTournament ? "🏆" : (isMatch ? "🏐" : "🏋️");
        
        let logosHTML = "";
        if (isTournament) {
          const ownLogo = appState.teamInfo?.customLogo || "assets/bunyola_logo.png";
          logosHTML = `<div class="agenda-logos"><span style="font-size:1.8rem">🏆</span><img src="${ownLogo}" class="agenda-logo-img" alt="CV Bunyola"></div>`;
        } else if (isMatch) {
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
        const trainingSummary = (evt.objectives || evt.description || "Consulta objetivos, material y participación de la sesión.").trim();
        const shortTrainingSummary = trainingSummary.length > 95 ? `${trainingSummary.slice(0, 92)}…` : trainingSummary;
        
        const card = document.createElement("div");
        card.className = `agenda-card ${evt.isBirthday ? "birthday-card" : cardClass}`;
        if (!evt.isBirthday) {
          card.setAttribute("role", "button");
          card.setAttribute("tabindex", "0");
        }
        card.innerHTML = evt.isBirthday ? `
          <div class="agenda-header"><span class="agenda-date">${displayDate}</span><span class="agenda-time">Todo el día</span></div>
          <div class="agenda-body agenda-training-body"><div class="agenda-training-icon">🎂</div><div class="agenda-event-copy"><div class="agenda-type-label">CUMPLEAÑOS</div><div class="agenda-title">${cleanTitle}</div></div></div>
        ` : isMatch ? `
          <div class="agenda-header">
            <span class="agenda-date">${displayDate}</span>
            <span class="agenda-time"><i data-lucide="clock"></i> ${evt.time}</span>
          </div>
          <div class="agenda-body">
            ${logosHTML}
            <div class="agenda-event-copy">
              <div class="agenda-title">${icon} ${cleanTitle}</div>
              ${isTournament ? `<div class="agenda-desc">${(evt.tournamentMatches || []).length} partidos programados</div>` : ''}
              ${evt.location ? `<div class="agenda-desc"><i data-lucide="map-pin"></i> ${evt.location}</div>` : ''}
            </div>
            <i data-lucide="chevron-right" class="agenda-open-arrow"></i>
          </div>
        ` : `
          <div class="agenda-header">
            <span class="agenda-date">${displayDate}</span>
            <span class="agenda-time"><i data-lucide="clock"></i> ${evt.time}</span>
          </div>
          <div class="agenda-body agenda-training-body">
            <div class="agenda-training-icon"><i data-lucide="dumbbell"></i></div>
            <div class="agenda-event-copy">
              <div class="agenda-type-label">SESIÓN</div>
              <div class="agenda-title">Entrenamiento</div>
              <div class="agenda-training-summary">${shortTrainingSummary}</div>
              ${evt.location ? `<div class="agenda-desc"><i data-lucide="map-pin"></i> ${evt.location}</div>` : ''}
            </div>
            <div class="agenda-open-session">Ver sesión <i data-lucide="chevron-right"></i></div>
          </div>
        `;
        
        if (!evt.isBirthday) {
          card.addEventListener("click", () => openSeasonEvent(evt.id));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openSeasonEvent(evt.id);
            }
          });
        }
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
  currentEditingEventId = null;
  const form = document.getElementById("form-event");
  const modal = document.getElementById("modal-add-event");
  if (!form || !modal) return;
  form.reset();
  pendingSessionFile = null;
  const fileStatus = document.getElementById("event-session-file-status");
  if (fileStatus) fileStatus.textContent = "Sin archivo seleccionado.";
  const title = document.getElementById("modal-event-form-title");
  if (title) title.textContent = "Agendar Nuevo Evento";
  const dateInput = document.getElementById("event-date-input");
  if (dateInput) dateInput.value = dateStr || getLocalDateKey();
  const timeInput = document.getElementById("event-time-input");
  if (timeInput && !timeInput.value) timeInput.value = "18:30";
  resetTournamentEditor([]);
  updateMatchQuickSelectUI();
  modal.classList.add("active");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => document.getElementById("event-type-input")?.focus({preventScroll:true}));
}
function openCalendarEventComposer(){
  openAddEventModalForDate(getLocalDateKey());
}
window.openCalendarEventComposer = openCalendarEventComposer;

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
  if (evt.type === 'Entrenamiento') { openSeasonEvent(eventId); return; }

  const isCoach = isCoachUser();
  const modal = document.getElementById("modal-event-detail");
  const title = document.getElementById("event-detail-title");
  const body = document.getElementById("event-detail-body");

  title.textContent = evt.title;
  const isMatch = evt.type === "Partido" || evt.type === "Amistoso";
  const isTournament = evt.type === "Torneo";
  const isMatchOrTournament = isMatch || isTournament || evt.title.includes(" vs ");
  const matchLogos = isMatch ? getMatchLogosData(evt) : null;
  const tournamentMatchesHtml = isTournament ? `
    <div class="tournament-detail-list">
      ${(evt.tournamentMatches || []).length ? (evt.tournamentMatches || []).map((match, index) => `
        <div class="tournament-detail-match">
          <img src="${match.logo || 'assets/default_avatar.svg'}" alt="${match.teamA || (appState.teamInfo?.name || 'CV BUNYOLA')} vs ${match.teamB || match.opponent || 'Rival'}">
          <div><strong>Partido ${index + 1}: CV Bunyola vs ${match.teamA || (appState.teamInfo?.name || 'CV BUNYOLA')} vs ${match.teamB || match.opponent || 'Rival'}</strong><small>${evt.date} · ${evt.location || 'Ubicación por confirmar'}</small></div>
          <span class="tournament-detail-time">${match.time || '--:--'}</span>
        </div>`).join('') : '<p style="color:#64748b">No hay partidos añadidos.</p>'}
    </div>` : '';

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

    ${isTournament ? `<div style="display:flex;align-items:center;gap:.8rem;background:#fffbeb;border:1px solid #fbbf24;padding:1rem;border-radius:16px;margin-bottom:1rem"><span style="font-size:2rem">🏆</span><img src="${appState.teamInfo?.customLogo || 'assets/bunyola_logo.png'}" style="width:52px;height:52px;border-radius:50%;object-fit:contain;background:#fff;padding:3px" alt="CV Bunyola"><div><strong style="display:block;color:#92400e">${evt.title}</strong><small style="color:#78716c">${(evt.tournamentMatches || []).length} partidos programados</small></div></div>${tournamentMatchesHtml}` : ''}

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

async function deleteEvent(eventId) {
  if (!isCoachUser()) return;
  if (confirm("¿Estás seguro de que deseas eliminar este evento del calendario?")) {
    if (window.VolleySupabase && window.VolleySupabase.getClient()) {
      showToast("Eliminando evento de Supabase...", "info");
      const { error: supabaseError } = await window.VolleySupabase.deleteEvent(eventId);
      if (supabaseError) {
        console.error("[Supabase Events] Error al eliminar:", supabaseError);
        showToast("Error al eliminar el evento en Supabase: " + (supabaseError.message || "Error de conexión"), "error");
        return;
      }
    }

    appState.events = (appState.events || []).filter(e => e.id !== eventId && e.legacyId !== eventId);
    saveAppData(appState);
    if (typeof invalidateViewRenderCache === "function") invalidateViewRenderCache();
    homeDashboardCache = { revision: -1, role: "", dayKey: "" };

    renderGoogleCalendar();
    renderTraining();
    renderStats();
    document.getElementById("modal-event-detail")?.classList.remove("active");
    showToast("Evento eliminado correctamente");
  }
}

function editEventFromModal(eventId) {
  if (!isCoachUser()) return;
  const evt = appState.events.find(e => e.id === eventId);
  if (!evt) return;

  currentEditingEventId = eventId;
  document.getElementById("modal-event-detail")?.classList.remove("active");

  document.getElementById("modal-event-form-title").textContent = "Editar Evento";
  document.getElementById("event-type-input").value = evt.type;
  document.getElementById("event-title-input").value = evt.title;
  document.getElementById("event-date-input").value = evt.date;
  document.getElementById("event-time-input").value = evt.time;
  document.getElementById("event-location-input").value = evt.location;
  document.getElementById("event-plan-input").value = evt.plan || "";
  const base64Input = document.getElementById("event-session-base64");
  if (base64Input) base64Input.value = "";
  pendingSessionFile = null;
  resetTournamentEditor(evt.tournamentMatches || []);
  updateMatchQuickSelectUI();
  const fileStatus = document.getElementById("event-session-file-status");
  if (fileStatus) fileStatus.textContent = evt.attachmentName ? `Archivo actual: ${evt.attachmentName}` : (evt.sessionImage ? "Hay una imagen adjunta de una versión anterior." : "Sin archivo adjunto.");

  document.getElementById("modal-add-event").classList.add("active");
}

window.editEventFromModal = editEventFromModal;

/* ==========================================================================
   2. PLANTILLA (REJILLA DE 4 COLUMNAS & OPCIÓN DE CAMBIAR FOTO)
   ========================================================================== */
function formatRosterBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "Fecha pendiente";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Fecha pendiente";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function hasRealRosterPhoto(player) {
  const value = String(player?.avatar || player?.photo || "").trim();
  if (!value) return false;
  if (value === "assets/default_avatar.svg" || value.endsWith("/default_avatar.svg")) return false;
  // Las imágenes de demostración antiguas no deben mostrarse como foto de perfil.
  if (/images\.unsplash\.com/i.test(value)) return false;
  return true;
}

function renderRoster(filterPosition = "all") {
  const container = document.getElementById("roster-grid-container");
  if (!container) return;
  container.innerHTML = "";

  const isCoach = isCoachUser();
  let players = appState.players || [];

  if (isCoach && filterPosition !== "all") {
    const key = filterPosition.toLowerCase().split("-")[0];
    players = players.filter(p => String(p.position || "").toLowerCase().includes(key));
  }

  players.forEach(p => {
    const card = document.createElement("article");
    card.className = `player-card player-trading-card${isCoach ? " is-coach-card" : ""}`;
    card.setAttribute("aria-label", `${p.name}, dorsal ${p.number || "sin asignar"}`);

    if (isCoach) {
      card.tabIndex = 0;
      card.addEventListener("click", event => {
        // Los botones de cámara/edición tienen su propia acción y no deben abrir la ficha.
        if (event.target.closest(".trading-card-action")) return;
        openPlayerDetail(p.id);
      });
      card.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest(".trading-card-action")) {
          event.preventDefault();
          openPlayerDetail(p.id);
        }
      });
    }

    const clubLogo = appState.teamInfo?.customLogo || "assets/club_logo.png";
    const hasPhoto = hasRealRosterPhoto(p);
    const avatar = hasPhoto ? (p.avatar || p.photo) : clubLogo;
    const dorsal = p.number ? `#${p.number}` : "—";
    const birthDate = formatRosterBirthDate(p.birthDate);

    card.innerHTML = `
      <div class="trading-card-photo-wrap">
        <img class="trading-card-photo${hasPhoto ? '' : ' is-club-logo'}" src="${avatar}" alt="" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${clubLogo}';this.classList.add('is-club-logo')">
        <span class="trading-card-number">${dorsal}</span>
        ${isCoach ? `
          <div class="trading-card-coach-actions" aria-label="Acciones de entrenador">
            <button type="button" class="trading-card-action" data-roster-action="photo" aria-label="Cambiar foto de ${p.name}" title="Cambiar foto">
              <i data-lucide="camera"></i>
            </button>
            <button type="button" class="trading-card-action" data-roster-action="edit" aria-label="Editar a ${p.name}" title="Editar jugadora">
              <i data-lucide="pencil"></i>
            </button>
          </div>
        ` : ""}
      </div>
      <div class="trading-card-info">
        <h3 class="trading-card-name">${p.name}</h3>
        <div class="trading-card-meta">
          <strong>${dorsal}</strong>
          <span><i data-lucide="cake-slice"></i>${birthDate}</span>
        </div>
      </div>
    `;

    if (isCoach) {
      const photoButton = card.querySelector('[data-roster-action="photo"]');
      const editButton = card.querySelector('[data-roster-action="edit"]');
      photoButton?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        triggerAvatarUpload(p.id);
      });
      editButton?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openEditPlayer(p.id);
      });
    }

    container.appendChild(card);
  });

  if (!players.length) {
    container.innerHTML = `<div class="roster-empty-state"><i data-lucide="users"></i><strong>No hay jugadoras en este filtro</strong></div>`;
  }

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

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function getWeekInfoForDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  monday.setHours(0,0,0,0);
  const y = monday.getFullYear();
  const m = String(monday.getMonth()+1).padStart(2,'0');
  const dd = String(monday.getDate()).padStart(2,'0');
  return { weekKey:`${y}-W${m}-${dd}`, mondayDate:monday };
}
function getPlayerWeeklyStatus(playerId, date = new Date()) {
  const weekInfo = getWeekInfoForDate(date);
  const existingLog = (appState.wellnessLogs || []).find(l => l.playerId === playerId && (l.weekKey === weekInfo.weekKey || getWeekInfoForDate(new Date(l.dateKey || l.date || l.createdAt)).weekKey === weekInfo.weekKey));
  return { isContestada: !!existingLog, log: existingLog, weekInfo };
}
function getPlayerDailyStatus(playerId, date = new Date()) {
  const dateKey = getLocalDateKey(date);
  const existingLog = (appState.wellnessLogs || []).find(l =>
    l.playerId === playerId && getLocalDateKey(new Date(l.dateKey || l.date || l.createdAt)) === dateKey
  );
  return { isContestada: !!existingLog, log: existingLog, dateKey };
}
function isWellnessWindowOpen() {
  // Modo de prueba: el cuestionario puede contestarse todos los días.
  return true;
}

function maybeOpenWeeklyWellnessPrompt() {
  if (isCoachUser() || !isWellnessWindowOpen()) return;
  const user = getCurrentUser();
  if (!user?.playerId) return;
  const status = getPlayerDailyStatus(user.playerId);
  if (status.isContestada) return;

  // Se abre al entrar en la app. El pequeño retraso permite que termine de renderizar el portal.
  window.setTimeout(() => {
    const modal = document.getElementById('modal-add-wellness');
    if (!modal?.classList.contains('active')) openAddWellnessModal(user.playerId);
  }, 350);
}

function renderWellness() {
  renderBorgMatrix();

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  const bannerContainer = document.getElementById("wellness-status-banner-container");

  const matrixTitleEl = document.getElementById("borg-matrix-header-title");

  const chartTitleEl = document.getElementById("wellness-chart-title");
  const chartDescriptionEl = document.getElementById("wellness-chart-description");

  const rpeTeamSummarySection = document.getElementById("rpe-team-summary-section");
  const borgInfoButton = document.querySelector('#view-wellness button[onclick="openBorgScaleModal()"]');
  const borgLegendInline = document.getElementById('borg-legend-inline');
  if (rpeTeamSummarySection) rpeTeamSummarySection.style.display = isCoach ? "block" : "none";
  if (borgInfoButton) borgInfoButton.style.display = "none";
  if (borgLegendInline) borgLegendInline.style.display = "none";

  if (!isCoach) {
    if (matrixTitleEl) matrixTitleEl.innerHTML = "📊 Mi registro";
    if (chartTitleEl) chartTitleEl.textContent = "Evolución de mi bienestar";
    if (chartDescriptionEl) chartDescriptionEl.textContent = "Aquí puedes consultar únicamente tus propios registros. Los datos de tus compañeras y la media del equipo son privados para el cuerpo técnico.";
  } else {
    if (matrixTitleEl) matrixTitleEl.innerHTML = "📊 Registro Semanal del Equipo";
    if (chartTitleEl) chartTitleEl.textContent = "Evolución de la fatiga media del equipo";
    if (chartDescriptionEl) chartDescriptionEl.textContent = "Cada barra muestra la media semanal del equipo y cada punto corresponde al registro de una jugadora.";
  }

  let targetPlayerId = null;
  if (currentUser && currentUser.playerId) {
    targetPlayerId = currentUser.playerId;
  } else if (appState.players && appState.players.length > 0) {
    targetPlayerId = appState.players[0].id;
  }

  const status = targetPlayerId ? getPlayerDailyStatus(targetPlayerId) : { isContestada: false, dateKey: getLocalDateKey() };

  if (bannerContainer) {
    if (isCoach) {
      bannerContainer.innerHTML = "";
    } else if (status.isContestada) {
      bannerContainer.innerHTML = `
        <div class="wellness-weekly-complete" role="status">
          <i data-lucide="circle-check-big"></i>
          <div><strong>Bienestar de hoy ya contestado</strong><span>Has completado la valoración de hoy.</span></div>
        </div>`;
    } else if (isWellnessWindowOpen()) {
      bannerContainer.innerHTML = `
        <button class="btn btn-primary wellness-weekly-cta" onclick="openAddWellnessModal('${targetPlayerId}')">
          <i data-lucide="heart-pulse"></i> Registrar bienestar de hoy
        </button>`;
    } else {
      bannerContainer.innerHTML = `
        <div class="wellness-weekly-closed" role="status">
          <i data-lucide="calendar-clock"></i>
          <div><strong>Bienestar no disponible</strong><span>El cuestionario no está disponible en este momento.</span></div>
        </div>`;
    }
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
  renderTeamRpeSummary();
}

function getFatigueChartColor(value, alpha = 1) {
  const score = Number(value);
  let rgb = "59, 130, 246"; // 0-1 · azul / descanso
  if (score > 1.5 && score <= 2.5) rgb = "34, 197, 94";      // fresca
  else if (score > 2.5 && score <= 3.5) rgb = "234, 179, 8"; // moderada
  else if (score > 3.5 && score <= 4.5) rgb = "249, 115, 22";// alta
  else if (score > 4.5) rgb = "239, 68, 68";                // máxima
  return `rgba(${rgb}, ${alpha})`;
}

function renderWellnessCharts() {
  const canvas = document.getElementById("chart-wellness-weekly");
  const ctxTrend = canvas?.getContext("2d");
  if (!ctxTrend) return;

  if (window.activeChartTrend) window.activeChartTrend.destroy();

  const isCoach = isCoachUser();
  const user = getCurrentUser();
  const playerById = new Map((appState.players || []).map(player => [player.id, player]));

  let logs = (appState.wellnessLogs || [])
    .filter(log => log && log.fatigue !== undefined && log.fatigue !== null)
    .map(log => {
      const dateKey = log.dateKey || log.date || (log.createdAt ? getLocalDateKey(new Date(log.createdAt)) : null);
      const fatigue = Math.max(0, Math.min(5, Number(log.fatigue)));
      const player = playerById.get(log.playerId);
      return {
        ...log,
        dateKey,
        fatigue,
        playerName: player?.name || log.playerName || "Jugadora"
      };
    })
    .filter(log => log.dateKey && Number.isFinite(log.fatigue));

  if (!isCoach && user?.playerId) {
    logs = logs.filter(log => log.playerId === user.playerId);
  }

  logs.sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));

  const grouped = new Map();
  logs.forEach(log => {
    const info = getWeekInfoForDate(new Date(`${log.dateKey}T12:00:00`));
    if (!grouped.has(info.weekKey)) grouped.set(info.weekKey, { monday: info.mondayDate, logs: [] });
    grouped.get(info.weekKey).logs.push(log);
  });

  const weekKeys = [...grouped.keys()].sort((a, b) => grouped.get(a).monday - grouped.get(b).monday);
  const labels = weekKeys.length
    ? weekKeys.map(weekKey => `Sem. ${grouped.get(weekKey).monday.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})}`)
    : ["Sin datos"];

  const averages = weekKeys.length
    ? weekKeys.map(weekKey => {
        const values = grouped.get(weekKey).logs.map(log => log.fatigue);
        return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
      })
    : [0];

  const barDataset = {
    type: "bar",
    label: isCoach ? "Fatiga media del equipo" : "Mi fatiga",
    data: averages,
    backgroundColor: averages.map(value => getFatigueChartColor(value, 0.72)),
    borderColor: averages.map(value => getFatigueChartColor(value, 1)),
    borderWidth: 1.5,
    borderRadius: 8,
    maxBarThickness: 58,
    order: 2
  };

  const pointDatasets = [];
  if (isCoach && weekKeys.length) {
    const logsByPlayer = new Map();
    logs.forEach(log => {
      const playerKey = log.playerId || log.playerName;
      if (!logsByPlayer.has(playerKey)) logsByPlayer.set(playerKey, { name: log.playerName, values: new Map() });
      logsByPlayer.get(playerKey).values.set(log.dateKey, log.fatigue);
    });

    logsByPlayer.forEach((playerData, playerKey) => {
      const values = weekKeys.map(weekKey => { const rec = grouped.get(weekKey).logs.find(log => (log.playerId || log.playerName) === playerKey); return rec ? rec.fatigue : null; });
      pointDatasets.push({
        type: "line",
        label: playerData.name,
        data: values,
        showLine: false,
        pointRadius: values.map(value => value === null ? 0 : 5),
        pointHoverRadius: values.map(value => value === null ? 0 : 8),
        pointBackgroundColor: values.map(value => value === null ? "transparent" : getFatigueChartColor(value, 1)),
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        spanGaps: false,
        order: 1,
        _isPlayerPoints: true
      });
    });
  }

  window.activeChartTrend = new Chart(ctxTrend, {
    type: "bar",
    data: {
      labels,
      datasets: [barDataset, ...pointDatasets]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: {
          labels: {
            color: "#334155",
            font: { weight: "600" },
            filter: item => item.datasetIndex === 0
          }
        },
        tooltip: {
          callbacks: {
            title(items) {
              return items?.[0]?.label || "";
            },
            label(context) {
              const dataset = context.dataset;
              const value = context.parsed.y;
              if (dataset._isPlayerPoints) return `${dataset.label}: ${value}/5`;
              return `${dataset.label}: ${Number(value).toFixed(1)}/5`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#64748b", maxRotation: 0, autoSkip: true },
          grid: { display: false },
          title: { display: true, text: "Semana", color: "#64748b", font: { weight: "600" } }
        },
        y: {
          min: 0,
          max: 5,
          ticks: { color: "#64748b", stepSize: 1 },
          grid: { color: "#e2e8f0" },
          title: { display: true, text: "Fatiga (0–5)", color: "#64748b", font: { weight: "600" } }
        }
      }
    }
  });
}


function renderTeamRpeSummary() {
  const section = document.getElementById('rpe-team-summary-section');
  const grid = document.getElementById('rpe-team-summary-grid');
  if (!section || !grid) return;
  if (!isCoachUser()) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  const trainings = (appState.events || []).filter(event => {
    const type = String(event?.type || event?.eventType || '').trim().toLowerCase();
    return type === 'entrenamiento' || type === 'training';
  }).sort((a,b)=>getTrainingDateTime(b)-getTrainingDateTime(a));
  const recent = trainings.slice(0, 18);
  if (!recent.length) { grid.innerHTML = '<p class="training-no-rpe">Todavía no hay entrenamientos registrados.</p>'; return; }
  grid.innerHTML = recent.map(training => {
    const trainingId = training.id ?? training.eventId ?? training.sessionId;
    const summary = getTrainingRpeSummary(trainingId);
    const avg = summary.average === null ? '—' : summary.average.toFixed(1);
    const rawDate = training.date || training.startDate || getLocalDateKey();
    const parsedDate = new Date(`${rawDate}T12:00:00`);
    const d = Number.isNaN(parsedDate.getTime()) ? rawDate : parsedDate.toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
    const responseText = summary.count === 1 ? '1 respuesta' : `${summary.count} respuestas`;
    return `<button type="button" class="rpe-average-tile ${summary.count ? 'has-data' : 'is-empty'}" onclick="openRpeResponsesModal('${trainingId}')"><span>${d}</span><strong>${avg}</strong><small>${responseText}</small></button>`;
  }).join('');
}
function openRpeResponsesModal(eventId) {
  const tr = (appState.events || []).find(e => e.id === eventId);
  if (!tr || !isCoachUser()) return;
  const summary = getTrainingRpeSummary(eventId);
  const rows = summary.records.slice().sort((a,b)=>Number(b.rpeVal)-Number(a.rpeVal)).map(r => {
    const p = (appState.players || []).find(x=>x.id===r.playerId);
    return `<div class="rpe-response-row"><span>${p?.name || 'Jugadora'}</span><strong>${r.rpeVal}/10</strong></div>`;
  }).join('') || '<p class="training-no-rpe">Ninguna jugadora ha respondido todavía.</p>';
  const modal = document.createElement('div');
  modal.className='modal-backdrop active rpe-responses-modal';
  modal.innerHTML=`<div class="modal-content"><div class="modal-header"><div><h3>${tr.title || 'Entrenamiento'}</h3><small>${summary.average===null?'Sin media':`Media ${summary.average.toFixed(1)}/10`} · ${summary.count} respuestas</small></div><button class="modal-close" type="button">&times;</button></div><div class="modal-body">${rows}</div></div>`;
  modal.querySelector('.modal-close').addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}
window.openRpeResponsesModal = openRpeResponsesModal;

/* ==========================================================================
   4. ENTRENAMIENTO
   ========================================================================== */
let currentTrainingView = "next";
let currentEditingEventId = null;

let activeSessionId = null;

function setTrainingView(view) {
  currentTrainingView = ["next", "history", "performance"].includes(view) ? view : "next";
  document.querySelectorAll("[data-training-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.trainingTab === currentTrainingView);
  });
  renderTraining();
}
window.setTrainingView = setTrainingView;

function getTrainingDateTime(event) {
  const date = event?.date || "1970-01-01";
  const time = event?.time || "00:00";
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(date) : parsed;
}

function isTrainingFinished(event) {
  const start = getTrainingDateTime(event);
  const durationMinutes = Number(event?.duration || 120);
  return Date.now() >= start.getTime() + durationMinutes * 60000;
}

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isRpeSubmissionWindowOpen(event) {
  return Boolean(event && isTrainingFinished(event) && event.date === getLocalDateKey());
}

function getRpeDescriptor(value) {
  const n = Number(value);
  if (n <= 1) return { label: "Muy suave", tone: "low" };
  if (n <= 3) return { label: "Suave", tone: "low" };
  if (n <= 5) return { label: "Moderado", tone: "medium" };
  if (n <= 7) return { label: "Exigente", tone: "high" };
  if (n <= 9) return { label: "Muy exigente", tone: "very-high" };
  return { label: "Máximo", tone: "max" };
}

function getTrainingRpeSummary(eventId) {
  const targetId = String(eventId ?? '');
  const records = (appState.trainingRPEs || []).filter(record => {
    const recordEventId = record?.eventId ?? record?.trainingId ?? record?.sessionId;
    return String(recordEventId ?? '') === targetId && Number.isFinite(Number(record?.rpeVal));
  });
  const average = records.length ? records.reduce((sum, record) => sum + Number(record.rpeVal), 0) / records.length : null;
  return { records, average, count: records.length };
}

function renderRpeScale(eventId, selectedValue, mode) {
  const value = Number.isFinite(Number(selectedValue)) ? Number(selectedValue) : 5;
  const descriptor = getRpeDescriptor(value);
  return `<div class="training-rpe-slider-wrap" data-rpe-event="${eventId}">
    <div class="training-rpe-slider-value"><strong id="rpe-value-${eventId}-${mode}">${value}</strong><span id="rpe-label-${eventId}-${mode}">${descriptor.label}</span></div>
    <input id="rpe-input-${eventId}-${mode}" type="range" class="training-rpe-slider" min="0" max="10" step="1" value="${value}"
      aria-label="RPE de 0 a 10" oninput="previewTrainingRPE('${eventId}', this.value, '${mode}')">
    <div class="training-rpe-slider-marks"><span>0</span><span>5</span><span>10</span></div>
    <button type="button" class="btn btn-primary btn-sm training-rpe-submit" onclick="submitTrainingRpe('${eventId}','${mode}')">Guardar RPE</button>
  </div>`;
}

function submitTrainingRpe(eventId, mode) {
  const input = document.getElementById(`rpe-input-${eventId}-${mode}`);
  if (!input) return;
  setTrainingRPE(eventId, input.value, mode);
}
window.submitTrainingRpe = submitTrainingRpe;

function previewTrainingRPE(eventId, value, mode) {
  const num = Math.max(0, Math.min(10, Number(value)));
  const valueEl = document.getElementById(`rpe-value-${eventId}-${mode}`);
  const labelEl = document.getElementById(`rpe-label-${eventId}-${mode}`);
  if (valueEl) valueEl.textContent = num;
  if (labelEl) labelEl.textContent = getRpeDescriptor(num).label;
}
window.previewTrainingRPE = previewTrainingRPE;

function renderTraining() {
  const container = document.getElementById("training-list-container");
  if (!container) return;

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  const playerId = currentUser?.playerId || null;
  (appState.events || []).filter(e => e.type === "Entrenamiento").forEach(e => {
    if (e.coachRpe === undefined && e.rpe !== undefined) e.coachRpe = e.rpe;
  });
  const trainings = (appState.events || [])
    .filter(e => e.type === "Entrenamiento")
    .sort((a,b)=>getTrainingDateTime(a)-getTrainingDateTime(b));

  document.querySelectorAll("[data-training-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.trainingTab === currentTrainingView));

  const performancePanel = document.getElementById("training-performance-panel");
  if (currentTrainingView === "performance") {
    container.hidden = true;
    if (performancePanel) performancePanel.hidden = false;
    renderPerformanceModule();
    return;
  }
  container.hidden = false;
  if (performancePanel) performancePanel.hidden = true;

  const now = Date.now();
  const upcoming = trainings.filter(t => !isTrainingFinished(t));
  const past = trainings.filter(t => isTrainingFinished(t)).reverse();

  if (currentTrainingView === "history") {
    container.innerHTML = renderTrainingHistory(past, isCoach, playerId);
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (!upcoming.length) {
    container.innerHTML = `<div class="training-empty"><i data-lucide="calendar-x"></i><h3>No hay próximos entrenamientos</h3><p>${isCoach?'Planifica una nueva sesión para compartir objetivos, contenido y archivos con el equipo.':'Cuando el entrenador publique una sesión aparecerá aquí.'}</p></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const visible = upcoming.slice(0,4);
  container.innerHTML = `<div class="training-session-grid">${visible.map((tr,index)=>renderTrainingCard(tr,isCoach,playerId,index===0)).join('')}</div>${upcoming.length>4?`<p class="training-more-note">Hay ${upcoming.length-4} sesiones posteriores. Se mostrarán al acercarse la fecha.</p>`:''}`;
  if (window.lucide) lucide.createIcons();
}

function renderTrainingCard(tr,isCoach,playerId,isNext) {
  const confirmations = (appState.trainingConfirmations || []).filter(c=>isSameEventId(c.eventId, tr.id));
  const playerConfirm = playerId ? getPlayerConfirmationForEvent(tr.id, playerId) : null;
  const summary = getTrainingRpeSummary(tr.id);
  const ownRpe = playerId ? summary.records.find(r=>r.playerId===playerId)?.rpeVal : null;
  const coachRpe = Number.isFinite(Number(tr.coachRpe)) ? Number(tr.coachRpe) : null;
  const finished = isTrainingFinished(tr);
  const dateLabel = new Date(`${tr.date}T12:00:00`).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});

  let attendance='';
  if (!isCoach) {
    attendance = playerConfirm ? `<div class="training-confirmed ${playerConfirm.status==='yes'?'yes':'no'}"><span>${playerConfirm.status==='yes'?'✓ Asistencia confirmada':'Ausencia comunicada'}</span><button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openSeasonEvent('${tr.id}')">Abrir sesión</button></div>` : `<div class="training-rsvp"><span>¿Asistirás?</span><button class="yes" onclick="event.stopPropagation(); confirmTrainingAttendance('${tr.id}','yes')">Sí, asistiré</button><button class="no" onclick="event.stopPropagation(); confirmTrainingAttendance('${tr.id}','no')">No podré</button></div>`;
  } else {
    const yes=confirmations.filter(c=>c.status==='yes').length, no=confirmations.filter(c=>c.status==='no').length;
    attendance=`<div class="training-coach-actions"><span><strong>${yes}</strong> sí · <strong>${no}</strong> bajas</span><button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openVerifyAttendanceModal('${tr.id}')"><i data-lucide="clipboard-check"></i> Pasar lista</button></div>`;
  }

  let rpe='';
  if (false && isCoach && !finished) {
    rpe=`<div class="training-rpe-locked"><i data-lucide="lock"></i> Podrás puntuar la RPE cuando termine el entrenamiento.</div>`;
  } else if (isCoach) {
    rpe=`<div class="training-rpe-panel">
      <div class="training-rpe-heading"><div><span>Tu exigencia prevista/percibida</span><strong>${coachRpe===null?'Sin valorar':coachRpe+'/10'}</strong></div><div><span>Media jugadoras</span><strong>${summary.average===null?'Sin respuestas':summary.average.toFixed(1)+'/10'}</strong><small>${summary.count} respuesta${summary.count===1?'':'s'}</small></div></div>
      ${renderRpeScale(tr.id,coachRpe,'coach')}
      ${coachRpe!==null&&summary.average!==null?`<div class="training-rpe-comparison"><span>Tu valoración</span><div class="training-rpe-track"><i style="width:${coachRpe*10}%"></i></div><b>${coachRpe}</b><span>Jugadoras</span><div class="training-rpe-track players"><i style="width:${summary.average*10}%"></i></div><b>${summary.average.toFixed(1)}</b></div>`:''}
    </div>`;
  } else if (isRpeSubmissionWindowOpen(tr)) {
    rpe=`<div class="training-rpe-panel player"><div class="training-rpe-heading"><div><span>¿Qué esfuerzo has percibido?</span><strong>${ownRpe===null||ownRpe===undefined?'Puntúa de 0 a 10':ownRpe+'/10 · '+getRpeDescriptor(ownRpe).label}</strong></div></div>${ownRpe===null||ownRpe===undefined ? renderRpeScale(tr.id,ownRpe,'player') : ''}<p>${ownRpe===null||ownRpe===undefined?'Disponible durante las pruebas. Una vez enviado no puede modificarse.':'Registro enviado. Ya no puede modificarse.'}</p></div>`;
  } else if (finished) {
    rpe=`<button type="button" class="training-rpe-locked training-rpe-expired" onclick="showCenteredNotice('El plazo para enviar el RPE ha finalizado.')"><i data-lucide="lock"></i> Plazo de RPE finalizado</button>`;
  } else {
    rpe=`<div class="training-rpe-locked"><i data-lucide="lock"></i> Podrás valorar el esfuerzo cuando termine el entrenamiento.</div>`;
  }

  return `<article class="training-session-card ${isNext?'next':''}">
    <div class="training-session-top training-session-open" onclick="openSessionCenter('${tr.id}','training')" role="button" tabindex="0" aria-label="Abrir ${tr.title||'entrenamiento'}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openSessionCenter('${tr.id}','training')}"><div><span class="training-date-chip">${isNext?'PRÓXIMO · ':''}${dateLabel}</span><h3>${tr.title||'Entrenamiento'}</h3><p><i data-lucide="clock"></i>${tr.time||'--:--'} <i data-lucide="map-pin"></i>${tr.location||'Sin ubicación'}</p></div><div class="training-session-open-actions"><i class="training-open-chevron" data-lucide="chevron-right" aria-hidden="true"></i>${isCoach?`<button class="training-icon-button" onclick="event.stopPropagation(); editEventFromModal('${tr.id}')" title="Editar sesión"><i data-lucide="pencil"></i></button>`:''}</div></div>
    <details class="training-content" onclick="event.stopPropagation()" ${isNext?'open':''}><summary>Ver contenido de la sesión <i data-lucide="chevron-down"></i></summary><div class="training-plan"><h4>Objetivos y trabajo</h4><p>${(tr.plan||'El entrenador todavía no ha añadido una descripción.').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>${(tr.attachmentId||tr.sessionImage)?`<button class="training-file-preview" onclick="event.stopPropagation(); openSessionAttachment('${tr.id}')"><i data-lucide="file-search"></i> Abrir ${tr.attachmentType==='application/pdf'?'PDF':'archivo adjunto'}</button>`:''}</div></details>
    ${attendance}${rpe}
  </article>`;
}

function renderTrainingHistory(past,isCoach,playerId) {
  if (!past.length) return `<div class="training-empty"><i data-lucide="history"></i><h3>Aún no hay historial</h3><p>Los entrenamientos finalizados y sus valoraciones aparecerán aquí.</p></div>`;
  const rows=past.map(tr=>{
    const s=getTrainingRpeSummary(tr.id); const own=playerId?s.records.find(r=>r.playerId===playerId)?.rpeVal:null; const coach=Number.isFinite(Number(tr.coachRpe))?Number(tr.coachRpe):null;
    return `<button class="training-history-row" onclick="toggleTrainingHistoryDetail('${tr.id}')"><span><strong>${tr.title||'Entrenamiento'}</strong><small>${new Date(`${tr.date}T12:00:00`).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</small></span>${isCoach?`<span><small>Tu RPE</small><b>${coach??'—'}</b></span><span><small>Media equipo</small><b>${s.average===null?'—':s.average.toFixed(1)}</b></span><span><small>Respuestas</small><b>${s.count}</b></span>`:`<span><small>Mi RPE</small><b>${own??'—'}</b></span>`}<i data-lucide="chevron-down"></i></button><div id="training-history-${tr.id}" class="training-history-detail"></div>`;
  }).join('');
  return `<div class="training-history-intro"><div><h3>${isCoach?'Registro de percepción del esfuerzo':'Mis valoraciones de esfuerzo'}</h3><p>${isCoach?'Compara tu exigencia con la media del equipo y abre una sesión para consultar cada respuesta.':'Aquí quedan guardados todos los entrenamientos que hayas decidido puntuar.'}</p></div></div><div class="training-history-list">${rows}</div>`;
}

function toggleTrainingHistoryDetail(eventId) {
  const box=document.getElementById(`training-history-${eventId}`); if(!box)return;
  if(box.classList.contains('open')){box.classList.remove('open');box.innerHTML='';return;}
  const tr=(appState.events||[]).find(e=>e.id===eventId), s=getTrainingRpeSummary(eventId);
  const windowOpen = isRpeSubmissionWindowOpen(tr);
  if(isCoachUser()){
    const coachValue = Number.isFinite(Number(tr?.coachRpe)) ? Number(tr.coachRpe) : null;
    const coachBlock = coachValue !== null
      ? `<div class="training-own-record locked"><span>Tu percepción de intensidad<small>Registro cerrado</small></span><strong>${coachValue}/10</strong></div>`
      : windowOpen
        ? `<div class="training-history-coach-entry"><div><strong>Tu percepción de intensidad</strong><small>Disponible hasta las 23:59 de hoy.</small></div>${renderRpeScale(eventId,null,'coach')}</div>`
        : `<div class="training-rpe-locked"><i data-lucide="lock"></i> No registraste tu percepción el día del entrenamiento.</div>`;
    const playerRows=(appState.players||[]).map(p=>{
      const rec=s.records.find(r=>r.playerId===p.id);
      return `<div class="training-rpe-record-item"><img src="${p.photo||p.avatar||'assets/default_avatar.svg'}"><span>${p.name}<small>${rec?'Registro cerrado':'Sin respuesta'}</small></span>${rec?`<b>${rec.rpeVal}/10</b>`:`<div class="coach-rpe-add"><select id="coach-rpe-${eventId}-${p.id}" aria-label="RPE para ${p.name}">${Array.from({length:11},(_,i)=>`<option value="${i}" ${i===5?'selected':''}>${i}</option>`).join('')}</select><button type="button" onclick="addPlayerRpeByCoach('${eventId}','${p.id}')">Añadir</button></div>`}</div>`;
    }).join('');
    box.innerHTML=`${coachBlock}<div class="training-history-subheading"><strong>RPE de las jugadoras</strong><small>Puedes añadir registros que falten en cualquier momento. Los ya guardados no se modifican.</small></div><div class="training-rpe-records coach-entry-list">${playerRows}</div>`;
  }else{
    const u=getCurrentUser(), rec=s.records.find(r=>r.playerId===u?.playerId);
    box.innerHTML=rec
      ? `<div class="training-own-record locked"><span>Tu esfuerzo percibido<small>Registro enviado y cerrado</small></span><strong>${rec.rpeVal}/10</strong></div>`
      : windowOpen
        ? `<div class="training-history-player-entry"><div><strong>Registra tu esfuerzo percibido</strong><small>Disponible hasta las 23:59 de hoy.</small></div>${renderRpeScale(eventId,null,'player')}</div>`
        : `<p class="training-no-rpe"><i data-lucide="lock"></i> No se registró el RPE el día del entrenamiento y el plazo ya ha terminado.</p>`;
  }
  box.classList.add('open'); if(window.lucide)lucide.createIcons();
}

window.toggleTrainingHistoryDetail=toggleTrainingHistoryDetail;


function getSessionWellnessSnapshot(event) {
  const logs = (appState.wellnessLogs || []).filter(log =>
    log.sessionId === event.id || (!log.sessionId && (log.dateKey === event.date || log.date === event.date))
  );
  const scores = logs.map(log => {
    const fatigue = Number(log.fatigue ?? log.fatigueLevel ?? 0);
    const sleep = Number(log.sleepQuality ?? 0);
    const soreness = Number(log.soreness ?? log.muscleSoreness ?? 0);
    const stress = Number(log.stress ?? 0);
    const components = [fatigue, soreness, stress].filter(Number.isFinite);
    if (Number.isFinite(sleep) && sleep > 0) components.push(Math.max(0, 6 - sleep));
    return components.length ? components.reduce((a,b)=>a+b,0)/components.length : null;
  }).filter(v => v !== null);
  const average = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
  return { logs, average, count: logs.length, dateKey: event.date };
}

function getSessionAttendanceSummary(eventId) {
  const confirmations = (appState.trainingConfirmations || []).filter(c => c.eventId === eventId);
  const actual = (appState.attendanceData || []).filter(a => a.eventId === eventId);
  return {
    confirmations,
    yes: confirmations.filter(c=>c.status==='yes').length,
    no: confirmations.filter(c=>c.status==='no').length,
    pending: Math.max(0, (appState.players || []).length - confirmations.length),
    actual
  };
}

function escapeSessionText(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function openSessionCenter(eventId, returnTarget = 'training') {
  const session = (appState.events || []).find(e => e.id === eventId && e.type === 'Entrenamiento');
  if (!session) return;
  activeSessionId = eventId;
  activeSessionReturnTarget = returnTarget || 'training';
  const list = document.getElementById('session-center-list');
  const detail = document.getElementById('session-center-detail');
  if (list) list.hidden = true;
  const newSessionBtn = document.getElementById('btn-add-training-session');
  if (newSessionBtn) newSessionBtn.hidden = true;
  if (detail) detail.hidden = false;
  renderSessionCenterDetail();
  window.scrollTo({top:0,behavior:'smooth'});
}
window.openSessionCenter = openSessionCenter;

function closeSessionCenter(forceList = false) {
  const returnTarget = activeSessionReturnTarget || 'training';
  activeSessionId = null;
  activeSessionReturnTarget = 'training';
  const list = document.getElementById('session-center-list');
  const detail = document.getElementById('session-center-detail');
  if (list) list.hidden = false;
  const newSessionBtn = document.getElementById('btn-add-training-session');
  if (newSessionBtn) newSessionBtn.hidden = false;
  if (detail) { detail.hidden = true; detail.innerHTML = ''; }
  if (!forceList && (returnTarget === 'home' || returnTarget === 'home-portal')) {
    openModule('home-portal', { preserveReturnTarget: true });
    return;
  }
  renderTraining();
}
window.closeSessionCenter = closeSessionCenter;

function saveSessionCoachNotes(eventId) {
  if (!isCoachUser()) return;
  const session = (appState.events || []).find(e=>e.id===eventId);
  if (!session) return;
  session.coachNotes = document.getElementById('session-coach-notes')?.value.trim() || '';
  session.coachAssessment = document.getElementById('session-coach-assessment')?.value.trim() || '';
  session.updatedAt = new Date().toISOString();
  saveAppData(appState);
  showToast('Valoración de la sesión guardada');
  renderSessionCenterDetail();
}
window.saveSessionCoachNotes = saveSessionCoachNotes;

function saveSessionPlayerComment(eventId) {
  const user = getCurrentUser();
  if (!user?.playerId) return;
  const input = document.getElementById('session-player-comment');
  const text = input?.value.trim() || '';
  appState.sessionPlayerComments = appState.sessionPlayerComments || [];
  const existing = appState.sessionPlayerComments.find(c=>c.eventId===eventId && c.playerId===user.playerId);
  if (existing) { existing.text=text; existing.updatedAt=new Date().toISOString(); }
  else appState.sessionPlayerComments.push({id:`spc_${Date.now()}`,eventId,playerId:user.playerId,text,createdAt:new Date().toISOString()});
  saveAppData(appState);
  showToast('Comentario guardado');
  renderSessionCenterDetail();
}
window.saveSessionPlayerComment = saveSessionPlayerComment;

function renderSessionCenterDetail() {
  const box = document.getElementById('session-center-detail');
  const session = (appState.events || []).find(e=>e.id===activeSessionId);
  if (!box || !session) return;
  const isCoach = isCoachUser();
  const user = getCurrentUser();
  const playerId = user?.playerId;
  const finished = isTrainingFinished(session);
  const rpe = getTrainingRpeSummary(session.id);
  const coachRpe = Number.isFinite(Number(session.coachRpe)) ? Number(session.coachRpe) : null;
  const ownRpe = playerId ? rpe.records.find(r=>r.playerId===playerId)?.rpeVal : null;
  const att = getSessionAttendanceSummary(session.id);
  const wellness = getSessionWellnessSnapshot(session);
  const weeklyWellnessStatus = playerId ? getPlayerDailyStatus(playerId) : { isContestada:false };
  const dateLabel = new Date(`${session.date}T12:00:00`).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const playerComment = playerId ? (appState.sessionPlayerComments||[]).find(c=>c.eventId===session.id&&c.playerId===playerId)?.text||'' : '';
  const comments = (appState.sessionPlayerComments||[]).filter(c=>c.eventId===session.id && c.text);
  const diff = coachRpe!==null && rpe.average!==null ? rpe.average-coachRpe : null;
  const comparison = diff===null ? 'Faltan valoraciones para comparar.' : Math.abs(diff)<0.5 ? 'La percepción del equipo coincide con la tuya.' : diff>0 ? `El equipo la percibió ${Math.abs(diff).toFixed(1)} puntos más exigente.` : `El equipo la percibió ${Math.abs(diff).toFixed(1)} puntos menos exigente.`;

  box.innerHTML = `<div class="session-detail-shell">
    <header class="session-detail-hero">
      <button class="session-back-button" onclick="closeSessionCenter()" aria-label="Volver a la lista de sesiones" title="Volver"><i data-lucide="arrow-left"></i></button>
      <div><span class="session-detail-kicker">${finished?'Sesión finalizada':'Próxima sesión'}</span><h2>${escapeSessionText(session.title||'Entrenamiento')}</h2><p>${dateLabel} · ${session.time||'--:--'} · ${escapeSessionText(session.location||'Sin ubicación')}</p></div>
      ${isCoach?`<button class="btn btn-outline btn-sm" onclick="editEventFromModal('${session.id}')"><i data-lucide="pencil"></i> Editar</button>`:''}
    </header>

    <div class="session-detail-grid">
      <section class="session-panel session-panel-wide"><div class="session-panel-title"><i data-lucide="target"></i><div><span>Antes de la sesión</span><h3>Objetivos y contenido</h3></div></div><div class="session-rich-text">${escapeSessionText(session.plan||'Todavía no se ha añadido una descripción.').replace(/\n/g,'<br>')}</div>${(session.attachmentId||session.sessionImage)?`<button class="training-file-preview" onclick="openSessionAttachment('${session.id}')"><i data-lucide="file-search"></i> Abrir ${session.attachmentType==='application/pdf'?'PDF':'archivo adjunto'}${session.attachmentName?` · ${escapeSessionText(session.attachmentName)}`:''}</button>`:'<p class="session-muted">Sin archivo adjunto.</p>'}</section>

      ${isCoach?`<section class="session-panel"><div class="session-panel-title"><i data-lucide="users"></i><div><span>Participación</span><h3>Asistencia</h3></div></div><div class="session-metric-row"><div><strong>${att.yes}</strong><span>Confirmadas</span></div><div><strong>${att.no}</strong><span>Bajas</span></div><div><strong>${att.pending}</strong><span>Pendientes</span></div></div><button class="btn btn-outline btn-sm btn-block" onclick="openVerifyAttendanceModal('${session.id}')"><i data-lucide="clipboard-check"></i> Pasar lista</button></section>`:''}

      ${isCoach?`<section class="session-panel"><div class="session-panel-title"><i data-lucide="heart-pulse"></i><div><span>Estado previo</span><h3>Bienestar semanal</h3></div></div><div class="session-primary-number">${wellness.count}</div><p>${wellness.count===1?'respuesta registrada':'respuestas registradas'} · ${wellness.average===null?'sin índice medio':`índice medio ${wellness.average.toFixed(1)}`}</p><button class="btn btn-ghost btn-sm btn-block" onclick="openModule('wellness')">Abrir seguimiento de bienestar</button></section>`:`<section class="session-panel session-wellness-player"><div class="session-panel-title"><i data-lucide="heart-pulse"></i><div><span>Seguimiento de carga</span><h3>Bienestar semanal</h3></div></div>${weeklyWellnessStatus.isContestada?`<div class="training-rpe-submitted"><i data-lucide="circle-check"></i><div><strong>Bienestar de hoy ya contestado</strong><span>Has completado la valoración de hoy.</span></div></div>`:`<p>Registra una vez por semana cómo te encuentras en una escala de 0 a 5.</p>${isWellnessWindowOpen()?`<button class="btn btn-primary btn-sm btn-block" onclick="openAddWellnessModal()"><i data-lucide="plus-circle"></i> Registrar bienestar de hoy</button>`:`<div class="training-rpe-locked"><i data-lucide="calendar-clock"></i> Disponible de lunes a martes a las 23:59.</div>`}`}<button class="btn btn-ghost btn-sm btn-block" onclick="openModule('wellness')">Ver bienestar</button></section>`}

      <section class="session-panel session-panel-wide"><div class="session-panel-title"><i data-lucide="activity"></i><div><span>Después de la sesión</span><h3>${isCoach?'Percepción del esfuerzo':'Mi percepción del esfuerzo'}</h3></div></div>
        ${isCoach?(finished?`<div class="session-rpe-compare"><div><span>Entrenador</span><strong>${coachRpe===null?'—':coachRpe}</strong><div class="training-rpe-track"><i style="width:${(coachRpe||0)*10}%"></i></div></div><div><span>Media jugadoras</span><strong>${rpe.average===null?'—':rpe.average.toFixed(1)}</strong><div class="training-rpe-track players"><i style="width:${(rpe.average||0)*10}%"></i></div><small>${rpe.count} respuesta${rpe.count===1?'':'s'}</small></div></div><p class="session-comparison-message">${comparison}</p>${renderRpeScale(session.id,coachRpe,'coach')}`:'<div class="training-rpe-locked"><i data-lucide="lock"></i> Se habilitará al terminar la sesión.</div>'):(finished?(ownRpe!==null&&ownRpe!==undefined?`<div class="training-rpe-submitted"><i data-lucide="circle-check"></i><div><strong>Percepción del esfuerzo registrada</strong><span>Has valorado esta sesión con un ${ownRpe}/10.</span></div></div>`:renderRpeScale(session.id,null,'player')):'<div class="training-rpe-locked"><i data-lucide="lock"></i> Se habilitará al terminar la sesión.</div>')}
      </section>

      ${isCoach?`<section class="session-panel session-panel-wide"><div class="session-panel-title"><i data-lucide="notebook-pen"></i><div><span>Solo cuerpo técnico</span><h3>Valoración y continuidad</h3></div></div><label class="form-label" for="session-coach-assessment">Valoración del entrenamiento</label><textarea id="session-coach-assessment" class="form-control" rows="3" placeholder="Qué funcionó, qué no y cómo respondió el equipo...">${escapeSessionText(session.coachAssessment||'')}</textarea><label class="form-label" for="session-coach-notes">Notas para la próxima sesión</label><textarea id="session-coach-notes" class="form-control" rows="3" placeholder="Ajustes, incidencias o ideas para continuar...">${escapeSessionText(session.coachNotes||'')}</textarea><button class="btn btn-primary btn-sm" onclick="saveSessionCoachNotes('${session.id}')"><i data-lucide="save"></i> Guardar valoración</button></section>`:`<section class="session-panel session-panel-wide"><div class="session-panel-title"><i data-lucide="message-square-text"></i><div><span>Opcional y privado</span><h3>Mi comentario</h3></div></div><textarea id="session-player-comment" class="form-control" rows="3" placeholder="Puedes explicar cómo te sentiste o añadir una observación para el entrenador.">${escapeSessionText(playerComment)}</textarea><button class="btn btn-primary btn-sm" onclick="saveSessionPlayerComment('${session.id}')"><i data-lucide="save"></i> Guardar comentario</button></section>`}

      ${isCoach?`<section class="session-panel session-panel-wide"><div class="session-panel-title"><i data-lucide="messages-square"></i><div><span>Feedback del equipo</span><h3>Comentarios de jugadoras</h3></div></div>${comments.length?`<div class="session-comments-list">${comments.map(c=>{const p=(appState.players||[]).find(x=>x.id===c.playerId);return `<div><img src="${p?.photo||'assets/default_avatar.svg'}"><span><strong>${escapeSessionText(p?.name||'Jugadora')}</strong><p>${escapeSessionText(c.text)}</p></span></div>`}).join('')}</div>`:'<p class="session-muted">No hay comentarios en esta sesión.</p>'}</section>`:''}
    </div>
  </div>`;
  if (window.lucide) lucide.createIcons();
}
window.renderSessionCenterDetail = renderSessionCenterDetail;

function openAddEventModalWithType(type) {
  if (!isCoachUser()) return;
  currentEditingEventId = null;
  document.getElementById("form-event").reset();
  document.getElementById("modal-event-form-title").textContent = "Agendar Nuevo Evento";
  document.getElementById("event-type-input").value = type;
  document.getElementById("modal-add-event").classList.add("active");
}

/* ==========================================================================
   5. PLAN DE JUEGO (PIZARRA DE SCOUTING - 4 PISTAS)
   ========================================================================== */
function getDefaultScoutingPlan() {
  return {
    opponentReceivers: Array.from({length:4}, (_,i)=>({name:'', level:i===0?'red':i===1?'yellow':'green', depth:'long'})),
    attackers: {
      z4a:{name:'Receptora Z4 · 1', directions:[], tipZone:8, visibleToPlayers:false}, z4b:{name:'Receptora Z4 · 2', directions:[], tipZone:8, visibleToPlayers:false},
      z2:{name:'Opuesta Z2', directions:[], tipZone:8, visibleToPlayers:false}, z3a:{name:'Central Z3 · 1', directions:[], tipZone:8, visibleToPlayers:false}, z3b:{name:'Central Z3 · 2', directions:[], tipZone:8, visibleToPlayers:false}
    },
    serveTargets: {z1:'none',z2:'none',z3:'none',z4:'none',z5:'none',z6:'none',z7:'none',z8:'none',z9:'none'},
    servePct: {z1:0,z2:0,z3:0,z4:0,z5:0,z6:0,z7:0,z8:0,z9:0},
    servePlayerTarget: '',
    hideServeObjectives: false
  };
}
function getScoutingMatches() {
  return (appState.events || []).filter(e => ['Partido','Amistoso'].includes(e.type)).sort((a,b)=>new Date(a.date)-new Date(b.date));
}
function normalizeScoutingPlan(raw={}) {
  const d=getDefaultScoutingPlan();
  const receivers=(Array.isArray(raw.opponentReceivers)?raw.opponentReceivers:d.opponentReceivers).slice(0,4);
  while(receivers.length<4) receivers.push({...d.opponentReceivers[receivers.length]});
  const attackers={...d.attackers};
  Object.keys(attackers).forEach(k=> {
    const incoming=raw.attackers?.[k]||{};
    let directions=Array.isArray(incoming.directions)?incoming.directions:[];
    if(k.startsWith('z3')) {
      directions=directions.map(d=>d==='long'?'attack1':d==='short'||d==='medium'||d==='line'?'attack5':d).filter((d,i,a)=>['attack5','attack1','tip'].includes(d)&&a.indexOf(d)===i);
    }
    const tipZone=volleyballZoneOrder.includes(Number(incoming.tipZone))?Number(incoming.tipZone):8;
    attackers[k]={...attackers[k], ...incoming, directions, tipZone, visibleToPlayers:typeof incoming.visibleToPlayers==='boolean'?incoming.visibleToPlayers:directions.length>0};
  });
  const servePct={...d.servePct};
  Object.keys(servePct).forEach(k=>servePct[k]=Number(raw.servePct?.[k] ?? (raw.serveZones?.[k]?100:0))||0);
  const serveTargets={...d.serveTargets};
  Object.keys(serveTargets).forEach(k=>{
    const incoming=raw.serveTargets?.[k];
    serveTargets[k]=['primary','secondary'].includes(incoming)?incoming:'none';
  });
  return {...d,...raw,opponentReceivers:receivers,attackers,servePct,serveTargets,servePlayerTarget:String(raw.servePlayerTarget||''),hideServeObjectives:Boolean(raw.hideServeObjectives)};
}
function getActiveScoutingRecord() {
  const matches=getScoutingMatches();
  if(!activeScoutingMatchId || !matches.some(m=>m.id===activeScoutingMatchId)) {
    const upcoming=matches.find(m=>new Date(`${m.date}T23:59:59`)>=new Date());
    activeScoutingMatchId=(upcoming||matches[0])?.id||null;
  }
  appState.matchScouting=appState.matchScouting||{};
  if(!activeScoutingMatchId) return {draftPlan:getDefaultScoutingPlan(),publishedPlan:null,status:'empty'};
  const raw=appState.matchScouting[activeScoutingMatchId]||appState.scouting||{};
  let record;
  if(raw && (raw.draftPlan || raw.publishedPlan || raw.status)) {
    record={
      draftPlan:normalizeScoutingPlan(raw.draftPlan||{}),
      publishedPlan:raw.publishedPlan?normalizeScoutingPlan(raw.publishedPlan):null,
      status:raw.status==='archived'?'archived':(raw.status==='published'&&raw.publishedPlan?'published':'draft'),
      publishedAt:raw.publishedAt||null,
      archivedAt:raw.archivedAt||null
    };
  } else {
    record={draftPlan:normalizeScoutingPlan(raw),publishedPlan:null,status:'draft',publishedAt:null,archivedAt:null};
  }
  appState.matchScouting[activeScoutingMatchId]=record;
  return record;
}
function getActiveScoutingPlan() {
  const record=getActiveScoutingRecord();
  if(isCoachUser()) return scoutingPreviewMode ? (record.draftPlan||getDefaultScoutingPlan()) : record.draftPlan;
  return record.status==='published' ? (record.publishedPlan || null) : null;
}
const scoutDirLabels={line:'Línea',long:'Diagonal larga',medium:'Diagonal media',short:'Diagonal corta',tip:'Finta'};
const scoutCentralDirLabels={attack5:'Ataque a 5',attack1:'Ataque a 1',tip:'Finta'};
function getScoutDirectionLabels(key){ return key.startsWith('z3') ? scoutCentralDirLabels : scoutDirLabels; }
const scoutAttackerLabels={z4a:'Atacante Z4 · 1',z4b:'Atacante Z4 · 2',z2:'Atacante Z2',z3a:'Central Z3 · 1',z3b:'Central Z3 · 2'};
function receiverColor(level){return level==='red'?'#ef4444':level==='green'?'#22c55e':'#eab308';}
const volleyballZoneOrder=[4,3,2,7,8,9,5,6,1];
function renderTacticalCourtBase({extraClass='',ariaLabel='',content=''}){
  return `<div class="volleyball-court-half tactical-court ${extraClass}" role="img" aria-label="${escapeSessionText(ariaLabel)}">
    <div class="half-court-net"><span></span></div>
    <div class="half-court-attack-line"></div>
    ${content}
  </div>`;
}
function nextServeTargetPriority(value){return value==='none'?'secondary':value==='secondary'?'primary':'none';}
function setServeTargetPriority(zone){
  if(!isCoachUser()||scoutingPreviewMode)return;
  const record=getActiveScoutingRecord(), plan=record.draftPlan;
  const key='z'+zone;
  plan.serveTargets[key]=nextServeTargetPriority(plan.serveTargets[key]||'none');
  record.draftPlan=plan; appState.matchScouting[activeScoutingMatchId]=record; saveAppData(appState); renderTactics();
}
window.setServeTargetPriority=setServeTargetPriority;
function renderServeObjectiveCourt(plan,isCoach){
  const cells=volleyballZoneOrder.map(zone=>{
    const priority=plan.serveTargets?.['z'+zone]||'none';
    const label=priority==='primary'?'Principal':priority==='secondary'?'Alternativa':'Sin objetivo';
    const tag=priority==='none'?'':`<span>${label}</span>`;
    if(isCoach){
      return `<button type="button" class="tactical-zone-cell serve-target-zone is-${priority}" onclick="setServeTargetPriority(${zone})" aria-label="Zona ${zone}: ${label}. Pulsa para cambiar"><strong>${zone}</strong>${tag}</button>`;
    }
    return `<div class="tactical-zone-cell serve-target-zone is-${priority}"><strong>${zone}</strong>${tag}</div>`;
  }).join('');
  const court=renderTacticalCourtBase({extraClass:'serve-objective-volley',ariaLabel:'Media pista de voleibol dividida en nueve zonas con objetivos de saque',content:`<div class="tactical-zone-grid">${cells}</div>`});
  return `<div class="serve-objective-visual-wrap">${court}
    <div class="serve-objective-legend"><span><i class="primary-target"></i> Objetivo principal</span><span><i class="secondary-target"></i> Alternativa</span></div>
    <p class="scout-help">${isCoach?'Pulsa una zona para alternar entre sin objetivo, alternativa y objetivo principal.':'Las zonas resaltadas indican el plan de saque publicado.'}</p>
  </div>`;
}
// Sistema único de anclajes tácticos para una media pista 9 x 9 m.
// Lectura de izquierda a derecha y de la red al fondo:
// 4 · 3 · 2 / 7 · 8 · 9 / 5 · 6 · 1
const volleyballZoneAnchors={
  4:[16.67,25], 3:[50,25], 2:[83.33,25],
  7:[16.67,55], 8:[50,55], 9:[83.33,55],
  5:[16.67,85], 6:[50,85], 1:[83.33,85]
};
function getVolleyballZoneAnchor(zone){
  return volleyballZoneAnchors[zone] || volleyballZoneAnchors[6];
}
function attackOriginForCard(key){
  // La pista representa nuestro campo mirando al rival: la Z4 rival queda
  // enfrentada a nuestra Z2 (derecha) y la Z2 rival a nuestra Z4 (izquierda).
  if(key.startsWith('z4')) return [88,8];
  if(key==='z2') return [12,8];
  return [50,8];
}
function attackDirectionEndForCard(key,dir,tipZone=8){
  // Las trayectorias también se leen desde nuestro campo, por lo que los
  // atacantes de Z4 rival parten visualmente desde la derecha y los de Z2
  // rival desde la izquierda.
  const isLeft=key==='z2';
  const isRight=key.startsWith('z4');
  const isCentral=key.startsWith('z3');

  if(isCentral && dir==='attack5') return getVolleyballZoneAnchor(5);
  if(isCentral && dir==='attack1') return getVolleyballZoneAnchor(1);
  if(dir==='tip') return getVolleyballZoneAnchor(tipZone);
  if(dir==='line') return getVolleyballZoneAnchor(isLeft?5:isRight?1:6);
  if(dir==='long') return getVolleyballZoneAnchor(isLeft?1:isRight?5:1);
  if(dir==='medium') return getVolleyballZoneAnchor(isLeft?9:isRight?7:9);
  if(dir==='short') return getVolleyballZoneAnchor(isLeft?2:isRight?4:2);
  return getVolleyballZoneAnchor(6);
}
function renderSingleAttackCourt(key, attacker, index){
  const normalColor='#1d4ed8';
  const tipColor='#dc2626';
  const contactColor=normalColor;
  const [x,y]=attackOriginForCard(key);
  const directions=attacker.directions||[];
  const paths=directions.map((dir,j)=>{
    const [x2,y2]=attackDirectionEndForCard(key,dir,attacker.tipZone||8);
    const isTip=dir==='tip';
    const strokeColor=isTip?tipColor:normalColor;
    const midX=(x+x2)/2;
    const midY=(y+y2)/2;
    const directionSign=x2>=x?1:-1;
    const curveOffset=isTip?7:Math.min(4.5,Math.abs(x2-x)*0.045+1.5);
    const controlX=midX+(directionSign*curveOffset);
    const controlY=midY-(isTip?5:2.2);
    const line=`<path d="M ${x} ${y+2} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${x2} ${y2}" fill="none" stroke="${strokeColor}" stroke-width="1.8" ${isTip?'stroke-dasharray="5 4"':''} stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${isTip?'attack-tip-arrow':'attack-normal-arrow'}-${index})"/>`;
    return `<g><title>${escapeSessionText(attacker.name||scoutAttackerLabels[key])}: ${(getScoutDirectionLabels(key)[dir]||dir)}</title>${line}</g>`;
  }).join('');
  return `<div class="attack-card-court" aria-label="Direcciones de ataque de ${escapeSessionText(attacker.name||scoutAttackerLabels[key])}">
    <div class="attack-court-net"><span></span></div>
    <div class="attack-line attack-line-3m"></div>
    <div class="attack-line attack-line-end"></div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
      <defs>
        <marker id="attack-normal-arrow-${index}" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${normalColor}"/></marker>
        <marker id="attack-tip-arrow-${index}" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${tipColor}"/></marker>
      </defs>
      ${paths}
    </svg>
    <div class="attack-contact" style="left:${x}%;top:${y}%;--attack-color:${contactColor}" title="Punto de contacto en la red"><span>${key.startsWith('z4')?'Z4':key==='z2'?'Z2':'Z3'}</span></div>
    ${!directions.length?'<div class="attack-card-empty">Sin direcciones seleccionadas</div>':''}
  </div>`;
}

function updateAttackVisibilityLabel(key,isVisible){
  const label=document.getElementById(`attacker-visible-label-${key}`);
  if(!label)return;
  label.innerHTML=`<i data-lucide="${isVisible?'eye':'eye-off'}"></i>${isVisible?'Visible':'Oculto'}`;
  const card=label.closest('.attack-scout-card');
  if(card){card.classList.toggle('is-published',isVisible);card.classList.toggle('is-hidden',!isVisible);}
  if(window.lucide)lucide.createIcons();
}
window.updateAttackVisibilityLabel=updateAttackVisibilityLabel;
function toggleTipZoneSelector(key,isEnabled){
  const wrap=document.getElementById(`attacker-tip-zone-wrap-${key}`);
  if(wrap)wrap.classList.toggle('is-visible',Boolean(isEnabled));
}
window.toggleTipZoneSelector=toggleTipZoneSelector;

function renderAttackCards(plan,isCoach){
  const preferredOrder=['z4a','z4b','z2','z3a','z3b'];
  const entries=preferredOrder.filter(key=>plan.attackers[key]).map(key=>[key,plan.attackers[key]]);
  const visibleEntries=isCoach?entries:entries.filter(([,a])=>a.visibleToPlayers && (a.directions||[]).length);
  if(!visibleEntries.length) return `<div class="player-plan-empty"><i data-lucide="eye-off"></i><p>No hay patrones de ataque publicados para este partido.</p></div>`;
  return `<div class="attack-cards-grid ${visibleEntries.length===1?'one-card':visibleEntries.length===2?'two-cards':''}">${visibleEntries.map(([key,a])=>{
    const idx=entries.findIndex(([k])=>k===key);
    return `<article class="attack-scout-card ${a.visibleToPlayers?'is-published':'is-hidden'}">
      <header class="attack-scout-card-head">
        <div><span class="attack-role">${key.startsWith('z4')?'Receptora · Z4':key==='z2'?'Opuesta · Z2':'Central · Z3'}</span>${isCoach?`<input id="attacker-name-${key}" class="form-control attack-name-input" value="${escapeSessionText(a.name||scoutAttackerLabels[key])}">`:`<h4>${escapeSessionText(a.name||scoutAttackerLabels[key])}</h4>`}</div>
        ${isCoach?`<label class="attack-visibility-toggle" title="Mostrar u ocultar esta pista a las jugadoras"><input id="attacker-visible-${key}" type="checkbox" ${a.visibleToPlayers?'checked':''} onchange="updateAttackVisibilityLabel('${key}',this.checked)"><span id="attacker-visible-label-${key}"><i data-lucide="${a.visibleToPlayers?'eye':'eye-off'}"></i>${a.visibleToPlayers?'Visible':'Oculto'}</span></label>`:''}
      </header>
      ${isCoach?`<div class="attack-direction-options">${Object.entries(getScoutDirectionLabels(key)).map(([dir,label])=>`<label class="attack-direction-option"><input type="checkbox" id="attacker-${key}-${dir}" ${(a.directions||[]).includes(dir)?'checked':''} ${dir==='tip'?`onchange="toggleTipZoneSelector('${key}',this.checked)"`:''}><span>${label}</span></label>`).join('')}</div><div id="attacker-tip-zone-wrap-${key}" class="attack-tip-zone-control ${(a.directions||[]).includes('tip')?'is-visible':''}"><label for="attacker-tip-zone-${key}"><i data-lucide="map-pin"></i> Zona de finta</label><select id="attacker-tip-zone-${key}" class="form-control">${volleyballZoneOrder.map(zone=>`<option value="${zone}" ${Number(a.tipZone||8)===zone?'selected':''}>Zona ${zone}</option>`).join('')}</select></div>`:''}
      ${renderSingleAttackCourt(key,a,idx)}
      ${!isCoach?`<div class="player-attack-legend">${(a.directions||[]).map(d=>`<span>${getScoutDirectionLabels(key)[d]||d}${d==='tip'?` · Z${a.tipZone||8}`:''}</span>`).join('')}</div>`:''}
    </article>`;
  }).join('')}</div>`;
}
function heatForPct(v,max){if(!v)return 'radial-gradient(circle at 50% 50%, rgba(148,163,184,.10) 0%, rgba(148,163,184,.04) 58%, transparent 82%)'; const ratio=max?Math.min(1,v/max):0; const alpha=(.22+ratio*.62).toFixed(2); return `radial-gradient(circle at 50% 50%, rgba(244,63,94,${alpha}) 0%, rgba(244,63,94,${(.10+ratio*.24).toFixed(2)}) 52%, rgba(244,63,94,.03) 78%, transparent 100%)`; }
function renderServeHeat(plan,isCoach){
 const vals=Object.values(plan.servePct).map(Number), max=Math.max(...vals,1);
 const cells=volleyballZoneOrder.map(z=>{const v=Number(plan.servePct['z'+z])||0;return `<label class="tactical-zone-cell serve-zone-cell" style="background:${heatForPct(v,max)}"><strong>${z}</strong><span>${v.toFixed(0)}%</span>${isCoach?`<input id="serve-pct-z${z}" type="number" min="0" max="100" step="1" value="${v}" aria-label="Porcentaje de saques a zona ${z}">`:''}</label>`}).join('');
 const court=renderTacticalCourtBase({extraClass:'serve-heat-volleyball',ariaLabel:'Media pista de voleibol dividida en nueve zonas con tendencias de saque rival',content:`<div class="tactical-zone-grid">${cells}</div>`});
 return `<div class="serve-heat-volleyball-wrap">${court}
   <div class="serve-zone-legend"><span>Menos frecuente</span><i></i><span>Más frecuente</span></div>
   <p class="scout-help">${isCoach?'Introduce una estimación por cada una de las nueve zonas.':'Las zonas más intensas indican dónde suele sacar más el rival.'}</p>
 </div>`;
}

function getDirectionSummaryLabel(dir, attackerKey){
  const labels={line:'línea',long:'diagonal larga',medium:'diagonal media',short:'diagonal corta',tip:'finta'};
  const central={zone5:'ataque a zona 5',zone1:'ataque a zona 1'};
  return central[dir]||labels[dir]||dir;
}
function buildPlayerScoutingSummary(plan){
  const items=[];
  Object.entries(plan.attackers||{}).forEach(([key,a])=>{
    if(!a.visibleToPlayers || !(a.directions||[]).length) return;
    const who=(a.name||scoutAttackerLabels[key]||'Atacante').trim();
    const dirs=(a.directions||[]).map(d=>{
      if(d==='medium') return `${getDirectionSummaryLabel(d,key)} a zona ${key.startsWith('z4')?9:7}`;
      if(d==='short') return `${getDirectionSummaryLabel(d,key)} a zona ${key.startsWith('z4')?2:4}`;
      if(d==='tip') return `finta a zona ${Number(a.tipZone||8)}`;
      return getDirectionSummaryLabel(d,key);
    });
    items.push(`<li><strong>${escapeSessionText(who)}</strong>: ${escapeSessionText(dirs.join(' y '))}</li>`);
  });
  const topServe=Object.entries(plan.servePct||{}).map(([k,v])=>({z:k.replace('z',''),v:Number(v)||0})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,2);
  if(topServe.length) items.push(`<li><strong>Tendencia de saque rival</strong>: zonas ${topServe.map(x=>x.z).join(' y ')}</li>`);
  const targets=String(plan.servePlayerTarget||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
  if(targets.length) items.push(`<li><strong>Objetivo de saque</strong>: sacar a ${escapeSessionText(targets.join(' y '))}</li>`);
  return `<section class="player-plan-summary"><div class="player-plan-summary-head"><i data-lucide="list-checks"></i><div><span>Resumen rápido</span><h3>Qué debemos recordar</h3></div></div>${items.length?`<ul>${items.join('')}</ul>`:'<p>El entrenador todavía no ha añadido consignas al resumen.</p>'}</section>`;
}
function renderTactics() {
  const matches=getScoutingMatches(), select=document.getElementById('scouting-match-select');
  if(select){select.innerHTML=matches.length?matches.map(m=>`<option value="${m.id}">${escapeSessionText(m.title)} · ${m.date}</option>`).join(''):'<option value="">No hay partidos creados</option>'; if(!activeScoutingMatchId) activeScoutingMatchId=matches[0]?.id||null; select.value=activeScoutingMatchId||''; select.disabled=scoutingPreviewMode;}
  const empty=document.getElementById('scouting-no-match'), content=document.getElementById('scouting-plan-content');
  if(empty) empty.hidden=matches.length>0; if(content) content.hidden=matches.length===0; if(!matches.length)return;
  const isCoach=isCoachUser(), record=getActiveScoutingRecord(), plan=getActiveScoutingPlan(), root=document.getElementById('scouting-interactive-root');
  if(!root)return;
  const playerLikeView=!isCoach || scoutingPreviewMode;
  if (!isCoach && record?.status === 'published' && record?.publishedPlan) markCurrentPlayerPlanRead(record);
  const activeMatch=matches.find(m=>m.id===activeScoutingMatchId);
  if(!plan){
    root.innerHTML=`<div class="player-plan-unpublished"><i data-lucide="lock"></i><h3>Plan todavía no publicado</h3><p>El cuerpo técnico aún está preparando el plan de este partido.</p></div>`;
    const save=document.getElementById('save-scouting-plan'); if(save)save.style.display='none';
    if(window.lucide)lucide.createIcons(); return;
  }
  const receiverEditor=plan.opponentReceivers.map((r,i)=>`<div class="receiver-editor-row"><span class="receiver-index">${i+1}</span><input id="receiver-name-${i}" class="form-control" value="${escapeSessionText(r.name)}" placeholder="Receptora ${i+1}" ${!playerLikeView?`onchange="updateOpponentReceiverField(${i},'name',this.value)"`:'readonly'}><div class="receiver-color-picker">${['red','yellow','green'].map(l=>`<button type="button" class="receiver-level ${r.level===l?'active':''} ${l}" onclick="setOpponentReceiverLevel(${i},'${l}')" ${!playerLikeView?'':'disabled'} title="${l}"></button>`).join('')}</div><select id="receiver-depth-${i}" class="form-control" ${!playerLikeView?`onchange="updateOpponentReceiverField(${i},'depth',this.value)"`:'disabled'}><option value="short" ${r.depth==='short'?'selected':''}>Corta · 3–5 m</option><option value="medium" ${r.depth==='medium'?'selected':''}>Media · 5–7 m</option><option value="long" ${r.depth==='long'?'selected':''}>Larga · 7–8 m</option></select></div>`).join('');
  const statusText=record.status==='published'?'Publicado':record.status==='archived'?'Archivado':'Borrador';
  root.innerHTML=`
    ${isCoach?`<div class="scouting-publish-bar ${scoutingPreviewMode?'is-preview':''}"><div class="scouting-status"><span class="status-dot ${record.status}"></span><div><small>Estado del plan</small><strong>${scoutingPreviewMode?'Vista previa de jugadoras':statusText}</strong></div></div><div class="scouting-publish-actions">${scoutingPreviewMode?`<button class="btn btn-outline" onclick="toggleScoutingPreview(false)"><i data-lucide="arrow-left"></i> Volver a editar</button>`:`<button class="btn btn-outline" onclick="toggleScoutingPreview(true)"><i data-lucide="eye"></i> Vista previa</button>${record.status==='archived'?`<button class="btn btn-outline" onclick="restoreScoutingPlan()"><i data-lucide="archive-restore"></i> Recuperar borrador</button>`:`<button class="btn btn-primary" onclick="publishScoutingPlan()"><i data-lucide="send"></i> ${record.status==='published'?'Actualizar publicación':'Publicar plan'}</button><button class="btn btn-outline danger-soft" onclick="archiveScoutingPlan()"><i data-lucide="archive"></i> Archivar</button>`}`}</div></div>`:''}
    ${isCoach && record.status==='published' ? renderPlanReadTracker(record) : ''}
    ${playerLikeView?`<div class="player-plan-heading"><span>${escapeSessionText(activeMatch?.date||'')}</span><h2>${escapeSessionText(activeMatch?.title||'Plan del partido')}</h2><p>${isCoach?'Así lo verán las jugadoras.':'Plan publicado por el cuerpo técnico.'}</p></div>${buildPlayerScoutingSummary(plan)}`:''}
    <section class="scout-section attack-module-section ${playerLikeView?'player-clean-court':''}"><div class="scout-section-head"><span>1</span><div><h3>Preferencias de ataque rival</h3><p>${playerLikeView?'Patrones principales publicados por el entrenador.':'Configura cada atacante por separado y decide qué pistas verán las jugadoras.'}</p></div></div>${renderAttackCards(plan,!playerLikeView)}</section>
    <section class="scout-section ${playerLikeView?'player-clean-court':''}"><div class="scout-section-head"><span>2</span><div><h3>Tendencias de saque rival</h3><p>${playerLikeView?'Zonas hacia las que suele sacar el rival.':'Introduce el porcentaje estimado de saque hacia cada zona.'}</p></div></div>${renderServeHeat(plan,!playerLikeView)}</section>
    ${(!playerLikeView || !plan.hideServeObjectives) ? `<section class="scout-section serve-target-text-section"><div class="scout-section-head"><span>3</span><div><h3>Objetivo de saque</h3><p>${playerLikeView?'Jugadoras a las que debemos dirigir el saque.':'Escribe una o dos jugadoras, separadas por coma.'}</p></div></div>${!playerLikeView?`<label class="serve-visibility-toggle"><input id="hide-serve-objectives-input" type="checkbox" ${plan.hideServeObjectives?'checked':''}><span><strong>Ocultar este objetivo a las jugadoras</strong><small>No aparecerá en el plan ni en su dashboard.</small></span></label>`:''}<div class="serve-player-target"><label for="serve-player-target-input">Sacar a:</label>${playerLikeView?`<strong>${escapeSessionText(plan.servePlayerTarget||'Sin jugadora indicada')}</strong>`:`<input id="serve-player-target-input" class="form-control" value="${escapeSessionText(plan.servePlayerTarget||'')}" placeholder="Ej.: Juana (22), Marta (7)">`}</div></section>` : ''}`;
  const save=document.getElementById('save-scouting-plan'); if(save)save.style.display=isCoach&&!scoutingPreviewMode?'inline-flex':'none';
  if(window.lucide)lucide.createIcons();
}
function selectScoutingMatch(matchId){activeScoutingMatchId=matchId;scoutingPreviewMode=false;renderTactics();}
window.selectScoutingMatch=selectScoutingMatch;
function setOpponentReceiverLevel(index,level){if(!isCoachUser()||scoutingPreviewMode)return;const record=getActiveScoutingRecord(),p=record.draftPlan;p.opponentReceivers[index].level=level;record.draftPlan=p;appState.matchScouting[activeScoutingMatchId]=record;saveAppData(appState);renderTactics();}
window.setOpponentReceiverLevel=setOpponentReceiverLevel;

function updateOpponentReceiverField(index,field,value){
  if(!isCoachUser())return;
  const record=getActiveScoutingRecord(), p=record.draftPlan;
  if(!p.opponentReceivers[index])return;
  p.opponentReceivers[index][field]=field==='name'?String(value||'').trim():value;
  record.draftPlan=p; record.status=record.publishedPlan?'published':'draft'; appState.matchScouting[activeScoutingMatchId]=record;
  saveAppData(appState);
  renderTactics();
}
window.updateOpponentReceiverField=updateOpponentReceiverField;
window.saveScoutingData=function(showMessage=true){
 if(!isCoachUser()||scoutingPreviewMode)return; if(!activeScoutingMatchId)return showToast('Selecciona un partido.','error');
 const record=getActiveScoutingRecord(), p=record.draftPlan;
 p.servePlayerTarget=document.getElementById('serve-player-target-input')?.value.trim() ?? p.servePlayerTarget ?? '';
 p.hideServeObjectives=Boolean(document.getElementById('hide-serve-objectives-input')?.checked); 
 Object.keys(p.attackers).forEach(k=>{
   p.attackers[k].name=document.getElementById(`attacker-name-${k}`)?.value.trim()||p.attackers[k].name||scoutAttackerLabels[k];
   p.attackers[k].directions=Object.keys(getScoutDirectionLabels(k)).filter(d=>document.getElementById(`attacker-${k}-${d}`)?.checked);
   p.attackers[k].visibleToPlayers=Boolean(document.getElementById(`attacker-visible-${k}`)?.checked);
   p.attackers[k].tipZone=Number(document.getElementById(`attacker-tip-zone-${k}`)?.value||p.attackers[k].tipZone||8);
 });
 Object.keys(p.servePct).forEach(k=>p.servePct[k]=Math.max(0,Math.min(100,Number(document.getElementById(`serve-pct-${k}`)?.value ?? p.servePct[k])||0)));
 record.draftPlan=p; appState.matchScouting[activeScoutingMatchId]=record; saveAppData(appState);if(showMessage)showToast('Borrador guardado correctamente.');renderTactics();
};
window.toggleScoutingPreview=function(enabled){if(!isCoachUser())return; if(enabled)saveScoutingData(false); scoutingPreviewMode=Boolean(enabled); renderTactics();};
window.publishScoutingPlan=function(){
 if(!isCoachUser()||!activeScoutingMatchId)return;
 saveScoutingData(false);
 const record=getActiveScoutingRecord();
 record.publishedPlan=JSON.parse(JSON.stringify(record.draftPlan));
 record.status='published'; record.publishedAt=new Date().toISOString();
 record.publicationVersion = record.publishedAt; record.readReceipts = {};
 appState.matchScouting[activeScoutingMatchId]=record; saveAppData(appState);
 showToast('Plan publicado para las jugadoras.'); renderTactics();
};
window.archiveScoutingPlan=function(){
 if(!isCoachUser()||!activeScoutingMatchId)return;
 if(!confirm('¿Archivar este plan? Dejará de estar visible para las jugadoras, pero conservarás todos los datos.'))return;
 saveScoutingData(false);
 const record=getActiveScoutingRecord(); record.status='archived'; record.archivedAt=new Date().toISOString();
 appState.matchScouting[activeScoutingMatchId]=record; saveAppData(appState); showToast('Plan archivado.'); renderTactics();
};
window.restoreScoutingPlan=function(){
 if(!isCoachUser()||!activeScoutingMatchId)return;
 const record=getActiveScoutingRecord(); record.status='draft'; record.archivedAt=null;
 appState.matchScouting[activeScoutingMatchId]=record; saveAppData(appState); showToast('Plan recuperado como borrador.'); renderTactics();
};

/* ==========================================================================
   6. ESTADÍSTICA DE PARTIDOS DE LIGA & GRÁFICOS GLOBALES (# + =)
   ========================================================================== */
const defaultPlayerVisibleStats = ["recPerfectPct", "recErrorPct", "attackEfficiencyPct", "attackErrors", "aces", "serveErrors", "bloqueos"];
function getStatsPublicationStatus(match){
  if(!match?.stats) return 'empty';
  const value=match.stats.publicationStatus;
  return ['draft','published','archived'].includes(value)?value:'published';
}
function getStatsStatusLabel(status){ return status==='published'?'Publicado':status==='archived'?'Archivado':status==='draft'?'Borrador':'Sin datos'; }
window.setStatsFilter=function(value){ window.__statsPublicationFilter=value||'all'; renderStats(); };
window.quickPublishMatchStats=function(matchId){
  if(!isCoachUser())return; const match=(appState.events||[]).find(e=>e.id===matchId); if(!match?.stats)return;
  match.stats.publicationStatus='published'; match.stats.publishedAt=new Date().toISOString(); match.stats.archivedAt=null;
  saveAppData(appState); showToast('Estadística publicada para las jugadoras.'); renderStats();
};
window.archiveMatchStats=function(matchId){
  if(!isCoachUser())return; const match=(appState.events||[]).find(e=>e.id===matchId); if(!match?.stats)return;
  if(!confirm('¿Archivar estas estadísticas? Dejarán de estar visibles para las jugadoras.'))return;
  match.stats.publicationStatus='archived'; match.stats.archivedAt=new Date().toISOString(); saveAppData(appState); showToast('Estadística archivada.'); renderStats();
};
const playerStatMetricDefinitions = {
  recPerfectPct: { label: "Recepción perfecta", icon: "⭐", format: value => `${Number(value || 0).toFixed(1)}%` },
  recErrorPct: { label: "Error de recepción", icon: "🎯", format: value => `${Number(value || 0).toFixed(1)}%` },
  attackEfficiencyPct: { label: "Efectividad de ataque", icon: "⚔️", format: value => `${Number(value || 0).toFixed(1)}%` },
  attackErrors: { label: "Error de ataque", icon: "❌", format: value => Number(value || 0) },
  aces: { label: "Aces", icon: "⚡", format: value => Number(value || 0) },
  serveErrors: { label: "Error de saque", icon: "🎯", format: value => Number(value || 0) },
  bloqueos: { label: "Bloqueos", icon: "🧱", format: value => Number(value || 0) },
  ownErrors: { label: "Error nuestro", icon: "🔴", format: value => Number(value || 0) },
  opponentErrors: { label: "Error rival", icon: "🟢", format: value => Number(value || 0) }
};
function getPlayerVisibleStats(match) {
  const saved = match?.stats?.visibleToPlayers;
  return Array.isArray(saved) ? saved.filter(key => playerStatMetricDefinitions[key]) : [...defaultPlayerVisibleStats];
}
function getMatchStatValue(match, key) {
  const st = match?.stats || {};
  if (key === "recErrorPct") return Number.isFinite(Number(st.recErrorPct)) ? Number(st.recErrorPct) : (st.recTotal ? (st.recError / st.recTotal) * 100 : 0);
  if (key === "recPerfectPct") return Number.isFinite(Number(st.recPerfectPct)) ? Number(st.recPerfectPct) : (st.recTotal ? (st.recPerfect / st.recTotal) * 100 : 0);
  if (key === "attackErrors") return st.attackErrors ?? st.ataquesError ?? 0;
  if (key === "serveErrors") return st.serveErrors ?? st.saquesError ?? 0;
  return st[key] ?? 0;
}
function openPlayerMatchStats(matchId) {
  if (isCoachUser()) return;
  const match = (appState.events || []).find(event => event.id === matchId);
  if (!match || !match.stats || match.status !== "Finalizado" || getStatsPublicationStatus(match)!=='published') return;
  const visible = getPlayerVisibleStats(match);
  const title = document.getElementById("player-match-stats-title");
  const body = document.getElementById("player-match-stats-body");
  if (title) title.textContent = match.title || "Resumen del partido";
  if (body) body.innerHTML = `
    <div class="player-match-summary-head">
      <span>${match.date || ""}${match.location ? ` · ${match.location}` : ""}</span>
      <strong>${match.result || "Finalizado"}</strong>
    </div>
    <div class="player-match-visible-grid">
      ${visible.length ? visible.map(key => {
        const metric = playerStatMetricDefinitions[key];
        return `<article><span>${metric.icon}</span><strong>${metric.format(getMatchStatValue(match, key))}</strong><small>${metric.label}</small></article>`;
      }).join("") : `<p class="player-stats-empty">El cuerpo técnico todavía no ha publicado indicadores para este partido.</p>`}
    </div>`;
  document.getElementById("modal-player-match-stats")?.classList.add("active");
  if (window.lucide) lucide.createIcons();
}
window.openPlayerMatchStats = openPlayerMatchStats;

function renderStats() {
  const container = document.getElementById("stats-matches-list");
  if (!container) return;
  container.innerHTML = "";

  const isCoach = isCoachUser();
  const matches = appState.events.filter(e => e.type === "Partido" || e.type === "Amistoso");
  matches.sort((a, b) => new Date(a.date) - new Date(b.date));

  const listTitle = document.getElementById("stats-list-title");
  const listHelp = document.getElementById("stats-list-help");
  if (listTitle) listTitle.textContent = isCoach ? "🏐 Calendario Oficial de 22 Jornadas de Liga" : "📊 Mis resúmenes de partido";
  if (listHelp) listHelp.textContent = isCoach ? "" : "Pulsa sobre un partido finalizado para consultar los datos publicados por el cuerpo técnico.";

  const finishedMatches = matches.filter(m => m.status === "Finalizado" && m.stats && (isCoach || getStatsPublicationStatus(m)==='published'));
  const statsFilter=window.__statsPublicationFilter||'all';
  const renderedMatches=isCoach&&statsFilter!=='all'?matches.filter(m=>getStatsPublicationStatus(m)===statsFilter):matches;

  let totalRecErrorPct = 0, totalRecPerfectPct = 0, statsCount = 0;
  let totalAces = 0, totalBlocks = 0, totalAttackErrors = 0, totalServeErrors = 0, totalOwnErrors = 0, totalOpponentErrors = 0;
  let totalAttackEfficiencyPct = 0, attackEfficiencyCount = 0;
  let wins = 0, losses = 0;

  renderedMatches.forEach(m => {
    if (m.result) {
      if (m.result.includes("Victoria")) wins++;
      else if (m.result.includes("Derrot")) losses++;
    }
    if (m.stats) {
      const errPct = Number.isFinite(Number(m.stats.recErrorPct)) ? Number(m.stats.recErrorPct) : (m.stats.recTotal ? (m.stats.recError / m.stats.recTotal) * 100 : 0);
      const perfPct = Number.isFinite(Number(m.stats.recPerfectPct)) ? Number(m.stats.recPerfectPct) : (m.stats.recTotal ? (m.stats.recPerfect / m.stats.recTotal) * 100 : 0);
      totalRecErrorPct += errPct; totalRecPerfectPct += perfPct; statsCount++;
      totalAces += (m.stats.aces || 0);
      totalBlocks += (m.stats.bloqueos || 0);
      totalAttackErrors += (m.stats.attackErrors ?? m.stats.ataquesError ?? 0);
      totalServeErrors += (m.stats.serveErrors ?? m.stats.saquesError ?? 0);
      totalOwnErrors += (m.stats.ownErrors || 0);
      totalOpponentErrors += (m.stats.opponentErrors || 0);
      const attackEff = Number(m.stats.attackEfficiencyPct);
      if (Number.isFinite(attackEff)) { totalAttackEfficiencyPct += attackEff; attackEfficiencyCount++; }
    }
  });

  const avgRecErrorPct = statsCount ? (totalRecErrorPct / statsCount).toFixed(1) : "0.0";
  const avgRecPerfectPct = statsCount ? (totalRecPerfectPct / statsCount).toFixed(1) : "0.0";
  const avgAttackEfficiencyPct = attackEfficiencyCount ? (totalAttackEfficiencyPct / attackEfficiencyCount).toFixed(1) : "0.0";

  const recErrorEl = document.getElementById("stats-avg-rec-error");
  const recPerfEl = document.getElementById("stats-avg-rec-perfect");
  const recordEl = document.getElementById("stats-record");
  const acesEl = document.getElementById("stats-total-aces");
  const blocksEl = document.getElementById("stats-total-blocks");
  const attackEffEl = document.getElementById("stats-avg-attack-efficiency");
  const attackErrorsEl = document.getElementById("stats-total-attack-errors");
  const serveErrorsEl = document.getElementById("stats-total-serve-errors");
  const ownErrorsEl = document.getElementById("stats-total-own-errors");
  const opponentErrorsEl = document.getElementById("stats-total-opponent-errors");

  if (recErrorEl) recErrorEl.textContent = `${avgRecErrorPct}%`;
  if (recPerfEl) recPerfEl.textContent = `${avgRecPerfectPct}%`;
  if (recordEl) recordEl.textContent = `${wins}V · ${losses}D`;
  if (acesEl) acesEl.textContent = totalAces;
  if (blocksEl) blocksEl.textContent = totalBlocks;
  if (attackEffEl) attackEffEl.textContent = `${avgAttackEfficiencyPct}%`;
  if (attackErrorsEl) attackErrorsEl.textContent = totalAttackErrors;
  if (serveErrorsEl) serveErrorsEl.textContent = totalServeErrors;
  if (ownErrorsEl) ownErrorsEl.textContent = totalOwnErrors;
  if (opponentErrorsEl) opponentErrorsEl.textContent = totalOpponentErrors;

  if (isCoach) renderGlobalStatsCharts(finishedMatches);

  matches.forEach(m => {
    const card = document.createElement("div");
    card.className = `match-stat-card${isCoach ? "" : " player-match-stat-card"}`;

    const isFinished = m.status === "Finalizado";
    const st = m.stats;
    const publicationStatus=getStatsPublicationStatus(m);

    let recErrorPct = 0, recPerfPct = 0;
    if (st) {
      recErrorPct = Number.isFinite(Number(st.recErrorPct)) ? Number(st.recErrorPct) : (st.recTotal ? (st.recError / st.recTotal) * 100 : 0);
      recPerfPct = Number.isFinite(Number(st.recPerfectPct)) ? Number(st.recPerfectPct) : (st.recTotal ? (st.recPerfect / st.recTotal) * 100 : 0);
    }

    card.innerHTML = `
      <div class="match-stat-header">
        <div>
          <span class="match-round-badge">Jornada ${m.round || '?'}</span>
          <h4 class="match-stat-title" style="margin-top:0.3rem;">${m.title}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted);"><i data-lucide="calendar" style="width:13px; vertical-align:middle;"></i> ${m.date} • ${m.location}</p>
        </div>
        ${isCoach&&st?`<span class="publication-badge is-${publicationStatus}">${getStatsStatusLabel(publicationStatus)}</span>`:''}<span class="badge ${m.result && m.result.includes('Victoria') ? 'badge-green' : isFinished ? 'badge-red' : 'badge-cyan'}">
          ${m.result || m.status}
        </span>
      </div>

      <div class="match-stat-body">
        ${!isCoach ? (isFinished && st && publicationStatus==='published' ? `
          <div class="player-match-card-preview">
            <span><i data-lucide="bar-chart-3"></i> Resumen publicado</span>
            <strong>Ver datos <i data-lucide="chevron-right"></i></strong>
          </div>
        ` : `
          <p class="player-stats-pending"><i data-lucide="clock"></i> El resumen todavía no está disponible.</p>
        `) : (isFinished && st ? `
          <div class="match-metrics-row">
            <div class="metric-pill">
              <span class="lbl">% Error Recepción (=)</span>
              <span class="val ${recErrorPct <= 8 ? 'good' : 'bad'}">${Number(recErrorPct).toFixed(1)}%</span>
            </div>
            <div class="metric-pill">
              <span class="lbl">% Recepción Perfecta (# +)</span>
              <span class="val ${recPerfPct >= 65 ? 'good' : ''}">${Number(recPerfPct).toFixed(1)}%</span>
            </div>
          </div>

          <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted); display:flex; justify-content:space-between;">
            <span>Distribución de Recepción:</span>
            <span>${recPerfPct.toFixed(1)}% perfecta · ${recErrorPct.toFixed(1)}% error</span>
          </div>
          <div class="rec-progress-bar">
            <div class="rec-progress-fill perfect" style="width: ${Number(recPerfPct).toFixed(1)}%"></div>
            <div class="rec-progress-fill error" style="width: ${Number(recErrorPct).toFixed(1)}%"></div>
          </div>

          <div class="match-extra-metrics">
            <div><strong>${Number(st.attackEfficiencyPct || 0).toFixed(1)}%</strong><span>Efect. ataque</span></div>
            <div><strong>${st.attackErrors ?? st.ataquesError ?? 0}</strong><span>Error ataque</span></div>
            <div><strong>${st.aces || 0}</strong><span>Aces</span></div>
            <div><strong>${st.serveErrors ?? st.saquesError ?? 0}</strong><span>Error saque</span></div>
            <div><strong>${st.bloqueos || 0}</strong><span>Bloqueos</span></div>
            <div><strong>${st.ownErrors || 0}</strong><span>Error nuestro</span></div>
            <div><strong>${st.opponentErrors || 0}</strong><span>Error rival</span></div>
          </div>
        ` : `
          <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 0.75rem 0;">
            <i data-lucide="clock" style="width:16px; vertical-align:middle;"></i> Partido pendiente de disputar o añadir estadística.
          </p>
        `)}
      </div>

      ${isCoach ? `<div style="display: flex; justify-content: space-between; align-items: center;">
        ` : ""}
        ${isCoach ? `
          <div class="stats-card-actions">${st&&publicationStatus!=='published'?`<button class="btn btn-outline btn-sm" onclick="quickPublishMatchStats('${m.id}')"><i data-lucide="send"></i> Publicar</button>`:''}${st&&publicationStatus!=='archived'?`<button class="btn btn-outline btn-sm danger-soft" onclick="archiveMatchStats('${m.id}')"><i data-lucide="archive"></i></button>`:''}<button class="btn btn-primary btn-sm" onclick="openMatchStatsModal('${m.id}')"><i data-lucide="edit-3"></i> ${st ? 'Editar Estadística' : '+ Añadir Estadística'}</button></div>
        ` : ''}
      ${isCoach ? `</div>` : ""}
    `;

    if (!isCoach && isFinished && st && publicationStatus==='published') {
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.onclick = () => openPlayerMatchStats(m.id);
      card.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPlayerMatchStats(m.id); }
      };
    }
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
    if (!m.stats) return 0;
    return Number.isFinite(Number(m.stats.recErrorPct)) ? Number(m.stats.recErrorPct) : (m.stats.recTotal ? parseFloat(((m.stats.recError / m.stats.recTotal) * 100).toFixed(1)) : 0);
  });

  const perfectData = finishedMatches.map(m => {
    if (!m.stats) return 0;
    return Number.isFinite(Number(m.stats.recPerfectPct)) ? Number(m.stats.recPerfectPct) : (m.stats.recTotal ? parseFloat(((m.stats.recPerfect / m.stats.recTotal) * 100).toFixed(1)) : 0);
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
  const errorPct = Number.isFinite(Number(st.recErrorPct)) ? Number(st.recErrorPct) : (st.recTotal ? (st.recError / st.recTotal) * 100 : "");
  const perfectPct = Number.isFinite(Number(st.recPerfectPct)) ? Number(st.recPerfectPct) : (st.recTotal ? (st.recPerfect / st.recTotal) * 100 : "");
  document.getElementById("stats-rec-error-pct").value = errorPct === "" ? "" : Number(errorPct).toFixed(1);
  document.getElementById("stats-rec-perfect-pct").value = perfectPct === "" ? "" : Number(perfectPct).toFixed(1);
  document.getElementById("stats-aces").value = st.aces ?? "";
  document.getElementById("stats-attack-efficiency").value = st.attackEfficiencyPct ?? "";
  document.getElementById("stats-attack-errors").value = st.attackErrors ?? st.ataquesError ?? "";
  document.getElementById("stats-serve-errors").value = st.serveErrors ?? st.saquesError ?? "";
  document.getElementById("stats-own-errors").value = st.ownErrors ?? "";
  document.getElementById("stats-opponent-errors").value = st.opponentErrors ?? "";
  const statusSelect=document.getElementById('stats-publication-status'); if(statusSelect) statusSelect.value=getStatsPublicationStatus(match)==='empty'?'draft':getStatsPublicationStatus(match);
  const visibleStats = getPlayerVisibleStats(match);
  document.querySelectorAll("[data-stats-visible]").forEach(input => { input.checked = visibleStats.includes(input.dataset.statsVisible); });

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
      ...(match.stats || {}),
      recErrorPct: Math.max(0, Math.min(100, parseFloat(document.getElementById("stats-rec-error-pct").value) || 0)),
      recPerfectPct: Math.max(0, Math.min(100, parseFloat(document.getElementById("stats-rec-perfect-pct").value) || 0)),
      aces: Math.max(0, parseInt(document.getElementById("stats-aces").value) || 0),
      attackEfficiencyPct: Math.max(0, Math.min(100, parseFloat(document.getElementById("stats-attack-efficiency").value) || 0)),
      attackErrors: Math.max(0, parseInt(document.getElementById("stats-attack-errors").value) || 0),
      serveErrors: Math.max(0, parseInt(document.getElementById("stats-serve-errors").value) || 0),
      ownErrors: Math.max(0, parseInt(document.getElementById("stats-own-errors").value) || 0),
      opponentErrors: Math.max(0, parseInt(document.getElementById("stats-opponent-errors").value) || 0),
      visibleToPlayers: Array.from(document.querySelectorAll("[data-stats-visible]:checked")).map(input => input.dataset.statsVisible),
      publicationStatus: document.getElementById('stats-publication-status')?.value || 'draft'
    };

    if(statsObj.publicationStatus==='published' && getStatsPublicationStatus(match)!=='published') statsObj.publishedAt=new Date().toISOString();
    if(statsObj.publicationStatus==='archived') statsObj.archivedAt=new Date().toISOString(); else statsObj.archivedAt=null;
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

  const addEventButton = document.getElementById("btn-add-event");
  if (addEventButton && !addEventButton.dataset.calendarListener) {
    addEventButton.dataset.calendarListener = "1";
    addEventButton.addEventListener("touchend", (event) => {
      event.preventDefault();
      openCalendarEventComposer();
    }, { passive: false });
  }

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
  const status = getPlayerDailyStatus(selectedPId);

  let isLockedForPlayer = false;
  let lockReasonHTML = "";
  let btnLabelText = "💾 Enviar valoración";

  if (!isCoach && status.isContestada) {
    isLockedForPlayer = true;
    lockReasonHTML = `
      <div style="background:#ecfdf5;border:1px solid #10b981;padding:1rem;border-radius:10px;color:#065f46;font-size:.85rem;font-weight:600;">
        ✅ <strong>Valoración de hoy ya enviada</strong><br>
        Has registrado un nivel Borg de <strong>${status.log.fatigue}/5</strong>. Podrás volver a responder mañana.
      </div>`;
    btnLabelText = "✅ Valoración de hoy enviada";
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

  const wellnessForm = document.getElementById("form-wellness");
  if (wellnessForm) wellnessForm.style.display = isLockedForPlayer ? "none" : "block";

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
      submitBtn.textContent = "💾 Enviar valoración";
    }
  }

  const existingLog = status.log;

  const initialFatigue = existingLog ? existingLog.fatigue : 2;
  updateBorgInteractiveUI(initialFatigue);

  if (existingLog) {
    if (document.getElementById("wellness-sleep-hours")) document.getElementById("wellness-sleep-hours").value = existingLog.sleepHours || 8;
    if (document.getElementById("wellness-sleep-qual")) document.getElementById("wellness-sleep-qual").value = existingLog.sleepQuality || 3;
    setWellnessSleepChoice(existingLog.sleepQuality || 3);
    if (document.getElementById("wellness-notes")) document.getElementById("wellness-notes").value = existingLog.notes || "";
  } else {
    if (document.getElementById("wellness-sleep-hours")) document.getElementById("wellness-sleep-hours").value = 8;
    if (document.getElementById("wellness-sleep-qual")) document.getElementById("wellness-sleep-qual").value = 3;
    setWellnessSleepChoice(3);
    if (document.getElementById("wellness-notes")) document.getElementById("wellness-notes").value = "";
  }

  modal.classList.add("active");
}


/* ==========================================================================
   FASE 2B · MOTOR DE COMPROMISO, XP Y MISIONES
   Premia hábitos controlables: asistencia, carga semanal y RPE.
   Los objetivos técnicos/tácticos personales quedan fuera de la gamificación.
   ========================================================================== */
const ENGAGEMENT_DEFAULTS = { wellness:15, wellnessEarly:5, attendanceConfirm:5, trainingAttendance:20, rpe:10, goal:25, perfectWeek:30 };
function ensureEngagementState(){
  appState.engagementLedger ||= [];
  appState.engagementSettings = {...ENGAGEMENT_DEFAULTS, ...(appState.engagementSettings||{})};
}
function awardEngagementXP(playerId, action, referenceId, amount, label, occurredAt=new Date().toISOString()){
  if(!playerId || !action || !referenceId) return false;
  ensureEngagementState();
  const key=`${playerId}:${action}:${referenceId}`;
  if(appState.engagementLedger.some(x=>x.key===key)) return false;
  appState.engagementLedger.push({id:`xp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,key,playerId,action,referenceId,amount:Number(amount)||0,label,occurredAt});
  return true;
}
function removeEngagementXP(playerId, action, referenceId){
  ensureEngagementState();
  const key=`${playerId}:${action}:${referenceId}`;
  appState.engagementLedger=appState.engagementLedger.filter(x=>x.key!==key);
}
function syncEngagementLedger(){
  ensureEngagementState(); const cfg=appState.engagementSettings;

  // Migración: los objetivos técnicos/tácticos personales ya no conceden XP.
  // También se elimina el antiguo bonus de semana perfecta vinculado a esos objetivos.
  appState.engagementLedger = (appState.engagementLedger || []).filter(entry =>
    entry.action !== 'goal' && entry.action !== 'perfect-week'
  );

  (appState.wellnessLogs||[]).forEach(l=>{
    awardEngagementXP(l.playerId,'wellness',l.dateKey||l.date||l.id,cfg.wellness,'Bienestar semanal registrado',l.createdAt||l.date);
    const d=new Date(l.createdAt||l.date||0); if(d.getDay()===1 && d.getHours()<10) awardEngagementXP(l.playerId,'wellness-early',l.weekKey||l.id,cfg.wellnessEarly,'Bienestar del lunes registrado temprano',l.createdAt||l.date);
  });
  (appState.trainingConfirmations||[]).filter(c=>c.status==='yes').forEach(c=>awardEngagementXP(c.playerId,'attendance-confirm',c.eventId,cfg.attendanceConfirm,'Asistencia confirmada',c.timestamp));
  (appState.attendanceData||[]).filter(a=>a.status==='present'||a.status==='attended').forEach(a=>{ const evt=(appState.events||[]).find(e=>e.id===a.eventId); if(!evt||evt.type==='Entrenamiento') awardEngagementXP(a.playerId,'training-attendance',a.eventId,cfg.trainingAttendance,'Asistencia validada por el entrenador',a.date); });
  (appState.trainingRPEs||[]).forEach(r=>awardEngagementXP(r.playerId,'rpe',r.eventId,cfg.rpe,'RPE registrado',r.date));

  // Bonus semanal: carga del lunes contestada + RPE registrado tras cada entrenamiento.
  (appState.players||[]).forEach(player=>{
    const weeks=new Set();
    (appState.wellnessLogs||[]).filter(l=>l.playerId===player.id).forEach(l=>weeks.add(l.weekKey||getWeekKeyFromDate(l.dateKey||l.date||l.createdAt)));
    (appState.events||[]).filter(e=>e.type==='Entrenamiento').forEach(e=>weeks.add(getWeekKeyFromDate(e.date)));
    weeks.forEach(weekKey=>{
      const wellnessDone=(appState.wellnessLogs||[]).some(l=>l.playerId===player.id&&(l.weekKey===weekKey||getWeekKeyFromDate(l.dateKey||l.date||l.createdAt)===weekKey));
      const trainings=(appState.events||[]).filter(e=>e.type==='Entrenamiento'&&getWeekKeyFromDate(e.date)===weekKey);
      const completedTrainings=trainings.filter(e=>isTrainingFinished(e));
      const allConfirmed=trainings.length>0 && trainings.every(e=>(appState.trainingConfirmations||[]).some(c=>c.playerId===player.id&&c.eventId===e.id&&c.status==='yes'));
      const allAttendanceValidated=completedTrainings.length>0 && completedTrainings.every(e=>(appState.attendanceData||[]).some(a=>a.playerId===player.id&&a.eventId===e.id&&(a.status==='present'||a.status==='attended')));
      const allRpeDone=completedTrainings.length>0 && completedTrainings.every(e=>(appState.trainingRPEs||[]).some(r=>r.playerId===player.id&&r.eventId===e.id));
      if(wellnessDone && allConfirmed && allAttendanceValidated && allRpeDone) awardEngagementXP(player.id,'weekly-compliance',weekKey,cfg.perfectWeek,'Objetivos de la semana completados',weekKey);
      else removeEngagementXP(player.id,'weekly-compliance',weekKey);
    });
  });
}
function getPlayerEngagement(playerId){
  syncEngagementLedger();
  const entries=(appState.engagementLedger||[]).filter(x=>x.playerId===playerId).sort((a,b)=>new Date(b.occurredAt||0)-new Date(a.occurredAt||0));
  const xp=entries.reduce((sum,x)=>sum+(Number(x.amount)||0),0);
  const levels=[{name:'Inicio',min:0},{name:'Compromiso',min:100},{name:'Constancia',min:250},{name:'Referente',min:500},{name:'Líder de equipo',min:850}];
  let idx=0; levels.forEach((l,i)=>{if(xp>=l.min)idx=i}); const level=levels[idx],next=levels[idx+1]||null;
  const progress=next?Math.max(0,Math.min(100,Math.round((xp-level.min)*100/(next.min-level.min)))):100;
  return {xp,entries,level:level.name,nextLevel:next?.name||null,pointsToNext:next?next.min-xp:0,levelProgress:progress};
}
function getPlayerWeeklyMissions(playerId){
  const weekKey=getWeekKeyFromDate(); const cfg=appState.engagementSettings||ENGAGEMENT_DEFAULTS;
  const wellness=(appState.wellnessLogs||[]).some(l=>l.playerId===playerId&&(l.weekKey===weekKey||getWeekKeyFromDate(l.dateKey||l.date||l.createdAt)===weekKey));
  const weekEvents=(appState.events||[]).filter(e=>e.type==='Entrenamiento'&&getWeekKeyFromDate(e.date)===weekKey);
  const completedEvents=weekEvents.filter(e=>isTrainingFinished(e));
  const confirmed=weekEvents.filter(e=>(appState.trainingConfirmations||[]).some(c=>c.playerId===playerId&&c.eventId===e.id&&c.status==='yes')).length;
  const attended=completedEvents.filter(e=>(appState.attendanceData||[]).some(a=>a.playerId===playerId&&a.eventId===e.id&&(a.status==='present'||a.status==='attended'))).length;
  const rpe=completedEvents.filter(e=>(appState.trainingRPEs||[]).some(r=>r.playerId===playerId&&r.eventId===e.id)).length;
  return [
    {id:'confirm',icon:'calendar-check',title:'Confirmar “Asistiré”',done:weekEvents.length>0&&confirmed===weekEvents.length,progress:confirmed,target:weekEvents.length||1,xp:cfg.attendanceConfirm*Math.max(1,weekEvents.length),detail:'Confirma tu disponibilidad para cada entrenamiento'},
    {id:'attendance',icon:'badge-check',title:'Asistencia confirmada',done:completedEvents.length>0&&attended===completedEvents.length,progress:attended,target:completedEvents.length||1,xp:cfg.trainingAttendance*Math.max(1,completedEvents.length),detail:'Se completa cuando el entrenador valida la lista'},
    {id:'wellness',icon:'heart-pulse',title:'Completar Bienestar',done:wellness,progress:wellness?1:0,target:1,xp:cfg.wellness,detail:'Responder el cuestionario de esta semana'},
    {id:'rpe-week',icon:'gauge',title:'Completar la Carga semanal',done:completedEvents.length>0&&rpe===completedEvents.length,progress:rpe,target:completedEvents.length||1,xp:cfg.rpe*Math.max(1,completedEvents.length),detail:'Registrar la percepción del esfuerzo de todos los entrenamientos finalizados'}
  ];
}
function renderPlayerEngagementCard(playerId){
  const eng=getPlayerEngagement(playerId), missions=getPlayerWeeklyMissions(playerId), completed=missions.filter(m=>m.done).length;
  return `<article class="dashboard-card engagement-card"><div class="engagement-card-head"><div><span class="dashboard-eyebrow"><i data-lucide="sparkles"></i> Compromiso semanal</span><h3>${eng.level}</h3></div><div class="engagement-xp"><strong>${eng.xp}</strong><span>XP</span></div></div><div class="progress-track"><span style="width:${eng.levelProgress}%"></span></div><p class="engagement-next">${eng.nextLevel?`${eng.pointsToNext} XP para ${eng.nextLevel}`:'Nivel máximo de la temporada'}</p><div class="mission-list">${missions.map(m=>`<div class="mission-item ${m.done?'done':''}"><span><i data-lucide="${m.done?'check-circle-2':m.icon}"></i></span><div><strong>${m.title}</strong><small>${m.detail ? `${m.detail} · ` : ''}${m.progress}/${m.target} · +${m.xp} XP</small></div></div>`).join('')}</div><div class="engagement-week-total"><span>${completed}/${missions.length} hábitos completados</span>${completed===missions.length?'<strong>Semana perfecta</strong>':''}</div></article>`;
}

function getPlayerPassportData(playerId) {
  const player = (appState.players || []).find(p => p.id === playerId);
  const base = calculatePlayerAttendanceAndAchievements(playerId);
  const wellnessLogs = (appState.wellnessLogs || [])
    .filter(log => log.playerId === playerId)
    .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  const latestWellness = wellnessLogs[0] || null;
  const goals = (appState.weeklyGoals || []).filter(g => g.isTeamGoal || g.playerId === playerId);
  const completedGoals = goals.filter(g => (g.completions || []).some(c => c.playerId === playerId && c.completed));
  const matches = Number(player?.stats?.matches || 0);
  const commitment = Math.max(0, Math.min(100, Math.round(
    (base.ratio * 0.45) +
    (Math.min(base.wellnessCount, 12) / 12 * 20) +
    (Math.min(base.completeWeeks, 8) / 8 * 20) +
    (Math.min(base.currentStreak, 10) / 10 * 15)
  )));

  let wellnessLabel = 'Sin datos recientes';
  let wellnessTone = 'neutral';
  if (latestWellness) {
    const fatigue = Number(latestWellness.fatigue || 3);
    const sleep = Number(latestWellness.sleepQuality || 3);
    if (fatigue <= 2 && sleep >= 4) { wellnessLabel = 'Muy buen estado'; wellnessTone = 'good'; }
    else if (fatigue >= 4 || sleep <= 2) { wellnessLabel = 'Conviene recuperar'; wellnessTone = 'alert'; }
    else { wellnessLabel = 'Estado estable'; wellnessTone = 'medium'; }
  }

  const recentActivity = [];
  wellnessLogs.slice(0, 2).forEach(log => recentActivity.push({
    date: log.date || log.createdAt,
    icon: 'heart-pulse',
    title: 'Bienestar completado',
    text: `Fatiga ${log.fatigue || '-'} · Sueño ${log.sleepHours || '-'} h`
  }));
  (appState.attendanceData || []).filter(a => a.playerId === playerId).slice(-3).reverse().forEach(record => {
    const event = (appState.events || []).find(e => e.id === record.eventId);
    recentActivity.push({
      date: record.date || event?.date,
      icon: record.status === 'present' || record.status === 'attended' ? 'circle-check' : 'calendar-x',
      title: event?.type === 'Partido' ? 'Partido registrado' : 'Entrenamiento registrado',
      text: event?.title || (record.status === 'present' ? 'Asistencia confirmada' : 'Registro de asistencia')
    });
  });
  recentActivity.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return {
    ...base,
    commitment,
    latestWellness,
    wellnessLabel,
    wellnessTone,
    goalsTotal: goals.length,
    goalsCompleted: completedGoals.length,
    matches,
    recentActivity: recentActivity.slice(0, 5)
  };
}

function formatPassportDate(value) {
  if (!value) return 'Actividad reciente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function openPlayerDetail(playerId) {
  const p = (appState.players || []).find(x => x.id === playerId);
  if (!p) return;

  const isCoach = isCoachUser();
  const currentUser = getCurrentUser();
  const isOwnCard = currentUser?.playerId === p.id || String(currentUser?.username || '').toLowerCase() === String(p.username || '').toLowerCase();
  const passport = getPlayerPassportData(playerId);
  const engagement = getPlayerEngagement(playerId);
  const modal = document.getElementById('modal-player-detail');
  const body = document.getElementById('modal-player-body');
  const content = modal?.querySelector('.modal-content');
  if (!modal || !body) return;
  if (content) content.classList.add('player-passport-modal');

  const unlocked = passport.achievements.filter(a => a.unlocked).slice(0, 4);
  const nextAchievement = passport.achievements.find(a => !a.unlocked);
  const activityHtml = passport.recentActivity.length
    ? passport.recentActivity.map(item => `
        <div class="passport-activity-item">
          <span class="passport-activity-icon"><i data-lucide="${item.icon}"></i></span>
          <div><strong>${item.title}</strong><p>${item.text}</p></div>
          <time>${formatPassportDate(item.date)}</time>
        </div>`).join('')
    : `<div class="passport-empty"><i data-lucide="clock-3"></i><span>La actividad aparecerá aquí cuando empiece la temporada.</span></div>`;

  const achievementsHtml = unlocked.length
    ? unlocked.map(a => `
        <article class="passport-badge unlocked">
          <span><i data-lucide="${a.icon}"></i></span>
          <div><strong>${a.title}</strong><small>${a.desc}</small></div>
        </article>`).join('')
    : `<div class="passport-empty"><i data-lucide="award"></i><span>Los primeros hitos se desbloquearán con la participación.</span></div>`;

  body.innerHTML = `
    <section class="player-passport">
      <header class="passport-hero">
        <div class="passport-cover-glow"></div>
        <button class="passport-avatar-button" type="button" ${isCoach || isOwnCard ? `onclick="triggerAvatarUpload('${p.id}')" title="Cambiar foto"` : 'disabled'}>
          <img src="${p.avatar || 'assets/default_avatar.svg'}" alt="${p.name}">
          ${isCoach || isOwnCard ? '<span><i data-lucide="camera"></i></span>' : ''}
        </button>
        <div class="passport-identity">
          <div class="passport-eyebrow">PASAPORTE DEPORTIVO · ${appState.teamInfo?.season || 'TEMPORADA'}</div>
          <h2>${p.name}</h2>
          <p><strong>#${p.number}</strong><span>${p.position}</span><span>${p.status || 'Disponible'}</span></p>
        </div>
        <div class="passport-commitment">
          <span>Compromiso</span>
          <strong>${passport.commitment}</strong>
          <small>/100</small>
        </div>
      </header>

      <div class="passport-progress-card">
        <div class="passport-level-row">
          <div><span>Nivel de constancia</span><strong>${passport.level}</strong></div>
          <div class="passport-xp-value"><strong>${engagement.xp}</strong><span>XP</span></div>
        </div>
        <div class="passport-progress-track"><span style="width:${engagement.levelProgress}%"></span></div>
        <p>${engagement.nextLevel ? `Faltan <strong>${engagement.pointsToNext} XP</strong> para ${engagement.nextLevel}.` : 'Nivel máximo de esta temporada alcanzado.'}</p>
      </div>

      <div class="passport-metrics-grid">
        <article><i data-lucide="calendar-check"></i><strong>${passport.totalAttended}</strong><span>Entrenamientos</span></article>
        <article><i data-lucide="flame"></i><strong>${passport.currentStreak}</strong><span>Racha actual</span></article>
        <article><i data-lucide="percent"></i><strong>${passport.ratio}%</strong><span>Asistencia</span></article>
        <article><i data-lucide="heart-pulse"></i><strong>${passport.wellnessCount}</strong><span>Bienestar</span></article>
        <article><i data-lucide="badge-check"></i><strong>${getPlayerWeeklyMissions(playerId).filter(m=>m.done).length}/${getPlayerWeeklyMissions(playerId).length}</strong><span>Hábitos</span></article>
        <article><i data-lucide="trophy"></i><strong>${passport.matches}</strong><span>Partidos</span></article>
      </div>

      <div class="passport-layout">
        <div class="passport-main-column">
          ${(isCoach || isOwnCard) ? `<section class="passport-panel">
            <div class="passport-panel-heading"><div><span>Seguimiento</span><h3>Actividad reciente</h3></div><i data-lucide="activity"></i></div>
            <div class="passport-activity-list">${activityHtml}</div>
          </section>` : ''}

          <section class="passport-panel">
            <div class="passport-panel-heading"><div><span>Progreso</span><h3>Hitos desbloqueados</h3></div><i data-lucide="award"></i></div>
            <div class="passport-badges-grid">${achievementsHtml}</div>
            ${nextAchievement ? `<div class="passport-next-unlock"><div><strong>Próximo hito: ${nextAchievement.title}</strong><span>${nextAchievement.progressText}</span></div><div class="passport-mini-track"><span style="width:${nextAchievement.progress}%"></span></div></div>` : ''}
          </section>
        </div>

        <aside class="passport-side-column">
          ${(isCoach || isOwnCard) ? `<section class="passport-panel passport-status-panel ${passport.wellnessTone}">
            <div class="passport-panel-heading"><div><span>Estado actual</span><h3>${passport.wellnessLabel}</h3></div><i data-lucide="heart-pulse"></i></div>
            <p>${passport.latestWellness ? `Último registro: ${passport.latestWellness.sleepHours || '-'} h de sueño y fatiga ${passport.latestWellness.fatigue || '-'}/5.` : 'Todavía no hay un registro de bienestar para valorar el estado actual.'}</p>
          </section>` : ''}

          <section class="passport-panel">
            <div class="passport-panel-heading"><div><span>Temporada</span><h3>Resumen deportivo</h3></div><i data-lucide="bar-chart-3"></i></div>
            <dl class="passport-summary-list">
              <div><dt>Aces</dt><dd>${p.stats?.aces || 0}</dd></div>
              <div><dt>Puntos registrados</dt><dd>${p.stats?.puntosTotales || 0}</dd></div>
              ${(isCoach || isOwnCard) ? `<div><dt>Altura</dt><dd>${p.height || '-'}</dd></div><div><dt>CMJ</dt><dd>${p.cmj || p.reachAtaque || '-'}</dd></div>` : ''}
            </dl>
            <small class="passport-performance-note">Las estadísticas informan sobre el rendimiento, pero no determinan el XP ni el compromiso.</small>
          </section>

          ${isCoach ? `<section class="passport-panel passport-coach-tools"><div class="passport-panel-heading"><div><span>Entrenador</span><h3>Gestión de la jugadora</h3></div><i data-lucide="settings-2"></i></div><div class="passport-actions"><button class="btn btn-outline btn-sm" onclick="openEditPlayer('${p.id}')"><i data-lucide="pencil"></i> Editar ficha</button><button class="btn btn-outline btn-sm" onclick="triggerAvatarUpload('${p.id}')"><i data-lucide="camera"></i> Foto</button><button class="btn btn-primary btn-sm" onclick="promptChangeDorsal('${p.id}')"><i data-lucide="hash"></i> Dorsal</button><button class="btn btn-danger btn-sm" onclick="deletePlayer('${p.id}')"><i data-lucide="trash-2"></i> Eliminar jugadora</button></div></section>` : ''}
        </aside>
      </div>
    </section>`;

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}


function deletePlayer(playerId) {
  if (!isCoachUser()) return;
  const player = appState.players.find(p => p.id === playerId);
  if (!player) return;
  if (!confirm(`¿Eliminar a ${player.name} de la plantilla? Esta acción también borrará su usuario y sus registros asociados.`)) return;
  appState.players = appState.players.filter(p => p.id !== playerId);
  appState.users = (appState.users || []).filter(u => u.playerId !== playerId);
  appState.wellnessLogs = (appState.wellnessLogs || []).filter(l => l.playerId !== playerId);
  appState.trainingRPEs = (appState.trainingRPEs || []).filter(r => r.playerId !== playerId);
  appState.attendance = (appState.attendance || []).filter(a => a.playerId !== playerId);
  appState.weeklyGoals = (appState.weeklyGoals || []).filter(g => g.playerId !== playerId);
  appState.personalGoals = (appState.personalGoals || []).filter(g => g.playerId !== playerId);
  saveAppData(appState);
  document.getElementById('modal-player-detail')?.classList.remove('active');
  renderRoster();
  renderDashboard();
  showToast(`${player.name} ha sido eliminada de la plantilla.`);
}
window.deletePlayer = deletePlayer;

function openEditPlayer(playerId) {
  if (!isCoachUser()) return;
  const p = appState.players.find(x => x.id === playerId);
  if (!p) return;

  document.getElementById("modal-form-player-title").textContent = "Editar Jugadora";
  document.getElementById("player-id-input").value = p.id;
  document.getElementById("player-name-input").value = p.name;
  document.getElementById("player-num-input").value = p.number;
  document.getElementById("player-pos-input").value = p.position;
  document.getElementById("player-birthdate-input").value = /^\d{4}-\d{2}-\d{2}$/.test(String(p.birthDate||'')) ? p.birthDate : "";
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
    const birthDateInput = document.getElementById("player-birthdate-input").value || "";
    const existingPlayer = id ? appState.players.find(p => p.id === id) : null;
    const birthDate = birthDateInput || (existingPlayer?.birthDate || "");
    const height = document.getElementById("player-height-input").value || "165 cm";
    const reach = document.getElementById("player-reach-input").value || "28 cm";
    const notes = document.getElementById("player-notes-input").value;

    if (id) {
      const idx = appState.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        appState.players[idx] = {
          ...appState.players[idx],
          name, number, position, status, birthDate, height, cmj: reach, reachAtaque: reach, healthNote: notes
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
        birthDate,
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

  document.getElementById("btn-add-tournament-match")?.addEventListener("click", () => {
    tournamentMatchDrafts.push(makeTournamentMatchDraft({ time: tournamentMatchDrafts.at(-1)?.time || "10:00" }));
    renderTournamentMatchEditor();
  });

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
      const status = document.getElementById("event-session-file-status");
      pendingSessionFile = null;
      if (!file) { if (status) status.textContent = "Sin archivo seleccionado."; return; }
      const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!allowed) {
        e.target.value = "";
        if (status) status.textContent = "Formato no válido. Usa una imagen o PDF.";
        return showToast("Selecciona una imagen o un PDF.", "error");
      }
      if (file.size > 20 * 1024 * 1024) {
        e.target.value = "";
        if (status) status.textContent = "El archivo supera el límite de 20 MB.";
        return showToast("El archivo es demasiado grande (máximo 20 MB).", "error");
      }
      pendingSessionFile = file;
      if (status) status.textContent = `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
    });
  }

  const eventForm = document.getElementById("form-event");
  const eventSubmitButton = document.getElementById("btn-submit-event");

  async function saveCalendarEventFromForm() {
    if (!eventForm || !isCoachUser()) return;
    if (eventSubmitButton?.disabled) return;

    const type = document.getElementById("event-type-input")?.value || "Entrenamiento";
    const date = document.getElementById("event-date-input")?.value || getLocalDateKey();
    const time = document.getElementById("event-time-input")?.value || "18:30";
    const locationInput = document.getElementById("event-location-input");
    const titleInput = document.getElementById("event-title-input");
    const planInput = document.getElementById("event-plan-input");

    let title = (titleInput?.value || "").trim();
    if (!title) {
      title = type === "Entrenamiento" ? "Entrenamiento" : type;
      if (titleInput) titleInput.value = title;
    }
    const location = (locationInput?.value || "Pabellón Municipal de Bunyola").trim();
    const plan = (planInput?.value || "").trim();

    if (!date) {
      showToast("Selecciona una fecha para el evento.", "error");
      document.getElementById("event-date-input")?.focus();
      return;
    }

    if (eventSubmitButton) {
      eventSubmitButton.disabled = true;
      eventSubmitButton.dataset.originalText = eventSubmitButton.textContent || "Agendar Evento";
      eventSubmitButton.textContent = "Guardando…";
    }

    try {
      const tournamentMatches = type === "Torneo" ? collectTournamentMatches() : [];
      const currentMatches = (appState.events || []).filter(evt => evt.type === "Partido");
      const nextRound = currentMatches.length + 1;

      let attachmentId = null;
      let attachmentName = null;
      let attachmentType = null;
      const existingEvt = currentEditingEventId
        ? (appState.events || []).find(evt => evt.id === currentEditingEventId)
        : null;

      if (type === "Entrenamiento" && pendingSessionFile) {
        attachmentId = await saveSessionFile(pendingSessionFile, existingEvt?.attachmentId || null);
        attachmentName = pendingSessionFile.name;
        attachmentType = pendingSessionFile.type;
      } else if (type === "Entrenamiento" && existingEvt) {
        attachmentId = existingEvt.attachmentId || null;
        attachmentName = existingEvt.attachmentName || null;
        attachmentType = existingEvt.attachmentType || null;
      }

      const eventData = {
        id: existingEvt?.id || null,
        type,
        title,
        date,
        time,
        location,
        plan,
        tournamentMatches: type === "Torneo" ? tournamentMatches : [],
        attachmentId: type === "Entrenamiento" ? attachmentId : null,
        attachmentName: type === "Entrenamiento" ? attachmentName : null,
        attachmentType: type === "Entrenamiento" ? attachmentType : null,
        round: type === "Partido" ? (existingEvt?.round || nextRound) : null,
        status: existingEvt?.status || "Próximo"
      };

      if (window.VolleySupabase && window.VolleySupabase.getClient()) {
        if (eventSubmitButton) {
          eventSubmitButton.disabled = true;
          eventSubmitButton.textContent = "Guardando en Supabase…";
        }

        const user = getCurrentUser();
        const clubId = user?.clubId || window.VolleySupabase.config?.clubId;
        const teamId = user?.teamId || null;
        const userId = user?.id || null;

        const { data: savedEvt, error: supabaseError } = await window.VolleySupabase.saveEvent(
          eventData,
          clubId,
          teamId,
          userId
        );

        if (supabaseError) {
          console.error("[Supabase Events] Error al guardar:", supabaseError);
          showToast("Error al guardar evento en Supabase: " + (supabaseError.message || "Fallo de conexión"), "error");
          return;
        }

        if (savedEvt) {
          Object.assign(eventData, savedEvt);
        }
      }

      if (existingEvt) {
        Object.assign(existingEvt, eventData);
      } else {
        if (!Array.isArray(appState.events)) appState.events = [];
        if (!eventData.id) {
          eventData.id = `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }
        appState.events.push(eventData);
      }

      const saved = saveAppData(appState, { immediate: true });
      if (!saved) throw new Error("No se pudo preparar el guardado local");
      if (typeof flushAppDataSave === "function") flushAppDataSave();

      if (typeof invalidateViewRenderCache === "function") invalidateViewRenderCache();
      homeDashboardCache = { revision: -1, role: "", dayKey: "" };

      const wasEditing = Boolean(currentEditingEventId);
      currentEditingEventId = null;
      pendingSessionFile = null;
      if (sessionFileInput) sessionFileInput.value = "";

      document.getElementById("modal-add-event")?.classList.remove("active");
      document.body.classList.remove("modal-open");
      showToast(wasEditing ? "Evento actualizado correctamente en Supabase" : "Evento guardado en Supabase");

      requestAnimationFrame(() => {
        try { renderGoogleCalendar(); } catch (error) { console.error("Error al refrescar calendario:", error); }
        try { renderTraining(); } catch (error) { console.error("Error al refrescar entrenamientos:", error); }
        try { renderStats(); } catch (error) { console.error("Error al refrescar estadísticas:", error); }
        try { renderHomeDashboard(); } catch (error) { console.error("Error al refrescar dashboard:", error); }
      });
    } catch (error) {
      console.error("Error al guardar el evento:", error);
      showToast("No se ha podido agendar el evento. Revisa los datos e inténtalo de nuevo.", "error");
    } finally {
      if (eventSubmitButton) {
        eventSubmitButton.disabled = false;
        eventSubmitButton.textContent = eventSubmitButton.dataset.originalText || "Agendar Evento";
      }
    }
  }

  eventForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCalendarEventFromForm();
  });

  // Refuerzo para navegadores móviles que en ocasiones no disparan correctamente
  // el submit cuando el botón está dentro de un modal desplazable.
  eventSubmitButton?.addEventListener("click", (event) => {
    event.preventDefault();
    saveCalendarEventFromForm();
  });

  document.getElementById("form-wellness")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const playerId = document.getElementById("wellness-player-select").value;
    const player = appState.players.find(p => p.id === playerId);
    
    const fatigueValInp = document.getElementById("wellness-fatigue-val");
    const parsedFatigue = fatigueValInp ? parseInt(fatigueValInp.value, 10) : 2;
    const fatigue = Number.isNaN(parsedFatigue) ? 2 : parsedFatigue;

    const sleepHoursInp = document.getElementById("wellness-sleep-hours");
    const sleepHours = sleepHoursInp && sleepHoursInp.value ? parseFloat(sleepHoursInp.value) : 8;

    const sleepQualInp = document.getElementById("wellness-sleep-quality") || document.getElementById("wellness-sleep-qual");
    const sleepQuality = sleepQualInp ? parseInt(sleepQualInp.value) : 4;

    const rpeInp = document.getElementById("wellness-rpe");
    const rpe = rpeInp ? parseInt(rpeInp.value) : 6;

    const notesInp = document.getElementById("wellness-notes");
    const notes = notesInp ? notesInp.value : "";

    const userLogs = (appState.wellnessLogs || []).filter(l => l.playerId === playerId);
    const weekNum = Math.min(24, userLogs.length + 1);
    const weekInfo = getCurrentWeekKey();

    const dateKey = getLocalDateKey();
    const existingLogIndex = (appState.wellnessLogs || []).findIndex(l => l.playerId === playerId && getLocalDateKey(new Date(l.dateKey || l.date || l.createdAt)) === dateKey);

    if (existingLogIndex !== -1) {
      appState.wellnessLogs[existingLogIndex].fatigue = fatigue;
      appState.wellnessLogs[existingLogIndex].sleepHours = sleepHours;
      appState.wellnessLogs[existingLogIndex].sleepQuality = sleepQuality;
      appState.wellnessLogs[existingLogIndex].rpe = rpe;
      appState.wellnessLogs[existingLogIndex].weekKey = weekInfo.weekKey;
      appState.wellnessLogs[existingLogIndex].dateKey = dateKey;
      appState.wellnessLogs[existingLogIndex].date = dateKey;
      const todaySession = (appState.events || []).find(ev => ev.type === 'Entrenamiento' && ev.date === dateKey);
      appState.wellnessLogs[existingLogIndex].sessionId = todaySession?.id || appState.wellnessLogs[existingLogIndex].sessionId || null;
      if (notes) appState.wellnessLogs[existingLogIndex].notes = notes;
    } else {
      const newLog = {
        id: "w_" + Date.now(),
        playerId,
        playerName: player ? player.name : "Jugadora",
        weekNum: weekNum,
        weekKey: weekInfo.weekKey,
        dateKey,
        date: dateKey,
        sessionId: (appState.events || []).find(ev => ev.type === 'Entrenamiento' && ev.date === dateKey)?.id || null,
        sleepHours,
        sleepQuality,
        fatigue,
        rpe,
        notes
      };
      newLog.createdAt = new Date().toISOString();
      appState.wellnessLogs.unshift(newLog);
    }
    syncEngagementLedger();

    saveAppData(appState);
    invalidateViewRenderCache();
    homeDashboardCache = { revision: -1, role: '', dayKey: '' };
    renderWellness();
    renderHomePortalRSVP();
    renderHomeDashboard();
    showToast("¡Bienestar guardado correctamente!");
    document.getElementById("modal-add-wellness").classList.remove("active");
  });
}

function updateBorgInteractiveUI(val) {
  const parsedVal = parseInt(val, 10);
  const numVal = Number.isNaN(parsedVal) ? 2 : parsedVal;
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
    let labelText = "😊 2 - Bien / Fresca";
    let bg = "#22c55e";
    let textColor = "#ffffff";

    if (numVal === 1) { labelText = "😁 1 - Muy bien"; bg = "#14b8a6"; textColor = "#ffffff"; }
    else if (numVal === 2) { labelText = "😊 2 - Bien / Fresca"; bg = "#22c55e"; textColor = "#ffffff"; }
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
    if (t.isOwn) tr.classList.add('league-own-team-row');

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
        ${t.isOwn ? 'CV Bunyola' : t.name}
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


let tournamentMatchDrafts = [];

function makeTournamentMatchDraft(data = {}) {
  const ownTeam = appState?.teamInfo?.name || 'CV BUNYOLA';
  return {
    id: data.id || `tm_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    teamA: data.teamA || data.homeTeam || ownTeam,
    teamB: data.teamB || data.awayTeam || data.opponent || '',
    opponent: data.opponent || data.teamB || '', // compatibilidad con torneos anteriores
    time: data.time || '10:00'
  };
}

function renderTournamentMatchEditor() {
  const list = document.getElementById('tournament-matches-list');
  if (!list) return;
  if (!tournamentMatchDrafts.length) tournamentMatchDrafts = [makeTournamentMatchDraft()];
  list.innerHTML = tournamentMatchDrafts.map((match, index) => `
    <div class="tournament-match-row tournament-match-row-manual" data-tournament-match-id="${match.id}">
      <div class="tournament-opponent-input">
        <label>Equipo 1</label>
        <input type="text" class="form-control tournament-team-a" value="${String(match.teamA || '').replace(/"/g,'&quot;')}" placeholder="Ej. CV Bunyola" required>
      </div>
      <div class="tournament-opponent-input">
        <label>Equipo 2</label>
        <input type="text" class="form-control tournament-team-b" value="${String(match.teamB || '').replace(/"/g,'&quot;')}" placeholder="Nombre libre del rival" required>
      </div>
      <div>
        <label>Horario</label>
        <input type="time" class="form-control tournament-match-time" value="${match.time || '10:00'}" required>
      </div>
      <button type="button" class="btn btn-danger btn-sm tournament-remove-btn" title="Eliminar partido"><i data-lucide="trash-2"></i></button>
    </div>`).join('');

  list.querySelectorAll('.tournament-match-row').forEach(row => {
    const id = row.dataset.tournamentMatchId;
    const draft = tournamentMatchDrafts.find(m => m.id === id);
    row.querySelector('.tournament-team-a')?.addEventListener('input', e => { if (draft) draft.teamA = e.target.value; });
    row.querySelector('.tournament-team-b')?.addEventListener('input', e => { if (draft) { draft.teamB = e.target.value; draft.opponent = e.target.value; } });
    row.querySelector('.tournament-match-time')?.addEventListener('input', e => { if (draft) draft.time = e.target.value; });
    row.querySelector('.tournament-remove-btn')?.addEventListener('click', () => {
      tournamentMatchDrafts = tournamentMatchDrafts.filter(m => m.id !== id);
      renderTournamentMatchEditor();
    });
  });
  if (window.lucide) lucide.createIcons();
}

function collectTournamentMatches() {
  return tournamentMatchDrafts
    .map(m => ({...m, teamA: (m.teamA || '').trim(), teamB: (m.teamB || '').trim(), opponent: (m.teamB || '').trim()}))
    .filter(m => m.teamA && m.teamB);
}

function resetTournamentEditor(matches = []) {
  tournamentMatchDrafts = (matches || []).map(makeTournamentMatchDraft);
  if (!tournamentMatchDrafts.length) tournamentMatchDrafts = [makeTournamentMatchDraft()];
  renderTournamentMatchEditor();
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

  const tournamentBox = document.getElementById("tournament-editor-box");
  if (typeSelect.value === "Partido" || typeSelect.value === "Amistoso") {
    quickBox.style.display = "block";
    if (tournamentBox) tournamentBox.style.display = "none";
    if (uploadBox) uploadBox.style.display = "none";
    populateMatchOpponentsSelect();
    autoFillMatchTitleAndLocation();
  } else if (typeSelect.value === "Torneo") {
    quickBox.style.display = "none";
    if (tournamentBox) tournamentBox.style.display = "block";
    if (uploadBox) uploadBox.style.display = "none";
    const titleInp = document.getElementById("event-title-input");
    if (titleInp && !titleInp.value.trim()) titleInp.value = "Torneo";
    renderTournamentMatchEditor();
  } else if (typeSelect.value === "Entrenamiento") {
    if (tournamentBox) tournamentBox.style.display = "none";
    quickBox.style.display = "none";
    if (uploadBox) uploadBox.style.display = "block";
  } else {
    quickBox.style.display = "none";
    if (tournamentBox) tournamentBox.style.display = "none";
    if (uploadBox) uploadBox.style.display = "none";
  }
}

function autoFillMatchTitleAndLocation() {
  const typeSelect = document.getElementById("event-type-input");
  if (typeSelect && !["Partido","Amistoso"].includes(typeSelect.value)) return;

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
   RENDIMIENTO: SJ, CMJ, ABALAKOV, DROP JUMP E HISTÓRICO
   ========================================================================== */
let activeFitnessChart = null;
let currentPerformanceTest = "CMJ";

function getJumpTestRecords() {
  if (!appState.performanceData) appState.performanceData = {};
  if (!Array.isArray(appState.performanceData.jumpTests)) {
    const legacy = []; // RC1: no migrar registros de demostración
    appState.performanceData.jumpTests = [];
    legacy.forEach(record => {
      if (Number(record.cmj) > 0) appState.performanceData.jumpTests.push({ id: `${record.id || Date.now()}_cmj`, playerId: record.playerId, playerName: record.playerName, date: record.date, test: "CMJ", result: Number(record.cmj), unit: "cm" });
      if (Number(record.cmjBrazos) > 0) appState.performanceData.jumpTests.push({ id: `${record.id || Date.now()}_abalakov`, playerId: record.playerId, playerName: record.playerName, date: record.date, test: "Abalakov", result: Number(record.cmjBrazos), unit: "cm" });
    });
    if (legacy.length) saveAppData(appState);
  }
  return appState.performanceData.jumpTests;
}

function getVisiblePerformancePlayers() {
  const user = getCurrentUser();
  if (isCoachUser()) return appState.players || [];
  return (appState.players || []).filter(player => player.id === user?.playerId);
}

function setPerformanceTest(test) {
  currentPerformanceTest = ["SJ", "CMJ", "Abalakov", "Drop Jump", "Histórico"].includes(test) ? test : "CMJ";
  document.querySelectorAll("[data-performance-test]").forEach(btn => btn.classList.toggle("active", btn.dataset.performanceTest === currentPerformanceTest));
  const typeSelect = document.getElementById("jump-test-type");
  if (typeSelect && currentPerformanceTest !== "Histórico") {
    typeSelect.value = currentPerformanceTest;
    updateJumpTestUnit();
  }
  renderPerformanceContent();
}
window.setPerformanceTest = setPerformanceTest;

function toggleJumpTestForm(show) {
  const card = document.getElementById("jump-test-form-card");
  if (!card || !isCoachUser()) return;
  card.hidden = !show;
  if (show) {
    populateJumpTestPlayers();
    const date = document.getElementById("jump-test-date");
    if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
    if (window.lucide) lucide.createIcons();
  }
}
window.toggleJumpTestForm = toggleJumpTestForm;

function populateJumpTestPlayers() {
  const select = document.getElementById("jump-test-player");
  if (!select) return;
  select.innerHTML = (appState.players || []).map(player => `<option value="${player.id}">${player.name} (#${player.number || '-'})</option>`).join('');
}

function updateJumpTestUnit() {
  const type = document.getElementById("jump-test-type")?.value || "CMJ";
  const unit = document.getElementById("jump-test-unit");
  const input = document.getElementById("jump-test-result");
  if (unit) unit.textContent = type === "Drop Jump" ? "RSI" : "cm";
  if (input) input.step = type === "Drop Jump" ? "0.01" : "0.1";
}
window.updateJumpTestUnit = updateJumpTestUnit;

function renderPerformanceModule() {
  const newButton = document.getElementById("btn-new-jump-test");
  if (newButton) { newButton.hidden = !isCoachUser(); newButton.style.display = isCoachUser() ? "inline-flex" : "none"; }
  getJumpTestRecords();
  populateJumpTestPlayers();
  document.querySelectorAll("[data-performance-test]").forEach(btn => btn.classList.toggle("active", btn.dataset.performanceTest === currentPerformanceTest));
  renderPerformanceContent();
  if (window.lucide) lucide.createIcons();
}

function formatPerformanceDate(value) {
  const parts = String(value || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value || '-';
}

function renderPerformanceContent() {
  const root = document.getElementById("performance-current-view");
  if (!root) return;
  const players = getVisiblePerformancePlayers();
  const allowed = new Set(players.map(player => player.id));
  const records = getJumpTestRecords().filter(record => allowed.has(record.playerId));
  if (currentPerformanceTest === "Histórico") {
    renderPerformanceHistory(root, players, records);
    return;
  }
  const testRecords = records.filter(record => record.test === currentPerformanceTest);
  root.innerHTML = renderPerformanceTestSummary(players, testRecords, currentPerformanceTest);
  if (window.lucide) lucide.createIcons();
}

function renderPerformanceTestSummary(players, records, test) {
  const unit = test === "Drop Jump" ? "RSI" : "cm";
  const decimals = test === "Drop Jump" ? 2 : 1;
  const cards = players.map(player => {
    const playerRecords = records.filter(record => record.playerId === player.id).sort((a,b) => new Date(b.date)-new Date(a.date));
    const latest = playerRecords[0];
    const best = playerRecords.length ? Math.max(...playerRecords.map(record => Number(record.result) || 0)) : null;
    return `<article class="performance-result-card">
      <div class="performance-result-player"><img src="${player.avatar || DEFAULT_AVATAR}" alt=""><span><strong>${player.name}</strong><small>#${player.number || '-'}</small></span></div>
      <div class="performance-result-metrics">
        <div><span>Último</span><strong>${latest ? `${Number(latest.result).toFixed(decimals)} <small>${unit}</small>` : '—'}</strong></div>
        <div><span>Mejor</span><strong>${best ? `${best.toFixed(decimals)} <small>${unit}</small>` : '—'}</strong></div>
      </div>
      <div class="performance-result-date"><i data-lucide="calendar-days"></i>${latest ? formatPerformanceDate(latest.date) : 'Sin registros'}</div>
    </article>`;
  }).join('');
  return `<div class="card performance-table-card">
    <div class="performance-section-heading"><div><h4>${test}</h4><p>Último resultado y mejor marca de cada jugadora.</p></div><span class="performance-count">${records.length} registros</span></div>
    <div class="performance-results-grid">${cards || '<div class="training-empty compact"><p>Sin jugadoras</p></div>'}</div>
  </div>`;
}

function renderPerformanceHistory(root, players, records) {
  const selectedPlayer = players[0];
  root.innerHTML = `<div class="performance-history-grid">
    <div class="card performance-chart-card">
      <div class="performance-section-heading"><div><h4>Histórico individual</h4><p>Selecciona jugadora y test para consultar su evolución.</p></div></div>
      <div class="performance-history-filters">
        <select id="performance-history-player" class="form-control" onchange="updatePerformanceHistoryChart()">${players.map(player => `<option value="${player.id}">${player.name}</option>`).join('')}</select>
        <select id="performance-history-test" class="form-control" onchange="updatePerformanceHistoryChart()"><option>SJ</option><option>CMJ</option><option>Abalakov</option><option>Drop Jump</option></select>
      </div>
      <div class="performance-chart-wrap"><canvas id="performance-history-chart"></canvas></div>
    </div>
    <div class="card performance-log-card"><div class="performance-section-heading"><div><h4>Últimos registros</h4><p>Todos los test ordenados por fecha.</p></div></div><div id="performance-history-log"></div></div>
  </div>`;
  if (selectedPlayer) updatePerformanceHistoryChart();
  else document.getElementById("performance-history-log").innerHTML = '<div class="training-empty"><p>No hay jugadoras disponibles.</p></div>';
  if (window.lucide) lucide.createIcons();
}

function updatePerformanceHistoryChart() {
  const playerId = document.getElementById("performance-history-player")?.value;
  const test = document.getElementById("performance-history-test")?.value || "CMJ";
  const records = getJumpTestRecords().filter(record => record.playerId === playerId && record.test === test).sort((a,b) => new Date(a.date)-new Date(b.date));
  const canvas = document.getElementById("performance-history-chart");
  if (!canvas) return;
  if (activeFitnessChart) activeFitnessChart.destroy();
  activeFitnessChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: records.length ? records.map(record => formatPerformanceDate(record.date)) : ['Sin datos'], datasets: [{ label: test, data: records.length ? records.map(record => Number(record.result)) : [0], borderWidth: 3, tension: .3, fill: false, pointRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false, title: { display: true, text: test === 'Drop Jump' ? 'RSI' : 'Centímetros' } } } }
  });
  const log = document.getElementById("performance-history-log");
  if (log) log.innerHTML = records.length ? [...records].reverse().map(record => `<div class="performance-log-row"><span><strong>${formatPerformanceDate(record.date)}</strong><small>${test}</small></span><b>${Number(record.result).toFixed(test === 'Drop Jump' ? 2 : 1)} ${test === 'Drop Jump' ? 'RSI' : 'cm'}</b></div>`).join('') : '<div class="training-empty compact"><p>Sin registros para este test.</p></div>';
}
window.updatePerformanceHistoryChart = updatePerformanceHistoryChart;

function initJumpTestFormListener() {
  const form = document.getElementById("form-jump-test");
  const type = document.getElementById("jump-test-type");
  if (type) type.addEventListener('change', updateJumpTestUnit);
  if (!form || form.dataset.listenerReady === '1') return;
  form.dataset.listenerReady = '1';
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!isCoachUser()) return;
    const playerId = document.getElementById("jump-test-player")?.value;
    const test = document.getElementById("jump-test-type")?.value;
    const date = document.getElementById("jump-test-date")?.value;
    const result = Number(document.getElementById("jump-test-result")?.value);
    if (!playerId || !test || !date || !Number.isFinite(result) || result <= 0) {
      showToast('Completa todos los datos del test.', 'error');
      return;
    }
    const player = (appState.players || []).find(item => item.id === playerId);
    getJumpTestRecords().push({ id: `jump_${Date.now()}`, playerId, playerName: player?.name || 'Jugadora', test, date, result, unit: test === 'Drop Jump' ? 'RSI' : 'cm' });
    if (player && test === 'CMJ') player.cmj = `${result.toFixed(1)} cm`;
    saveAppData(appState);
    document.getElementById("jump-test-result").value = '';
    toggleJumpTestForm(false);
    currentPerformanceTest = test;
    renderPerformanceModule();
    showToast(`${test} registrado correctamente.`);
  });
}

// Cálculo de Asistencia a Entrenamientos y Sistema de Logros/Recompensas
function calculatePlayerAttendanceAndAchievements(playerId) {
  const now = new Date();
  const records = (appState.attendanceData || [])
    .filter(r => r.playerId === playerId && (!r.date || new Date(r.date) <= now))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const isPresent = r => r.status === "present" || r.status === "attended";
  const isAbsent = r => r.status === "absent" || r.status === "missed";
  const achievementRecords = records.filter(r => r.achievementEligible !== false);
  const totalAttended = records.filter(isPresent).length;
  const totalMissed = records.filter(isAbsent).length;
  const total = totalAttended + totalMissed;
  const ratio = total ? Math.round(totalAttended * 100 / total) : 0;

  let running = 0, maxStreak = 0;
  achievementRecords.forEach(r => { running = isPresent(r) ? running + 1 : (isAbsent(r) ? 0 : running); maxStreak = Math.max(maxStreak, running); });
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
  achievementRecords.forEach(r => { const key=(r.date||"").slice(0,7); if(!key)return; months[key] ||= {present:0, absent:0}; isPresent(r)?months[key].present++:months[key].absent++; });
  const perfectMonths = Object.values(months).filter(m => m.present >= 4 && m.absent === 0).length;

  const matchAttendance = achievementRecords.filter(r => {
    const evt=(appState.events||[]).find(e=>e.id===r.eventId); return evt && evt.type === "Partido" && isPresent(r);
  }).length;
  const points = getPlayerEngagement(playerId).xp;
  const levels = [
    {name:"Inicio", min:0}, {name:"Compromiso", min:50}, {name:"Constancia", min:150},
    {name:"Referente", min:300}, {name:"Líder de equipo", min:500}
  ];
  let levelIndex=0; levels.forEach((l,i)=>{ if(points>=l.min) levelIndex=i; });
  const level=levels[levelIndex], nextLevel=levels[levelIndex+1] || null;
  const levelProgress = nextLevel ? Math.round((points-level.min)*100/(nextLevel.min-level.min)) : 100;

  const achievementAttended = achievementRecords.filter(isPresent).length;
  const achievementMissed = achievementRecords.filter(isAbsent).length;
  const achievementRatio = (achievementAttended + achievementMissed) ? Math.round(achievementAttended * 100 / (achievementAttended + achievementMissed)) : 0;
  const defs = [
    ["firstClass","Primer entrenamiento","Asistir al primer entrenamiento validado","circle-check",achievementAttended,1],
    ["streak5","Racha de 5","Completar 5 entrenamientos consecutivos","flame",maxStreak,5],
    ["streak10","Racha de 10","Completar 10 entrenamientos consecutivos","flame",maxStreak,10],
    ["perfectMonth","Mes perfecto","Completar un mes sin ausencias","calendar-check",perfectMonths,1],
    ["wellness5","Cuidarse también entrena","Responder 5 cuestionarios wellness","heart-pulse",wellnessCount,5],
    ["wellness10","Autoconocimiento","Responder 10 cuestionarios wellness","activity",wellnessCount,10],
    ["goalsWeek1","Semana completa","Completar todos los objetivos obligatorios de una semana","target",completeWeeks,1],
    ["goalsWeek5","Constancia semanal","Completar 5 semanas de objetivos","badge-check",completeWeeks,5],
    ["eliteAttendance","Asistencia 90%","Mantener al menos un 90% de asistencia","award",achievementRatio,90]
  ];
  const achievements = defs.map(([id,title,desc,icon,value,target]) => ({
    id,title,desc,icon,unlocked:value>=target,
    progress:Math.min(100,Math.round(value*100/target)),
    progressText:value>=target?"¡Desbloqueado!":`${value} / ${target}`
  }));

  return { totalAttended,totalMissed,ratio,currentStreak,maxStreak,wellnessCount,completeWeeks,points,level:level.name,nextLevel:nextLevel?.name||null,pointsToNext:nextLevel?nextLevel.min-points:0,levelProgress,achievements };
}

window.calculatePlayerAttendanceAndAchievements = calculatePlayerAttendanceAndAchievements;

function isSameEventId(idA, idB) {
  if (!idA || !idB) return false;
  const sA = String(idA).trim();
  const sB = String(idB).trim();
  if (sA === sB) return true;

  const evA = (appState.events || []).find(e => String(e.id) === sA || String(e.legacyId) === sA || String(e.legacy_id) === sA);
  const evB = (appState.events || []).find(e => String(e.id) === sB || String(e.legacyId) === sB || String(e.legacy_id) === sB);

  if (evA && evB && evA === evB) return true;
  if (evA && (String(evA.id) === sB || String(evA.legacyId) === sB || String(evA.legacy_id) === sB)) return true;
  if (evB && (String(evB.id) === sA || String(evB.legacyId) === sA || String(evB.legacy_id) === sA)) return true;

  return false;
}

function isSamePlayerId(idA, idB) {
  if (!idA || !idB) return false;
  const sA = String(idA).trim();
  const sB = String(idB).trim();
  if (sA === sB) return true;

  const pA = (appState.players || []).find(p => String(p.id) === sA || String(p.legacy_id) === sA || String(p.profile_id) === sA);
  const pB = (appState.players || []).find(p => String(p.id) === sB || String(p.legacy_id) === sB || String(p.profile_id) === sB);

  if (pA && pB && pA === pB) return true;
  if (pA && (String(pA.id) === sB || String(pA.legacy_id) === sB || String(pA.profile_id) === sB)) return true;
  if (pB && (String(pB.id) === sA || String(pB.legacy_id) === sA || String(pB.profile_id) === sA)) return true;

  return false;
}

function getPlayerConfirmationForEvent(eventId, playerId) {
  if (!eventId || !playerId) return null;
  const confirmations = appState.trainingConfirmations || [];
  return confirmations.find(c =>
    (isSameEventId(c.eventId, eventId) || isSameEventId(c.eventIdLegacy, eventId)) &&
    (isSamePlayerId(c.playerId, playerId) || isSamePlayerId(c.playerIdLegacy, playerId))
  ) || null;
}

// SISTEMA DE CONFIRMACIÓN DE ASISTENCIA A ENTRENAMIENTOS ("¿ACUDIRÉ AL ENTRENAMIENTO?")
async function confirmTrainingAttendance(eventId, status, btnElement = null) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.playerId) {
    showToast("Solo las jugadoras con perfil asignado pueden enviar confirmación de asistencia.", "error");
    return;
  }

  if (!appState.trainingConfirmations) {
    appState.trainingConfirmations = [];
  }

  const userPId = currentUser.playerId || currentUser.authId || currentUser.id;
  const existingConfirmation = getPlayerConfirmationForEvent(eventId, userPId);
  if (existingConfirmation) {
    showToast("Tu respuesta ya fue enviada y no se puede modificar.", "info");
    return;
  }

  // Deshabilitar botones temporalmente durante el guardado
  const parentContainer = btnElement ? btnElement.closest('.dashboard-actions, .training-rsvp, .dashboard-rsvp-actions') : null;
  const buttonsToDisable = parentContainer ? parentContainer.querySelectorAll('button') : document.querySelectorAll('.btn-rsvp-yes, .btn-rsvp-no');
  buttonsToDisable.forEach(b => { b.disabled = true; });

  if (window.VolleySupabase && window.VolleySupabase.getClient()) {
    showToast("Guardando en Supabase…", "info");
    const { data: savedRow, error: supabaseError } = await window.VolleySupabase.savePlayerAttendanceResponse(
      eventId,
      currentUser.playerId,
      status
    );

    if (supabaseError) {
      console.error("[Supabase Attendance] Error al guardar respuesta:", supabaseError);
      showToast("Error al guardar en Supabase: " + (supabaseError.message || "Fallo de conexión"), "error");
      buttonsToDisable.forEach(b => { b.disabled = false; });
      return;
    }
  }

  appState.trainingConfirmations = appState.trainingConfirmations.filter(
    c => !(isSameEventId(c.eventId, eventId) && isSamePlayerId(c.playerId, userPId))
  );

  appState.trainingConfirmations.push({
    eventId,
    playerId: currentUser.playerId,
    status,
    timestamp: new Date().toISOString()
  });

  if (status === 'yes') {
    awardEngagementXP(currentUser.playerId, 'attendance-confirm', eventId, appState.engagementSettings?.attendanceConfirm || 5, 'Asistencia comunicada');
  } else {
    removeEngagementXP(currentUser.playerId, 'attendance-confirm', eventId);
  }

  saveAppData(appState);

  const isYes = status === 'yes';
  showToast(
    isYes
      ? `🟢 ¡Asistencia comunicada correctamente!`
      : `🔴 Ausencia comunicada correctamente.`
  );

  renderHomeDashboard();
  renderHomePortalRSVP();
  renderTraining();
  if (typeof activeSessionId !== 'undefined' && activeSessionId === eventId) renderSessionCenterDetail();
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
  const eventConfirmations = confirmations.filter(c => isSameEventId(c.eventId, upcomingTraining.id));
  const yesCount = eventConfirmations.filter(c => c.status === "yes").length;
  const noCount = eventConfirmations.filter(c => c.status === "no").length;

  let playerConfirm = null;
  if (currentUser) {
    const pId = currentUser.playerId || currentUser.authId || currentUser.id;
    playerConfirm = upcomingTraining && pId ? getPlayerConfirmationForEvent(upcomingTraining.id, pId) : null;
  }

  let actionHTML = "";
  if (!isCoach) {
    if (playerConfirm) {
      if (playerConfirm.status === "yes") {
        actionHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="rsvp-badge-yes">✓ Asistencia confirmada</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="openSeasonEvent('${upcomingTraining.id}')">Abrir sesión</button>
          </div>
        `;
      } else {
        actionHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="rsvp-badge-no">Ausencia comunicada</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="openSeasonEvent('${upcomingTraining.id}')">Abrir sesión</button>
          </div>
        `;
      }
    } else {
      actionHTML = `
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn-rsvp-yes" onclick="confirmTrainingAttendance('${upcomingTraining.id}', 'yes', this)">
            <i data-lucide="check-circle-2" style="width: 18px; height: 18px;"></i> Sí, asistiré
          </button>
          <button type="button" class="btn-rsvp-no" onclick="confirmTrainingAttendance('${upcomingTraining.id}', 'no', this)">
            <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i> No podré
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="openSeasonEvent('${upcomingTraining.id}')">Abrir sesión</button>
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

  if (window.VolleySupabase && window.VolleySupabase.getClient()) {
    loadAttendanceFromSupabase({ silent: true, force: true });
  }

  const event = appState.events.find(e => e.id === eventId);
  const title = document.getElementById("verify-attendance-title");
  if (title && event) {
    title.innerHTML = `<i data-lucide="clipboard-check"></i> Pasar Lista: ${event.title} (${event.date})`;
  }

  inputEventId.value = eventId;
  container.innerHTML = "";

  const confirmations = appState.trainingConfirmations || [];
  const eventConfirmations = confirmations.filter(c => (isSameEventId(c.eventId, eventId) || isSameEventId(c.eventIdLegacy, eventId)));
  const verifiedLogs = appState.attendanceData || [];

  appState.players.forEach(p => {
    const playerRSVP = eventConfirmations.find(c => (isSamePlayerId(c.playerId, p.id) || isSamePlayerId(c.playerIdLegacy, p.id)));
    const existingLog = verifiedLogs.find(a => (isSameEventId(a.eventId, eventId) || isSameEventId(a.eventIdLegacy, eventId)) && (isSamePlayerId(a.playerId, p.id) || isSamePlayerId(a.playerIdLegacy, p.id)));

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const eventId = document.getElementById("verify-attendance-event-id").value;
    const event = appState.events.find(x => x.id === eventId);
    const dateStr = event ? event.date : new Date().toLocaleDateString('es-ES');

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Guardando en Supabase…";
    }

    try {
      const playerStatusList = [];
      let presentCount = 0;

      appState.players.forEach(p => {
        const checkbox = document.getElementById(`verify-p-${p.id}`);
        const isPresent = checkbox ? checkbox.checked : false;
        if (isPresent) presentCount++;

        playerStatusList.push({
          playerId: p.id,
          officialStatus: isPresent ? 'present' : 'unjustified'
        });
      });

      if (window.VolleySupabase && window.VolleySupabase.getClient()) {
        const user = getCurrentUser();
        const coachProfileId = user?.authId || user?.id || null;

        const { data: validatedRows, error: supabaseError } = await window.VolleySupabase.validateOfficialAttendance(
          eventId,
          playerStatusList,
          coachProfileId
        );

        if (supabaseError) {
          console.error("[Supabase Attendance] Error al validar lista:", supabaseError);
          showToast("Error al validar la lista en Supabase: " + (supabaseError.message || "Fallo de conexión"), "error");
          return;
        }
      }

      if (!appState.attendanceData) appState.attendanceData = [];
      appState.attendanceData = appState.attendanceData.filter(a => a.eventId !== eventId);

      const nowISO = new Date().toISOString();
      if (event) event.attendanceValidatedAt = nowISO;

      playerStatusList.forEach(item => {
        const p = appState.players.find(p => p.id === item.playerId);
        const isPresent = item.officialStatus === 'present' || item.officialStatus === 'late';
        appState.attendanceData.push({
          id: `att-${Date.now()}-${item.playerId}`,
          eventId,
          playerId: item.playerId,
          playerName: p ? p.name : 'Jugadora',
          date: dateStr,
          status: item.officialStatus,
          source: 'coach_roll_call',
          validatedAt: nowISO
        });

        if (isPresent) {
          awardEngagementXP(item.playerId, 'training-attendance', eventId, appState.engagementSettings?.trainingAttendance || 20, 'Asistencia validada por el entrenador', dateStr);
        } else {
          removeEngagementXP(item.playerId, 'training-attendance', eventId);
        }
      });

      syncEngagementLedger();
      saveAppData(appState);
      if (typeof invalidateViewRenderCache === "function") invalidateViewRenderCache();
      homeDashboardCache = { revision: -1, role: '', dayKey: '' };

      showToast(`Lista validada: ${presentCount} asistencias oficiales computadas.`);

      document.getElementById("modal-verify-attendance")?.classList.remove("active");
      renderTraining();
      renderHomePortalRSVP();
      renderHomeDashboard();
    } catch (err) {
      console.error("[Attendance Validation] Excepción:", err);
      showToast("No se pudo confirmar la lista.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Lista";
      }
    }
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


function setTrainingRPE(eventId, rpeVal, mode = null) {
  const currentUser = getCurrentUser();
  const tr = (appState.events || []).find(e => e.id === eventId);
  if (!tr) return;
  const numVal = Math.max(0, Math.min(10, parseInt(rpeVal,10)));
  if (!Number.isFinite(numVal)) return;

  const coachMode = mode === 'coach' || (!currentUser?.playerId && isCoachUser());
  if (coachMode) {
    if (Number.isFinite(Number(tr.coachRpe))) { showToast('Tu valoración ya está registrada y no puede modificarse.', 'error'); return; }
    tr.coachRpe = numVal;
    saveAppData(appState); renderTraining(); showToast(`Tu valoración de exigencia: ${numVal}/10`); return;
  }

  const playerId = currentUser?.playerId;
  if (!playerId) return;
  if (!appState.trainingRPEs) appState.trainingRPEs = [];
  const existing = appState.trainingRPEs.find(r => r.eventId === eventId && r.playerId === playerId);
  if (existing) { showToast('Tu RPE ya está registrado y no puede modificarse.', 'error'); return; }
  appState.trainingRPEs.push({ eventId, playerId, rpeVal: numVal, date: getLocalDateKey() });
  awardEngagementXP(playerId,'rpe',eventId,appState.engagementSettings?.rpe||10,'RPE registrado');
  saveAppData(appState); renderTraining(); renderHomePortalRSVP(); renderHomeDashboard(); renderTeamRpeSummary(); if (document.getElementById('view-wellness')?.classList.contains('active')) { renderWellness(); renderWellnessCharts(); } showToast(`Esfuerzo registrado: ${numVal}/10`);
}

function addPlayerRpeByCoach(eventId, playerId) {
  if (!isCoachUser()) return;
  const select = document.getElementById(`coach-rpe-${eventId}-${playerId}`);
  const value = Math.max(0, Math.min(10, parseInt(select?.value, 10)));
  if (!Number.isFinite(value)) return;
  if (!appState.trainingRPEs) appState.trainingRPEs = [];
  const existing = appState.trainingRPEs.find(r => r.eventId === eventId && r.playerId === playerId);
  if (existing) { showToast('Ese registro ya existe y no puede modificarse.', 'error'); return; }
  appState.trainingRPEs.push({ eventId, playerId, rpeVal: value, date: getLocalDateKey(), addedByCoach: true });
  awardEngagementXP(playerId,'rpe',eventId,appState.engagementSettings?.rpe||10,'RPE registrado por el entrenador');
  saveAppData(appState); toggleTrainingHistoryDetail(eventId); toggleTrainingHistoryDetail(eventId); renderTeamRpeSummary(); if (document.getElementById('view-wellness')?.classList.contains('active')) { renderWellness(); renderWellnessCharts(); } showToast('RPE añadido correctamente.');
}
window.addPlayerRpeByCoach = addPlayerRpeByCoach;

window.setTrainingRPE = setTrainingRPE;

window.deletePlayer = function(playerId) {
  if (!isCoachUser()) return;
  const player = appState.players.find(p => p.id === playerId);
  if (!player) return;
  if(!confirm(`¿Eliminar a ${player.name} de la plantilla? Esta acción también borrará su usuario y sus registros asociados.`)) return;
  appState.players = appState.players.filter(p => p.id !== playerId);
  appState.users = (appState.users || []).filter(u => u.playerId !== playerId);
  appState.wellnessLogs = (appState.wellnessLogs || []).filter(l => l.playerId !== playerId);
  appState.trainingRPEs = (appState.trainingRPEs || []).filter(r => r.playerId !== playerId);
  appState.attendance = (appState.attendance || []).filter(a => a.playerId !== playerId);
  appState.weeklyGoals = (appState.weeklyGoals || []).filter(g => g.playerId !== playerId);
  appState.personalGoals = (appState.personalGoals || []).filter(g => g.playerId !== playerId);
  saveAppData(appState);
  document.getElementById('modal-player-detail')?.classList.remove('active');
  renderRoster();
  renderUsers();
  renderDashboard();
  showToast(`${player.name} ha sido eliminada de la plantilla.`);
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

function closeMobileNavigationOverlays() {
  // Al cambiar de sección desde la barra inferior, la pantalla anterior debe
  // desaparecer por completo. Esto evita que "Mi perfil" u otro modal siga
  // abierto por encima de Calendario, Plan, Plantilla, etc.
  document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.classList.remove('modal-open');
}

function initMobileNavListeners() {
  const navItems = document.querySelectorAll('#mobile-bottom-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');

      closeMobileNavigationOverlays();

      if (item.dataset.action === 'profile') {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('btn-my-profile-home')?.click();
        return;
      }

      // Update active state in bottom nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Navigate directly to the selected main screen.
      openModule(target);
      window.scrollTo(0, 0);
    });
  });
}
document.addEventListener('DOMContentLoaded', initMobileNavListeners);

// Override openModule to sync the mobile bottom nav
const originalOpenModule = window.openModule;
if (originalOpenModule) {
  window.openModule = function(moduleName, options = {}) {
    originalOpenModule(moduleName, options);
    
    // Sincroniza la navegación rápida de móvil y escritorio.
    const navItems = document.querySelectorAll('#mobile-bottom-nav .nav-item, #desktop-quick-nav .desktop-nav-item');
    navItems.forEach(n => n.classList.remove('active'));

    let target = moduleName;
    if (moduleName === "home-portal" || moduleName === "home") target = "home";

    document.querySelectorAll(`[data-target="${target}"]`).forEach(item => item.classList.add('active'));
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
  if (!evt || !evt.date) return new Date(NaN);
  const match = String(evt.time || "").match(/\d{1,2}:\d{2}/);
  const time = match ? match[0].padStart(5, "0") : "23:59";
  const parsed = new Date(`${evt.date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${evt.date}T23:59:00`) : parsed;
}
function normalizeEventType(value) {
  return String(value || "").trim().toLowerCase();
}
function isTrainingEvent(evt) {
  const type = normalizeEventType(evt?.type);
  const title = String(evt?.title || "").toLowerCase();
  return type === "entrenamiento" || title.includes("entreno") || title.includes("entrenamiento");
}
function isMatchEvent(evt) {
  const type = normalizeEventType(evt?.type);
  return type === "partido" || type === "amistoso" || type === "torneo";
}
function isUpcomingCalendarEvent(evt) {
  const start = parseEventStart(evt);
  if (Number.isNaN(start.getTime())) return false;
  const now = new Date();
  const eventDay = new Date(`${evt.date}T23:59:59`);
  // Mantiene visible cualquier evento del día actual aunque su hora ya haya pasado.
  return eventDay >= now;
}
function getUpcomingEvent(type) {
  const predicate = normalizeEventType(type) === "entrenamiento" ? isTrainingEvent : (evt => normalizeEventType(evt?.type) === normalizeEventType(type));
  return (appState.events || []).filter(evt => predicate(evt) && isUpcomingCalendarEvent(evt)).sort((a,b)=>parseEventStart(a)-parseEventStart(b))[0] || null;
}
function getUpcomingTrainingEvent() {
  return (appState.events || []).filter(evt => isTrainingEvent(evt) && isUpcomingCalendarEvent(evt)).sort((a,b)=>parseEventStart(a)-parseEventStart(b))[0] || null;
}
function getUpcomingMatchEvent() {
  return (appState.events || []).filter(evt => isMatchEvent(evt) && isUpcomingCalendarEvent(evt)).sort((a,b)=>parseEventStart(a)-parseEventStart(b))[0] || null;
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
  return (appState.weeklyGoals || []).filter(g =>
    (g.isPersistentPersonalGoal && g.playerId === playerId) ||
    (!g.isPersistentPersonalGoal && g.weekKey === weekKey && (g.isTeamGoal || g.playerId === playerId))
  );
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
  if (hero) {
    hero.style.backgroundImage = "none";
    hero.classList.add("dashboard-hero-no-image");
  }
}
function escapeDashboardText(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char])).replace(/\n/g, "<br>");
}

function getCoachPendingOverview() {
  const players = appState.players || [];
  const events = appState.events || [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekInfo = getWeekInfoForDate(new Date());

  const weeklyResponders = new Set((appState.wellnessLogs || []).filter(log => {
    const key = log.weekKey || getWeekInfoForDate(new Date(log.dateKey || log.date || log.createdAt || Date.now())).weekKey;
    return key === weekInfo.weekKey;
  }).map(log => log.playerId));
  const wellnessPending = players.filter(player => !weeklyResponders.has(player.id)).length;

  const finishedTrainings = events.filter(event => event.type === 'Entrenamiento' && String(event.date || '') <= todayKey);
  const rpePending = finishedTrainings.reduce((total, event) => {
    const responses = new Set((appState.trainingRPEs || []).filter(r => r.eventId === event.id).map(r => r.playerId));
    return total + players.filter(player => !responses.has(player.id)).length;
  }, 0);

  const upcomingTrainings = events.filter(event => event.type === 'Entrenamiento' && String(event.date || '') >= todayKey)
    .sort((a,b) => parseEventStart(a) - parseEventStart(b));
  const attendancePending = upcomingTrainings.slice(0, 3).reduce((total, event) => {
    const responses = new Set((appState.trainingConfirmations || []).filter(c => c.eventId === event.id).map(c => c.playerId));
    return total + players.filter(player => !responses.has(player.id)).length;
  }, 0);

  const playedMatches = events.filter(event => event.type === 'Partido' && (event.result || event.status === 'Finalizado'));
  const statsDraft = playedMatches.filter(match => getStatsPublicationStatus(match) === 'draft').length;
  const statsMissing = playedMatches.filter(match => getStatsPublicationStatus(match) === 'empty').length;

  const scoutingRecords = Object.values(appState.matchScouting || {}).filter(Boolean);
  const tacticsDraft = scoutingRecords.filter(record => {
    if (record && (record.draftPlan || record.publishedPlan || record.status)) return record.status !== 'published' && record.status !== 'archived';
    return true;
  }).length;

  const sessionPlanPending = upcomingTrainings.filter(event => !String(event.plan || '').trim() && !event.attachmentId && !event.sessionImage).length;

  return { wellnessPending, rpePending, attendancePending, statsDraft, statsMissing, tacticsDraft, sessionPlanPending };
}

function openPendingDestination(moduleName) {
  openModule(moduleName);
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
}
window.openPendingDestination = openPendingDestination;

function renderCoachPendingCard() {
  const pending = getCoachPendingOverview();
  const items = [
    { key:'wellnessPending', label:'Bienestar semanal', detail:'respuestas pendientes', icon:'heart-pulse', module:'wellness', tone:'warning' },
    { key:'rpePending', label:'RPE de entrenamientos', detail:'registros pendientes', icon:'activity', module:'training', tone:'warning' },
    { key:'attendancePending', label:'Confirmaciones', detail:'respuestas pendientes', icon:'clipboard-check', module:'training', tone:'info' },
    { key:'statsMissing', label:'Estadísticas sin completar', detail:'partidos pendientes', icon:'chart-no-axes-combined', module:'stats', tone:'danger' },
    { key:'statsDraft', label:'Estadísticas en borrador', detail:'resúmenes sin publicar', icon:'file-pen-line', module:'stats', tone:'warning' },
    { key:'tacticsDraft', label:'Planes tácticos', detail:'planes en borrador', icon:'route', module:'tactics', tone:'gold' },
    { key:'sessionPlanPending', label:'Sesiones por preparar', detail:'entrenamientos sin contenido', icon:'dumbbell', module:'training', tone:'neutral' }
  ];
  const active = items.filter(item => Number(pending[item.key]) > 0);
  const total = active.reduce((sum,item) => sum + Number(pending[item.key] || 0), 0);
  if (!active.length) {
    return `<article class="dashboard-card dashboard-card-wide coach-pending-card is-clear"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="circle-check-big"></i> Pendientes del entrenador</span><span class="coach-pending-total">Todo al día</span></div><div class="coach-pending-empty"><i data-lucide="party-popper"></i><div><strong>No tienes tareas pendientes</strong><p>Bienestar, asistencia, carga, estadísticas y planes están revisados.</p></div></div></article>`;
  }
  return `<article class="dashboard-card dashboard-card-wide coach-pending-card"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="list-checks"></i> Pendientes del entrenador</span><span class="coach-pending-total">${total} pendiente${total===1?'':'s'}</span></div><div class="coach-pending-list">${active.map(item => `<button type="button" class="coach-pending-item tone-${item.tone}" onclick="openPendingDestination('${item.module}')"><span class="coach-pending-icon"><i data-lucide="${item.icon}"></i></span><span class="coach-pending-copy"><strong>${item.label}</strong><small>${item.detail}</small></span><b>${pending[item.key]}</b><i data-lucide="chevron-right" class="coach-pending-arrow"></i></button>`).join('')}</div></article>`;
}

function renderHomeDashboard() {
  const el = document.getElementById("home-dashboard");
  const user = getCurrentUser();
  if (!el || !user) return;
  populateDashboardHero(user);

  const coach = isCoachUser();
  const nextTraining = getUpcomingTrainingEvent();
  const nextMatch = getUpcomingMatchEvent();
  const confirmations = (appState.trainingConfirmations || []).filter(c => nextTraining && isSameEventId(c.eventId, nextTraining.id));
  const yes = confirmations.filter(c => c.status === "yes").length;
  const no = confirmations.filter(c => c.status === "no").length;
  const pending = Math.max(0, (appState.players || []).length - yes - no);
  const matchLogos = nextMatch ? getMatchLogosData(nextMatch) : null;
  const playerId = user.playerId || user.authId;
  const game = playerId ? calculatePlayerAttendanceAndAchievements(playerId) : null;
  const weekGoals = playerId ? getGoalsForPlayer(playerId) : [];
  const done = playerId ? weekGoals.filter(g => isGoalCompleted(g, playerId)).length : 0;
  const wellness = getWellnessStatusCounts();
  const lastMatch = getLatestPlayedMatch();
  const allStats = (appState.players || []).map(p => calculatePlayerAttendanceAndAchievements(p.id));
  const teamAttendance = allStats.length ? Math.round(allStats.reduce((a,b) => a + b.ratio, 0) / allStats.length) : 0;
  const playerConfirm = playerId && nextTraining ? getPlayerConfirmationForEvent(nextTraining.id, playerId) : null;
  const teamGoals = (appState.weeklyGoals || []).filter(g => g.weekKey === getWeekKeyFromDate());
  const requiredPending = teamGoals.filter(g => g.required).reduce((sum,g) => sum + (appState.players || []).filter(p => (g.isTeamGoal || g.playerId === p.id) && !isGoalCompleted(g,p.id)).length, 0);
  const nextMatchScoutingRecord = nextMatch ? appState.matchScouting?.[nextMatch.id] : null;
  const nextMatchPlan = nextMatchScoutingRecord?.status === 'published' && nextMatchScoutingRecord.publishedPlan ? normalizeScoutingPlan(nextMatchScoutingRecord.publishedPlan) : null;
  const serveTargetForPlayer = !coach && nextMatchPlan && !nextMatchPlan.hideServeObjectives ? String(nextMatchPlan.servePlayerTarget || '').trim() : '';

  const trainingActions = !nextTraining ? "" : coach
    ? `<div class="dashboard-actions"><button class="btn btn-primary btn-sm" onclick="openSeasonEvent('${nextTraining.id}')"><i data-lucide="dumbbell"></i>Abrir sesión</button><button class="btn btn-outline btn-sm" onclick="openVerifyAttendanceModal('${nextTraining.id}')"><i data-lucide="clipboard-check"></i>Pasar lista</button></div>`
    : (playerConfirm
      ? `<div class="dashboard-actions"><span class="dashboard-status ${playerConfirm.status === 'yes' ? 'ok' : 'danger'}">${playerConfirm.status === 'yes' ? '✓ Asistencia confirmada' : 'Ausencia comunicada'}</span><button class="btn btn-outline btn-sm" onclick="openSeasonEvent('${nextTraining.id}')">Abrir sesión</button></div>`
      : `<div class="dashboard-actions dashboard-rsvp-actions"><button class="btn-rsvp-yes" onclick="confirmTrainingAttendance('${nextTraining.id}','yes',this)">Sí, asistiré</button><button class="btn-rsvp-no" onclick="confirmTrainingAttendance('${nextTraining.id}','no',this)">No podré</button></div>`);

  const playerPendingCard = !coach && playerId ? renderPlayerPendingOverview(playerId, nextTraining, playerConfirm) : '';

  const trainingCard = `<article class="dashboard-card dashboard-card-main dashboard-card-training">
    <div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="dumbbell"></i> Próximo entrenamiento</span>${nextTraining ? `<span class="dashboard-countdown">${getRelativeEventDate(nextTraining)}</span>` : ''}</div>
    <div class="dashboard-primary-content"><div><h3>${nextTraining ? nextTraining.title : 'Sin entrenamiento programado'}</h3>${nextTraining ? `<p class="dashboard-event-time">${formatEventDate(nextTraining.date)} · ${nextTraining.time}</p><p><i data-lucide="map-pin"></i>${nextTraining.location || 'Ubicación pendiente'}</p>` : `<p>Cuando se programe una sesión aparecerá aquí.</p>`}</div></div>
    ${nextTraining && nextTraining.plan ? `<div class="dashboard-training-plan"><span><i data-lucide="target"></i> Qué vamos a trabajar</span><p>${escapeDashboardText(nextTraining.plan)}</p></div>` : ''}
    ${nextTraining && (nextTraining.attachmentId || nextTraining.sessionImage) ? `<button type="button" class="dashboard-file-preview" onclick="openSessionAttachment('${nextTraining.id}')"><i data-lucide="file-search"></i><span><b>Material de la sesión</b><small>Previsualizar archivo adjunto</small></span><i data-lucide="eye"></i></button>` : ''}
    ${coach && nextTraining ? `<div class="dashboard-metrics"><span><b>${yes}</b> confirmadas</span><span><b>${no}</b> bajas</span><span><b>${pending}</b> pendientes</span></div>` : ''}
    ${nextTraining ? `<button class="dashboard-link" onclick="openSeasonEvent('${nextTraining.id}')">Ver ficha completa de la sesión <i data-lucide="arrow-right"></i></button>` : ''}
    ${trainingActions}</article>`;

  const matchCard = `<article class="dashboard-card dashboard-card-match"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="trophy"></i> Próximo partido</span>${nextMatch ? `<span class="dashboard-countdown soft">${getRelativeEventDate(nextMatch)}</span>` : ''}</div>
    ${nextMatch && matchLogos ? `<div class="dashboard-versus"><div><img src="${matchLogos.team1.logo}" alt="${matchLogos.team1.name}"><span>${matchLogos.team1.name}</span></div><strong>VS</strong><div><img src="${matchLogos.team2.logo}" alt="${matchLogos.team2.name}"><span>${matchLogos.team2.name}</span></div></div><p class="dashboard-match-meta">${formatEventDate(nextMatch.date)} · ${nextMatch.time}<br>${nextMatch.location || 'Pabellón por confirmar'}</p>${serveTargetForPlayer ? `<div class="dashboard-serve-target"><i data-lucide="crosshair"></i><span><small>Objetivo de saque</small><strong>Sacar principalmente a: ${escapeDashboardText(serveTargetForPlayer)}</strong></span></div>` : ''}<button class="dashboard-link" onclick="openModule('tactics')">Ver plan de juego <i data-lucide="arrow-right"></i></button>` : `<div class="dashboard-empty-state"><i data-lucide="calendar-x"></i><h3>Sin partido programado</h3><p>El próximo encuentro aparecerá aquí.</p></div>`}</article>`;

  let summaryCards = '';
  let lowerCards = '';
  if (coach) {
    summaryCards = `<div class="dashboard-summary-grid">
      <article class="dashboard-summary-card state-good"><i data-lucide="heart-pulse"></i><div><strong>${wellness.green}</strong><span>En buen estado</span></div></article>
      <article class="dashboard-summary-card state-warning"><i data-lucide="triangle-alert"></i><div><strong>${wellness.yellow}</strong><span>Requieren atención</span></div></article>
      <article class="dashboard-summary-card state-danger"><i data-lucide="circle-alert"></i><div><strong>${wellness.red}</strong><span>Alertas activas</span></div></article>
      <article class="dashboard-summary-card state-info"><i data-lucide="clipboard-check"></i><div><strong>${teamAttendance}%</strong><span>Asistencia media</span></div></article>
    </div>`;
    const attendanceRows = (appState.players || []).map(p => ({player:p, stats:calculatePlayerAttendanceAndAchievements(p.id)})).sort((a,b)=>b.stats.ratio-a.stats.ratio || a.player.name.localeCompare(b.player.name));
    const attendanceCard = `<article class="dashboard-card dashboard-card-wide coach-attendance-card"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="users-round"></i> Asistencia por jugadora</span><button class="dashboard-link compact" onclick="openModule('training')">Abrir sesiones <i data-lucide="arrow-right"></i></button></div><div class="coach-attendance-list">${attendanceRows.map(({player,stats})=>`<div class="coach-attendance-row"><span><b>${escapeDashboardText(player.name)}</b></span><span><strong>${stats.totalAttended}</strong><small>asistencias</small></span><span><strong>${stats.ratio}%</strong><small>porcentaje</small></span></div>`).join('') || '<p>Sin jugadoras en la plantilla.</p>'}</div><p class="dashboard-card-note">Las asistencias validadas por el entrenador se incluyen en este conteo. Solo generan logros cuando la jugadora había confirmado que asistiría.</p></article>`;
    lowerCards = `${renderCoachPendingCard()}${attendanceCard}<article class="dashboard-card dashboard-card-wide"><span class="dashboard-eyebrow"><i data-lucide="target"></i> Seguimiento semanal</span><div class="dashboard-followup-grid"><div><strong>${pending}</strong><span>Asistencias pendientes</span></div><div><strong>${requiredPending}</strong><span>Objetivos obligatorios pendientes</span></div><div><strong>${wellness.alerts.length}</strong><span>Jugadoras a revisar</span></div></div><button class="dashboard-link" onclick="openModule('goals')">Gestionar objetivos <i data-lucide="arrow-right"></i></button></article>
      <article class="dashboard-card"><span class="dashboard-eyebrow"><i data-lucide="history"></i> Último resultado</span><div class="dashboard-result-block"><strong>${lastMatch ? (lastMatch.result || 'Finalizado') : '—'}</strong><span>${lastMatch ? lastMatch.title : 'La temporada todavía no ha comenzado'}</span></div>${lastMatch ? `<button class="dashboard-link" onclick="openModule('stats')">Ver estadísticas <i data-lucide="arrow-right"></i></button>` : ''}</article>`;
  } else {
    const pct = weekGoals.length ? Math.round(done * 100 / weekGoals.length) : 0;
    const myLatest = game && game.achievements ? game.achievements.filter(a => a.unlocked).slice(-1)[0] : null;
    summaryCards = `<div class="dashboard-summary-grid">
      <article class="dashboard-summary-card state-info"><i data-lucide="activity"></i><div><strong>${game ? game.ratio : 0}%</strong><span>Mi asistencia</span></div></article>
      <article class="dashboard-summary-card state-warning"><i data-lucide="flame"></i><div><strong>${game ? game.currentStreak : 0}</strong><span>Racha actual</span></div></article>
      <article class="dashboard-summary-card state-good"><i data-lucide="badge-check"></i><div><strong>${getPlayerWeeklyMissions(playerId).filter(m=>m.done).length}/${getPlayerWeeklyMissions(playerId).length}</strong><span>Hábitos completados</span></div></article>
      <article class="dashboard-summary-card state-purple"><i data-lucide="sparkles"></i><div><strong>${game ? game.points : 0}</strong><span>Puntos de compromiso</span></div></article>
    </div>`;
    lowerCards = `${renderPlayerEngagementCard(playerId)}<article class="dashboard-card dashboard-card-wide"><span class="dashboard-eyebrow"><i data-lucide="target"></i> Mis objetivos</span><div class="dashboard-goals-progress"><div><strong>${done}/${weekGoals.length}</strong><span>${pct}% completado</span></div><div class="progress-track"><span style="width:${pct}%"></span></div></div><div class="dashboard-goal-list">${weekGoals.filter(g => !isGoalCompleted(g, playerId)).slice(0,3).map(g => `<span><i data-lucide="circle"></i>${g.title}</span>`).join('') || '<p>No tienes objetivos pendientes. Puedes crear uno nuevo.</p>'}</div><button class="dashboard-link" onclick="openModule('goals')">Abrir mis objetivos <i data-lucide="arrow-right"></i></button></article>
      <article class="dashboard-card"><span class="dashboard-eyebrow"><i data-lucide="award"></i> Mi progreso</span><div class="dashboard-result-block"><strong>${game ? game.level : 'Nivel 1'}</strong><span>${myLatest ? `Último logro: ${myLatest.title}` : 'Sigue sumando para desbloquear logros'}</span></div>${game ? `<div class="progress-track"><span style="width:${game.levelProgress}%"></span></div><p>${game.nextLevel ? `${game.pointsToNext} puntos para ${game.nextLevel}` : 'Nivel máximo alcanzado'}</p>` : ''}</article>`;
  }

  el.innerHTML = `${playerPendingCard}<div class="dashboard-section-heading dashboard-overview-heading"><div><span>${coach ? 'Panel técnico' : 'Mi semana'}</span><h2>${coach ? 'Lo importante, de un vistazo' : 'Tu actividad del equipo'}</h2></div><p>${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</p></div>
    <div class="dashboard-main-grid">${trainingCard}${matchCard}</div>${summaryCards}<div class="dashboard-lower-grid">${lowerCards}</div>`;
  if (window.lucide) lucide.createIcons();
  applyRolePermissions();
  initDashboardMotion();
}

function initDashboardMotion() {
  const root = document.getElementById("view-home-portal");
  if (!root || root.dataset.motionInitialized === "true") return;
  root.dataset.motionInitialized = "true";

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = [
    root.querySelector(".dashboard-hero"),
    ...root.querySelectorAll(".dashboard-section-heading, .dashboard-card, .dashboard-summary-card, .dashboard-quick-access .island-card")
  ].filter(Boolean);

  revealItems.forEach((item, index) => {
    item.classList.remove("dashboard-motion-ready", "dashboard-motion-visible");
    item.style.setProperty("--motion-order", String(index));
    if (reduceMotion) {
      item.classList.add("dashboard-motion-visible");
      return;
    }
    item.classList.add("dashboard-motion-ready");
  });

  if (!reduceMotion) {
    requestAnimationFrame(() => {
      revealItems.forEach(item => item.classList.add("dashboard-motion-visible"));
    });
  }

  root.querySelectorAll(".progress-track > span").forEach(bar => {
    const finalWidth = bar.style.width || getComputedStyle(bar).width;
    bar.style.setProperty("--progress-target", finalWidth);
    if (!reduceMotion) {
      bar.classList.remove("dashboard-progress-animate");
      void bar.offsetWidth;
      bar.classList.add("dashboard-progress-animate");
    }
  });

  root.querySelectorAll(".dashboard-summary-card strong, .dashboard-followup-grid strong").forEach(valueEl => {
    const raw = valueEl.textContent.trim();
    const match = raw.match(/^(-?\d+)(.*)$/);
    if (!match || reduceMotion) return;
    const target = Number(match[1]);
    const suffix = match[2] || "";
    const duration = 520;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      valueEl.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
      else valueEl.textContent = raw;
    };
    requestAnimationFrame(tick);
  });

  root.querySelectorAll("button, .island-card").forEach(control => {
    if (control.dataset.motionBound === "true") return;
    control.dataset.motionBound = "true";
    control.addEventListener("pointerdown", () => {
      if (!reduceMotion) control.classList.add("is-pressing");
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      control.addEventListener(type, () => control.classList.remove("is-pressing"));
    });
  });
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
  const nextTraining = getUpcomingTrainingEvent();
  const nextMatch = getUpcomingMatchEvent();
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
  setMeta("wellness", coach ? (pendingWellness ? `${pendingWellness} respuesta${pendingWellness === 1 ? "" : "s"} pendiente${pendingWellness === 1 ? "" : "s"}` : (wellness.red ? `${wellness.red} alerta${wellness.red === 1 ? "" : "s"} activa${wellness.red === 1 ? "" : "s"}` : "Todo el equipo registrado")) : "Bienestar semanal", wellness.red ? "danger" : pendingWellness ? "warning" : "success");
  setMeta("training", nextTraining ? `Próximo: ${formatEventDate(nextTraining.date)}` : `${totalTrainings} sesiones programadas`, nextTraining ? "info" : "neutral");
  setMeta("tactics", nextMatch ? `Preparar ${nextMatch.title.replace(/^.*?vs\s*/i, "vs ")}` : "Scouting y rotaciones", nextMatch ? "gold" : "neutral");
  setMeta("goals", coach ? `${currentGoals.length} objetivo${currentGoals.length === 1 ? "" : "s"} esta semana` : `${completedGoals} de ${currentGoals.length} completados`, currentGoals.length && completedGoals === currentGoals.length ? "success" : "warning");
  setMeta("stats", completedMatches ? `${completedMatches} partido${completedMatches === 1 ? "" : "s"} registrado${completedMatches === 1 ? "" : "s"}` : "Sin partidos registrados", completedMatches ? "info" : "neutral");
  setMeta("fitness", "Evolución y prevención", "success");
  setMeta("users", `${(appState.users || []).length} accesos configurados`, "neutral");
  setMeta("coach-attendance", nextTraining ? "Preparar próxima asistencia" : "Revisar historial", nextTraining ? "success" : "neutral");
}

function initWeeklyGoals() {
  const form = document.getElementById('form-weekly-goal');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    saveWeeklyGoalFromForm();
  });
}

function openWeeklyGoalModal(goalId = null) {
  const user = getCurrentUser();
  if (!user?.playerId && !isCoachUser()) {
    showToast('Necesitas un perfil de jugadora para crear un objetivo.', 'error');
    return;
  }
  const modal = document.getElementById('modal-weekly-goal');
  const form = document.getElementById('form-weekly-goal');
  if (!modal || !form) return;
  form.reset();
  document.getElementById('weekly-goal-id').value = '';
  document.getElementById('weekly-goal-modal-title').textContent = goalId ? 'Editar objetivo personal' : 'Nuevo objetivo personal';
  if (goalId) {
    const goal = (appState.weeklyGoals || []).find(g => g.id === goalId);
    if (!goal) return;
    const canEdit = isCoachUser() || goal.playerId === user?.playerId;
    if (!canEdit) return;
    document.getElementById('weekly-goal-id').value = goal.id;
    document.getElementById('weekly-goal-title').value = goal.title || '';
    document.getElementById('weekly-goal-description').value = goal.description || '';
  }
  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeWeeklyGoalModal() {
  document.getElementById('modal-weekly-goal')?.classList.remove('active');
}

function saveWeeklyGoalFromForm() {
  const user = getCurrentUser();
  const id = document.getElementById('weekly-goal-id').value;
  const title = document.getElementById('weekly-goal-title').value.trim();
  const description = document.getElementById('weekly-goal-description').value.trim();
  if (!title) return;

  appState.weeklyGoals ||= [];
  const old = id ? appState.weeklyGoals.find(g => g.id === id) : null;
  if (old) {
    if (!isCoachUser() && old.playerId !== user?.playerId) return;
    old.title = title;
    old.description = description;
    old.updatedAt = new Date().toISOString();
    old.isPersistentPersonalGoal = true;
  } else {
    if (!user?.playerId) {
      showToast('Selecciona una jugadora desde su perfil para crearle un objetivo.', 'error');
      return;
    }
    appState.weeklyGoals.push({
      id: `goal_${Date.now()}`,
      title,
      description,
      type: 'personalizado',
      playerId: user.playerId,
      isTeamGoal: false,
      required: false,
      isPersistentPersonalGoal: true,
      createdAt: new Date().toISOString(),
      completions: []
    });
  }
  saveAppData(appState);
  closeWeeklyGoalModal();
  renderWeeklyGoals();
  renderHomeDashboard();
  showToast(id ? 'Objetivo actualizado' : 'Objetivo guardado');
}

function toggleGoalCompletion(goalId) {
  const user = getCurrentUser();
  if (!user?.playerId) return;
  const goal = (appState.weeklyGoals || []).find(g => g.id === goalId);
  if (!goal || goal.playerId !== user.playerId) return;
  goal.completions ||= [];
  let completion = goal.completions.find(c => c.playerId === user.playerId);
  if (!completion) {
    completion = { playerId: user.playerId, completed: true, completedAt: new Date().toISOString() };
    goal.completions.push(completion);
  } else {
    completion.completed = !completion.completed;
    completion.completedAt = completion.completed ? new Date().toISOString() : null;
  }
  syncEngagementLedger();
  saveAppData(appState);
  renderWeeklyGoals();
  renderHomeDashboard();
  showToast(completion.completed ? '¡Objetivo conseguido!' : 'Objetivo reabierto');
}

function deleteWeeklyGoal(goalId) {
  const user = getCurrentUser();
  const goal = (appState.weeklyGoals || []).find(g => g.id === goalId);
  if (!goal || (!isCoachUser() && goal.playerId !== user?.playerId)) return;
  if (!confirm('¿Eliminar este objetivo?')) return;
  appState.weeklyGoals = (appState.weeklyGoals || []).filter(g => g.id !== goalId);
  saveAppData(appState);
  renderWeeklyGoals();
  renderHomeDashboard();
  showToast('Objetivo eliminado');
}

function renderWeeklyGoals() {
  const container = document.getElementById('weekly-goals-container');
  const summary = document.getElementById('weekly-goals-summary');
  const label = document.getElementById('goals-week-label');
  if (!container || !summary) return;
  const user = getCurrentUser();
  const coach = isCoachUser();
  if (label) label.textContent = coach ? 'Objetivos personales de las jugadoras' : 'Define un objetivo y márcalo cuando lo consigas.';

  let goals = (appState.weeklyGoals || []).filter(g => g.isPersistentPersonalGoal || (!g.isTeamGoal && g.playerId));
  if (!coach) goals = goals.filter(g => g.playerId === user?.playerId);
  goals.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const completed = goals.filter(g => (g.completions || []).some(c => c.playerId === g.playerId && c.completed)).length;
  const active = goals.length - completed;
  summary.innerHTML = `<div><strong>${active}</strong><span>objetivo${active === 1 ? '' : 's'} activo${active === 1 ? '' : 's'}</span></div><div><strong>${completed}</strong><span>conseguido${completed === 1 ? '' : 's'}</span></div>`;

  if (!goals.length) {
    container.innerHTML = `<div class="empty-goals"><i data-lucide="target"></i><h3>Aún no hay objetivos</h3><p>${coach ? 'Las jugadoras podrán escribir aquí sus objetivos personales.' : 'Escribe algo que te gustaría conseguir y actualízalo cuando lo logres.'}</p></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = goals.map(goal => {
    const owner = (appState.players || []).find(p => p.id === goal.playerId);
    const done = (goal.completions || []).some(c => c.playerId === goal.playerId && c.completed);
    const canManage = coach || goal.playerId === user?.playerId;
    return `<article class="goal-card ${done ? 'completed' : ''}">
      <div class="goal-card-top">
        <span class="goal-type"><i data-lucide="${done ? 'badge-check' : 'target'}"></i>${done ? 'Objetivo conseguido' : 'Objetivo personal'}</span>
        ${coach && owner ? `<span class="required-pill">${owner.name}</span>` : ''}
      </div>
      <h3>${goal.title}</h3>
      ${goal.description ? `<p>${goal.description}</p>` : ''}
      <div class="goal-meta"><span><i data-lucide="${done ? 'check-circle-2' : 'circle-dot'}"></i>${done ? `Conseguido${(goal.completions || [])[0]?.completedAt ? ` · ${formatPassportDate((goal.completions || [])[0].completedAt)}` : ''}` : 'En progreso'}</span></div>
      ${canManage ? `<div class="goal-actions">
        ${!coach ? `<button class="goal-complete-btn ${done ? 'done' : ''}" onclick="toggleGoalCompletion('${goal.id}')"><i data-lucide="${done ? 'rotate-ccw' : 'check-circle-2'}"></i>${done ? 'Volver a poner en progreso' : 'Lo he conseguido'}</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="openWeeklyGoalModal('${goal.id}')"><i data-lucide="edit-2"></i>Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteWeeklyGoal('${goal.id}')"><i data-lucide="trash-2"></i></button>
      </div>` : ''}
    </article>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}
function goalTypeIcon(){ return 'target'; }
window.renderHomeDashboard=renderHomeDashboard; window.updateDashboardQuickAccess=updateDashboardQuickAccess; window.openWeeklyGoalModal=openWeeklyGoalModal; window.closeWeeklyGoalModal=closeWeeklyGoalModal; window.toggleGoalCompletion=toggleGoalCompletion; window.deleteWeeklyGoal=deleteWeeklyGoal; window.renderWeeklyGoals=renderWeeklyGoals;

/* ========================================================================== 
   SPRINT A · SOPORTE DE VIEWPORT MÓVIL Y LIMPIEZA DE ESTADO DE MODALES
   ========================================================================== */
(function initMobileViewportStability(){
  let resizeFrame = 0;
  const syncSafeViewport = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--safe-vh', `${viewportHeight * 0.01}px`);
    });
  };

  const syncModalBodyState = () => {
    const hasOpenModal = Boolean(document.querySelector('.modal.active, .modal.show, .modal-overlay.active, .modal-overlay.show'));
    document.body.classList.toggle('modal-open', hasOpenModal);
  };

  document.addEventListener('DOMContentLoaded', () => {
    syncSafeViewport();
    syncModalBodyState();

    const observer = new MutationObserver(syncModalBodyState);
    observer.observe(document.body, {
      subtree:true,
      attributes:true,
      attributeFilter:['class','style']
    });
  }, { once:true });

  window.addEventListener('resize', syncSafeViewport, { passive:true });
  window.addEventListener('orientationchange', syncSafeViewport, { passive:true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncSafeViewport, { passive:true });
  }
})();

// ============================================================================
// Sprint B · Guardado seguro, copias y recuperación
// ============================================================================
let volleySaveState = 'saved';
function formatVolleyDateTime(value) {
  if (!value) return 'Todavía no hay ningún guardado registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
function updateSaveStatus(state = 'saved') {
  volleySaveState = state;
  const config = {
    saved: ['check-circle-2', 'Todos los cambios guardados'],
    pending: ['circle-dot-dashed', 'Cambios sin guardar'],
    saving: ['refresh-cw', 'Guardando…'],
    error: ['triangle-alert', 'Error al guardar']
  }[state] || ['check-circle-2', 'Todos los cambios guardados'];
  document.querySelectorAll('[data-save-status]').forEach(el => {
    el.dataset.state = state;
    el.innerHTML = `<i data-lucide="${config[0]}"></i><span>${config[1]}</span>`;
  });
  const last = localStorage.getItem('volleycoach_last_saved_at');
  document.querySelectorAll('[data-last-saved]').forEach(el => el.textContent = formatVolleyDateTime(last));
  if (window.lucide) lucide.createIcons();
}
function markAppChangesPending() { updateSaveStatus('pending'); }
window.updateSaveStatus = updateSaveStatus;
window.markAppChangesPending = markAppChangesPending;

function exportVolleyCoachBackup() {
  try {
    if (window.flushAppDataSave) window.flushAppDataSave();
    const payload = {
      app: 'VolleyCoach Hub',
      exportedAt: new Date().toISOString(),
      version: typeof TEAM_DATA_VERSION !== 'undefined' ? TEAM_DATA_VERSION : appState.version,
      data: appState
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VolleyCoach_copia_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Copia de seguridad exportada correctamente');
  } catch (error) {
    console.error(error); showToast('No se pudo exportar la copia.', 'error');
  }
}
function triggerVolleyCoachImport() { document.getElementById('backup-file-input')?.click(); }
async function importVolleyCoachBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = parsed?.data || parsed;
    if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.players) || !Array.isArray(incoming.events)) {
      throw new Error('Formato no válido');
    }
    const players = incoming.players.length;
    const events = incoming.events.length;
    if (!confirm(`Esta copia contiene ${players} jugadoras y ${events} eventos.\n\nSe sustituirán los datos actuales. ¿Continuar?`)) return;
    const current = localStorage.getItem('volleycoach_data');
    if (current) localStorage.setItem('volleycoach_data_backup_before_import', current);
    localStorage.setItem('volleycoach_data', JSON.stringify(incoming));
    localStorage.setItem('volleycoach_last_saved_at', new Date().toISOString());
    localStorage.removeItem('volleycoach_unsaved_draft');
    localStorage.removeItem('volleycoach_unsaved_draft_meta');
    alert('Copia restaurada correctamente. La aplicación se recargará ahora.');
    location.reload();
  } catch (error) {
    console.error(error); showToast('El archivo no es una copia válida de VolleyCoach Hub.', 'error');
  }
}
window.exportVolleyCoachBackup = exportVolleyCoachBackup;
window.triggerVolleyCoachImport = triggerVolleyCoachImport;
window.importVolleyCoachBackup = importVolleyCoachBackup;

window.addEventListener('beforeunload', event => {
  if (!volleyLogoutInProgress && (volleySaveState === 'pending' || volleySaveState === 'saving')) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('pagehide', () => { if (window.flushAppDataSave) window.flushAppDataSave(); });

document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('volleycoach_last_saved_at');
  if (!last) localStorage.setItem('volleycoach_last_saved_at', new Date().toISOString());
  updateSaveStatus('saved');

  const draft = localStorage.getItem('volleycoach_unsaved_draft');
  const draftMeta = JSON.parse(localStorage.getItem('volleycoach_unsaved_draft_meta') || '{}');
  const savedAtStr = localStorage.getItem('volleycoach_last_saved_at');
  const savedAt = savedAtStr ? Date.parse(savedAtStr) : 0;
  const currentDataStr = localStorage.getItem('volleycoach_data') || '';

  if (draft) {
    const isDifferent = (draft.trim() !== currentDataStr.trim());
    const isNewer = Number(draftMeta.savedAt || 0) > savedAt;

    if (isDifferent && isNewer) {
      setTimeout(() => {
        if (confirm('Se ha encontrado una edición que no llegó a guardarse. ¿Deseas recuperarla?')) {
          try {
            const recovered = JSON.parse(draft);
            localStorage.setItem('volleycoach_data', JSON.stringify(recovered));
            localStorage.setItem('volleycoach_last_saved_at', new Date().toISOString());
            if (typeof window.clearUnsavedDraft === 'function') window.clearUnsavedDraft();
            else {
              localStorage.removeItem('volleycoach_unsaved_draft');
              localStorage.removeItem('volleycoach_unsaved_draft_meta');
              updateSaveStatus('saved');
            }
            location.reload();
          } catch (_) {
            showToast('No se pudo recuperar la edición.', 'error');
            if (typeof window.clearUnsavedDraft === 'function') window.clearUnsavedDraft();
            else {
              localStorage.removeItem('volleycoach_unsaved_draft');
              localStorage.removeItem('volleycoach_unsaved_draft_meta');
              updateSaveStatus('saved');
            }
          }
        } else {
          if (typeof window.clearUnsavedDraft === 'function') window.clearUnsavedDraft();
          else {
            localStorage.removeItem('volleycoach_unsaved_draft');
            localStorage.removeItem('volleycoach_unsaved_draft_meta');
            updateSaveStatus('saved');
          }
        }
      }, 400);
    } else {
      if (typeof window.clearUnsavedDraft === 'function') window.clearUnsavedDraft();
      else {
        localStorage.removeItem('volleycoach_unsaved_draft');
        localStorage.removeItem('volleycoach_unsaved_draft_meta');
        updateSaveStatus('saved');
      }
    }
  }
});


function showCenteredNotice(message) {
  let modal = document.getElementById('centered-notice-modal');
  if (!modal) {
    modal = document.createElement('div'); modal.id='centered-notice-modal'; modal.className='centered-notice-modal';
    modal.innerHTML='<div class="centered-notice-card"><i data-lucide="clock-alert"></i><strong></strong><button type="button">Aceptar</button></div>';
    document.body.appendChild(modal); modal.querySelector('button').addEventListener('click',()=>modal.classList.remove('active'));
  }
  modal.querySelector('strong').textContent=message; modal.classList.add('active'); if(window.lucide)lucide.createIcons();
}
window.showCenteredNotice=showCenteredNotice;

function renderPlayerPendingOverview(playerId, nextTraining, playerConfirm) {
  const pending=[];
  const daily=getPlayerDailyStatus(playerId);
  if (!daily.isContestada) pending.push({icon:'heart-pulse',text:'Completar el bienestar de hoy',target:'wellness'});
  const missedRpe=(appState.events||[]).filter(e=>e.type==='Entrenamiento'&&isRpeSubmissionWindowOpen(e)&&!(appState.trainingRPEs||[]).some(r=>r.playerId===playerId&&r.eventId===e.id));
  if(missedRpe.length) pending.push({icon:'activity',text:'Enviar el RPE del entrenamiento',target:'training'});
  if(nextTraining&&!playerConfirm) pending.push({icon:'calendar-check',text:'Confirmar asistencia al próximo entrenamiento',target:'training'});
  if(!pending.length) return '<article class="player-pending-overview all-done"><i data-lucide="circle-check-big"></i><div><span>Todo al día</span><strong>No tienes nada pendiente por contestar.</strong></div></article>';
  return `<article class="player-pending-overview"><div><span>Te falta por contestar</span><strong>${pending.length===1?'Tienes 1 tarea pendiente':`Tienes ${pending.length} tareas pendientes`}</strong></div><div class="player-pending-actions">${pending.map(x=>`<button onclick="openModule('${x.target}')"><i data-lucide="${x.icon}"></i>${x.text}<i data-lucide="chevron-right"></i></button>`).join('')}</div></article>`;
}

function initPlanningModule(){
  const input=document.getElementById('planning-file-input');
  document.getElementById('btn-planning-upload')?.addEventListener('click',()=>input?.click());
  document.getElementById('btn-planning-remove')?.addEventListener('click',()=>{localStorage.removeItem('volleycoach_planning_file');renderPlanningViewer();});
  input?.addEventListener('change',()=>{
    const file=input.files?.[0]; if(!file)return;
    if(file.size>8*1024*1024){showToast('El archivo no puede superar 8 MB.','error');return;}
    const reader=new FileReader(); reader.onload=()=>{localStorage.setItem('volleycoach_planning_file',JSON.stringify({name:file.name,type:file.type,data:reader.result}));renderPlanningViewer();showToast('Planificación guardada.');}; reader.readAsDataURL(file);
  });
}
function renderPlanningViewer(){
  const viewer=document.getElementById('planning-viewer'), label=document.getElementById('planning-file-name'), remove=document.getElementById('btn-planning-remove'); if(!viewer)return;
  const raw=localStorage.getItem('volleycoach_planning_file');
  if(!raw){if(label)label.textContent='Todavía no hay ningún archivo subido.';if(remove)remove.hidden=true;viewer.innerHTML='<div class="planning-empty"><i data-lucide="calendar-range"></i><h3>Tu planificación aparecerá aquí</h3><p>Puedes subir una imagen, PDF o Excel.</p></div>';if(window.lucide)lucide.createIcons();return;}
  const f=JSON.parse(raw); if(label)label.textContent=f.name;if(remove)remove.hidden=false;
  if(/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)) viewer.innerHTML=`<iframe src="${f.data}" title="Planificación PDF"></iframe>`;
  else if(/image/i.test(f.type)||/\.(png|jpe?g|webp)$/i.test(f.name)) viewer.innerHTML=`<img src="${f.data}" alt="Planificación ${f.name}">`;
  else if(window.XLSX){try{const b64=f.data.split(',')[1];const wb=XLSX.read(b64,{type:'base64'});viewer.innerHTML=`<div class="planning-sheet-tabs">${wb.SheetNames.map((n,i)=>`<button type="button" data-sheet="${i}" class="${i===0?'active':''}">${n}</button>`).join('')}</div><div id="planning-sheet-table" class="planning-sheet-table"></div>`;const draw=i=>{document.getElementById('planning-sheet-table').innerHTML=XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[i]],{id:'planning-excel-table'});viewer.querySelectorAll('[data-sheet]').forEach((b,j)=>b.classList.toggle('active',j===i));};viewer.querySelectorAll('[data-sheet]').forEach((b,i)=>b.addEventListener('click',()=>draw(i)));draw(0);}catch(e){viewer.innerHTML='<div class="planning-empty"><p>No se ha podido leer este Excel.</p></div>';}}
  else viewer.innerHTML='<div class="planning-empty"><p>El visor de Excel necesita conexión la primera vez que se abre.</p></div>';
}
document.addEventListener('DOMContentLoaded',initPlanningModule);
window.renderPlanningViewer=renderPlanningViewer;

/* RC1.1 · sincronización visual del modal de perfil */
document.addEventListener('DOMContentLoaded', () => {
  const profileModal = document.getElementById('modal-my-profile');
  if (!profileModal) return;
  const syncProfileModalState = () => {
    const open = profileModal.classList.contains('active');
    document.body.classList.toggle('profile-modal-open', open);
  };
  profileModal.querySelectorAll('.modal-close,.modal-close-btn').forEach(button => {
    button.addEventListener('click', () => requestAnimationFrame(syncProfileModalState));
  });
  profileModal.addEventListener('click', event => {
    if (event.target === profileModal) requestAnimationFrame(syncProfileModalState);
  });
  new MutationObserver(syncProfileModalState).observe(profileModal, {attributes:true, attributeFilter:['class']});
});


(function ensureLucideIconsStayRendered(){
  const refresh=()=>{ if(window.lucide){ try{ window.lucide.createIcons(); }catch(e){ console.warn('Lucide icons',e); } } };
  window.addEventListener('load', refresh);
  let queued=false;
  const observer=new MutationObserver(()=>{ if(queued) return; queued=true; requestAnimationFrame(()=>{queued=false;refresh();}); });
  observer.observe(document.body,{childList:true,subtree:true});
})();

/* ==========================================================================\n   RC1.7 — ROLES, ASISTENCIA OFICIAL Y SEGUIMIENTO SEMANAL\n   ========================================================================== */
function normalizeRC17Roles() {
  appState.users = Array.isArray(appState.users) ? appState.users : [];
  let changed = false;
  const legacyAdmin = appState.users.find(user => String(user.username).toLowerCase() === 'admin');
  if (legacyAdmin && legacyAdmin.role !== 'administrator') {
    legacyAdmin.role = 'administrator';
    legacyAdmin.name = legacyAdmin.name === 'Entrenador Principal' ? 'Administrador del club' : legacyAdmin.name;
    changed = true;
  }
  if (!appState.users.some(user => user.role === 'coach')) {
    appState.users.splice(legacyAdmin ? appState.users.indexOf(legacyAdmin) + 1 : 0, 0, {
      username: 'entrenador', password: '123456', name: 'Entrenador Principal', role: 'coach', playerId: null, lastLogin: null
    });
    changed = true;
  }
  if (changed) saveAppData(appState);
}
normalizeRC17Roles();

function isAdministratorUser() {
  const user = getCurrentUser();
  return !!user && (user.role === 'administrator' || user.role === 'admin');
}
function isCoachUser() {
  const user = getCurrentUser();
  return !!user && ['administrator', 'admin', 'coach'].includes(user.role);
}
window.isAdministratorUser = isAdministratorUser;
window.isCoachUser = isCoachUser;

const applyRolePermissionsRC17Base = applyRolePermissions;
applyRolePermissions = function applyRolePermissionsRC17() {
  applyRolePermissionsRC17Base();
  const administrator = isAdministratorUser();
  document.querySelectorAll('[data-target="users"], #mini-users, .admin-only-view').forEach(element => {
    element.style.display = administrator ? '' : 'none';
  });
  ['btn-export-backup','btn-import-backup','btn-reset-season','btn-save-club-settings'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = administrator ? '' : 'none';
  });
};

const openModuleRC17Base = openModule;
openModule = function openModuleRC17(moduleName, options = {}) {
  if (moduleName === 'users' && !isAdministratorUser()) {
    showToast('La gestión de usuarios es exclusiva del administrador.', 'error');
    return;
  }
  return openModuleRC17Base(moduleName, options);
};
window.openModule = openModule;

renderUsers = function renderUsersRC17() {
  const tbody = document.getElementById('users-table-body');
  const countBadge = document.getElementById('users-count-badge');
  if (!tbody) return;
  const users = Array.isArray(appState.users) ? appState.users : [];
  const players = Array.isArray(appState.players) ? appState.players : [];
  const ordered = [...users].sort((a,b) => {
    const order = {administrator:0, admin:0, coach:1, player:2};
    return (order[a.role] ?? 9) - (order[b.role] ?? 9) || String(a.name).localeCompare(String(b.name));
  });
  if (countBadge) {
    const admins = ordered.filter(u => ['administrator','admin'].includes(u.role)).length;
    const coaches = ordered.filter(u => u.role === 'coach').length;
    const playerUsers = ordered.filter(u => u.role === 'player').length;
    countBadge.textContent = `${ordered.length} accesos · ${admins} administrador · ${coaches} entrenador · ${playerUsers} jugadoras`;
  }
  tbody.innerHTML = ordered.map(user => {
    const player = players.find(p => p.id === user.playerId);
    const roleInfo = user.role === 'coach'
      ? {label:'Entrenador', bg:'#ffedd5', color:'#c2410c', border:'#fed7aa'}
      : (['administrator','admin'].includes(user.role)
        ? {label:'Administrador', bg:'#fef3c7', color:'#a16207', border:'#fde68a'}
        : {label:'Jugadora', bg:'#e0e7ff', color:'#4338ca', border:'#c7d2fe'});
    const last = user.lastLogin && user.lastLogin !== 'Nunca' ? user.lastLogin : 'Sin accesos registrados';
    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:.9rem 1rem"><strong>${escapeSessionText(user.name || user.username)}</strong>${player ? `<span style="margin-left:.45rem">#${player.number}</span>` : ''}</td>
      <td style="padding:.9rem 1rem">${player ? escapeSessionText(player.position || 'Jugadora') : roleInfo.label}</td>
      <td style="padding:.9rem 1rem"><span style="font-weight:700">@${escapeSessionText(user.username)}</span></td>
      <td style="padding:.9rem 1rem"><code>${escapeSessionText(user.password || '123456')}</code></td>
      <td style="padding:.9rem 1rem"><span class="status-badge" style="background:${roleInfo.bg};color:${roleInfo.color};border:1px solid ${roleInfo.border}">${roleInfo.label}</span></td>
      <td style="padding:.9rem 1rem;font-size:.85rem">${escapeSessionText(last)}</td>
    </tr>`;
  }).join('');
};

calculatePlayerAttendanceAndAchievements = function calculatePlayerAttendanceAndAchievementsRC17(playerId) {
  const now = new Date();
  const trainingEvents = (appState.events || []).filter(event => isTrainingEvent(event) && parseEventStart(event) <= now);
  const eventMap = new Map(trainingEvents.map(event => [event.id, event]));
  const officialByEvent = new Map();
  (appState.attendanceData || []).forEach(record => {
    if (record.playerId !== playerId || !eventMap.has(record.eventId)) return;
    officialByEvent.set(record.eventId, record);
  });
  const records = [...officialByEvent.values()].sort((a,b) => parseEventStart(eventMap.get(a.eventId)) - parseEventStart(eventMap.get(b.eventId)));
  const isPresent = record => ['present','attended'].includes(record.status);
  const isAbsent = record => ['absent','missed'].includes(record.status);
  const totalAttended = records.filter(isPresent).length;
  const totalMissed = records.filter(isAbsent).length;
  const total = totalAttended + totalMissed;
  const ratio = total ? Math.round(totalAttended * 100 / total) : 0;
  let currentStreak = 0, maxStreak = 0, running = 0;
  records.forEach(record => { running = isPresent(record) ? running + 1 : 0; maxStreak = Math.max(maxStreak, running); });
  currentStreak = running;
  const engagement = getPlayerEngagement(playerId);
  const levels = [{name:'Inicio',min:0},{name:'Compromiso',min:50},{name:'Constancia',min:150},{name:'Referente',min:300},{name:'Líder de equipo',min:500}];
  let levelIndex=0; levels.forEach((level,index)=>{ if(engagement.xp>=level.min) levelIndex=index; });
  const level=levels[levelIndex], nextLevel=levels[levelIndex+1] || null;
  return {
    totalAttended,totalMissed,ratio,currentStreak,maxStreak,points:engagement.xp,level:level.name,
    nextLevel:nextLevel?.name || null,pointsToNext:nextLevel ? Math.max(0,nextLevel.min-engagement.xp) : 0,
    levelProgress:nextLevel ? Math.min(100,Math.round((engagement.xp-level.min)*100/(nextLevel.min-level.min))) : 100,
    achievements: engagement.achievements || []
  };
};

function getRC17WeekRange(date = new Date()) {
  const start = new Date(date); const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1-day)); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
  return {start,end,weekKey:getLocalDateKey(start)};
}
function eventInRC17Week(event, range) {
  if (!event?.date) return false;
  const date = new Date(`${event.date}T12:00:00`);
  return date >= range.start && date <= range.end;
}
function getWeeklyCoachTracking() {
  const range = getRC17WeekRange();
  const players = appState.players || [];
  const trainings = (appState.events || []).filter(event => isTrainingEvent(event) && eventInRC17Week(event,range));
  const finished = trainings.filter(event => isTrainingFinished(event));
  const wellnessResponders = new Set((appState.wellnessLogs || []).filter(log => {
    const date = new Date(`${log.dateKey || log.date || getLocalDateKey(new Date(log.createdAt || Date.now()))}T12:00:00`);
    return date >= range.start && date <= range.end;
  }).map(log => log.playerId));
  const confirmationExpected = trainings.length * players.length;
  const confirmationDone = trainings.reduce((sum,event) => sum + new Set((appState.trainingConfirmations || []).filter(c=>c.eventId===event.id).map(c=>c.playerId)).size,0);
  const validationPending = finished.filter(event => !event.attendanceValidatedAt).length;
  const rpeSessions = trainings.map(event => {
    const responders = new Set((appState.trainingRPEs || []).filter(record => record.eventId === event.id && record.playerId).map(record => record.playerId));
    return {event,done:responders.size,total:players.length,pct:players.length?Math.round(responders.size*100/players.length):0};
  });
  return {
    range, players:players.length, trainings, finished,
    wellnessDone:wellnessResponders.size, wellnessPending:Math.max(0,players.length-wellnessResponders.size),
    confirmationDone, confirmationExpected, confirmationPending:Math.max(0,confirmationExpected-confirmationDone),
    validationPending, rpeSessions
  };
}
function renderRC17Progress(label, done, total, icon) {
  const pct = total ? Math.min(100,Math.round(done*100/total)) : 0;
  return `<div class="weekly-tracking-metric"><div class="weekly-tracking-head"><span><i data-lucide="${icon}"></i>${label}</span><strong>${done}/${total}</strong></div><div class="weekly-tracking-bar"><span style="width:${pct}%"></span></div><small>${pct}% completado</small></div>`;
}
function renderWeeklyCoachTrackingCard() {
  const tracking = getWeeklyCoachTracking();
  const dateLabel = `${tracking.range.start.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${tracking.range.end.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`;
  const rpeRows = tracking.rpeSessions.length ? tracking.rpeSessions.map(item => `<div class="weekly-rpe-row"><span>${escapeDashboardText(item.event.title || 'Entrenamiento')}<small>${formatEventDate(item.event.date)}</small></span><strong>${item.pct}%</strong><div class="weekly-rpe-mini"><span style="width:${item.pct}%"></span></div><b>${item.done}/${item.total}</b></div>`).join('') : '<p class="weekly-empty">No hay entrenamientos programados esta semana.</p>';
  return `<article class="dashboard-card dashboard-card-wide weekly-tracking-card"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="calendar-range"></i> Seguimiento semanal</span><span class="weekly-range">${dateLabel}</span></div><div class="weekly-tracking-grid">
    ${renderRC17Progress('Bienestar',tracking.wellnessDone,tracking.players,'heart-pulse')}
    ${renderRC17Progress('Confirmaciones',tracking.confirmationDone,tracking.confirmationExpected,'calendar-check')}
    ${renderRC17Progress('Listas validadas',tracking.finished.length-tracking.validationPending,tracking.finished.length,'badge-check')}
  </div><div class="weekly-rpe-section"><div class="weekly-rpe-title"><span><i data-lucide="activity"></i> Respuesta de Carga/RPE</span><small>Por entrenamiento</small></div>${rpeRows}</div><div class="weekly-pending-summary"><span><b>${tracking.wellnessPending}</b> bienestar pendientes</span><span><b>${tracking.confirmationPending}</b> confirmaciones pendientes</span><span><b>${tracking.validationPending}</b> listas por validar</span></div></article>`;
}

getCoachPendingOverview = function getCoachPendingOverviewRC17() {
  const tracking = getWeeklyCoachTracking();
  const todayKey = getLocalDateKey(new Date());
  const upcoming = (appState.events || []).filter(event => isTrainingEvent(event) && String(event.date || '') >= todayKey);
  const sessionPlanPending = upcoming.filter(event => !String(event.plan || '').trim() && !event.attachmentId && !event.sessionImage).length;
  return {sessionPlanPending, attendanceValidationPending:tracking.validationPending};
};
renderCoachPendingCard = function renderCoachPendingCardRC17() {
  const pending = getCoachPendingOverview();
  const items = [
    {key:'sessionPlanPending',label:'Sesiones por preparar',detail:'próximos entrenamientos sin contenido',icon:'notebook-pen',module:'training',tone:'neutral'},
    {key:'attendanceValidationPending',label:'Listas por confirmar',detail:'entrenamientos finalizados esta semana',icon:'clipboard-check',module:'training',tone:'warning'}
  ].filter(item => pending[item.key] > 0);
  const total = items.reduce((sum,item)=>sum+pending[item.key],0);
  if (!items.length) return `<article class="dashboard-card dashboard-card-wide coach-pending-card is-clear"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="circle-check-big"></i> Pendientes del entrenador</span><span class="coach-pending-total">Todo al día</span></div><div class="coach-pending-empty"><i data-lucide="party-popper"></i><div><strong>Trabajo técnico al día</strong><p>No hay sesiones por preparar ni listas pendientes de validar esta semana.</p></div></div></article>`;
  return `<article class="dashboard-card dashboard-card-wide coach-pending-card"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="list-checks"></i> Pendientes del entrenador</span><span class="coach-pending-total">${total} pendiente${total===1?'':'s'}</span></div><div class="coach-pending-list">${items.map(item=>`<button type="button" class="coach-pending-item tone-${item.tone}" onclick="openPendingDestination('${item.module}')"><span class="coach-pending-icon"><i data-lucide="${item.icon}"></i></span><span class="coach-pending-copy"><strong>${item.label}</strong><small>${item.detail}</small></span><b>${pending[item.key]}</b><i data-lucide="chevron-right" class="coach-pending-arrow"></i></button>`).join('')}</div></article>`;
};

const renderHomeDashboardRC17Base = renderHomeDashboard;
renderHomeDashboard = function renderHomeDashboardRC17() {
  renderHomeDashboardRC17Base();
  if (!isCoachUser()) return;
  const home = document.getElementById('home-dashboard');
  if (!home) return;
  const oldWeekly = [...home.querySelectorAll('.dashboard-card-wide')].find(card => card.textContent.includes('Seguimiento semanal'));
  if (oldWeekly) oldWeekly.outerHTML = renderWeeklyCoachTrackingCard();
  if (window.lucide) lucide.createIcons();
};

const initVerifyAttendanceFormListenerRC17Base = initVerifyAttendanceFormListener;
initVerifyAttendanceFormListener = function initVerifyAttendanceFormListenerRC17() {
  const form = document.getElementById('form-verify-attendance');
  if (!form || form.dataset.rc17Bound === '1') return;
  form.dataset.rc17Bound = '1';
  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const eventId = document.getElementById('verify-attendance-event-id')?.value;
    const training = (appState.events || []).find(item => item.id === eventId);
    if (!training) return showToast('No se ha encontrado la sesión.', 'error');
    appState.attendanceData = (appState.attendanceData || []).filter(record => record.eventId !== eventId);
    let presentCount = 0;
    (appState.players || []).forEach(player => {
      const present = !!document.getElementById(`verify-p-${player.id}`)?.checked;
      if (present) presentCount++;
      appState.attendanceData.push({id:`att-${Date.now()}-${player.id}`,eventId,playerId:player.id,playerName:player.name,date:training.date,status:present?'present':'absent',source:'coach_roll_call',achievementEligible:true,validatedAt:new Date().toISOString()});
      if (present) awardEngagementXP(player.id,'training-attendance',eventId,appState.engagementSettings?.trainingAttendance||20,'Asistencia validada por el entrenador',training.date);
      else removeEngagementXP(player.id,'training-attendance',eventId);
    });
    training.attendanceValidatedAt = new Date().toISOString();
    syncEngagementLedger(); saveAppData(appState); invalidateViewRenderCache(); homeDashboardCache={revision:-1,role:'',dayKey:''};
    document.getElementById('modal-verify-attendance')?.classList.remove('active');
    renderTraining(); renderHomePortalRSVP(); renderHomeDashboard();
    showToast(`Lista confirmada: ${presentCount} asistencias computadas.`);
  }, true);
};

function updateCoachProfileMetricsRC17() {
  const user = getCurrentUser();
  if (!user || !isCoachUser()) return;
  const container = document.getElementById('profile-attendance-stats');
  const achievements = document.getElementById('profile-achievements-list');
  const now = new Date();
  const completedTrainings = (appState.events || []).filter(event => isTrainingEvent(event) && isTrainingFinished(event)).length;
  const statsUploaded = (appState.events || []).filter(event => isMatchEvent(event) && getStatsPublicationStatus(event) !== 'empty').length;
  const tests = getJumpTestRecords().length;
  if (container) container.innerHTML = `
    <div class="attendance-box"><div class="attendance-box-val" style="color:#f97316">${completedTrainings}</div><div class="attendance-box-lbl">Entrenos completados</div></div>
    <div class="attendance-box"><div class="attendance-box-val" style="color:#3b82f6">${statsUploaded}</div><div class="attendance-box-lbl">Estadísticas subidas</div></div>
    <div class="attendance-box"><div class="attendance-box-val" style="color:#8b5cf6">${tests}</div><div class="attendance-box-lbl">Tests realizados</div></div>`;
  if (achievements) achievements.innerHTML = '<div class="coach-profile-note"><i data-lucide="shield-check"></i><div><strong>Perfil técnico</strong><p>El perfil del cuerpo técnico muestra actividad de gestión, sin puntos ni logros personales.</p></div></div>';
  if (window.lucide) lucide.createIcons();
}
document.addEventListener('click', event => {
  if (event.target.closest('#btn-profile-header, #btn-profile-home, [data-open-profile]')) setTimeout(updateCoachProfileMetricsRC17,0);
});

function optimizeDesktopNavigationRC17() {
  const nav = document.querySelector('.desktop-nav, .top-nav-menu, #desktop-nav');
  if (nav) nav.classList.add('rc17-fast-nav');
}
document.addEventListener('DOMContentLoaded', () => {
  normalizeRC17Roles();
  applyRolePermissions();
  optimizeDesktopNavigationRC17();
});


/* ==========================================================================
   RC1.8 — LECTURA DEL PLAN, RECORTE TÁCTIL Y SUEÑO
   ========================================================================== */
function getPlanPublicationVersion(record) {
  return record?.publicationVersion || record?.publishedAt || null;
}
function markCurrentPlayerPlanRead(record) {
  const user = getCurrentUser();
  if (!user?.playerId || !activeScoutingMatchId || !record || record.status !== 'published') return;
  const version = getPlanPublicationVersion(record);
  if (!version) return;
  record.readReceipts = record.readReceipts && typeof record.readReceipts === 'object' ? record.readReceipts : {};
  const current = record.readReceipts[user.playerId];
  if (current?.version === version) return;
  record.readReceipts[user.playerId] = { version, viewedAt: new Date().toISOString() };
  appState.matchScouting[activeScoutingMatchId] = record;
  saveAppData(appState);
}
function renderPlanReadTracker(record) {
  const version = getPlanPublicationVersion(record);
  const receipts = record?.readReceipts || {};
  const players = Array.isArray(appState.players) ? appState.players : [];
  const seen = players.filter(player => receipts[player.id]?.version === version);
  const formatReadTime = iso => {
    if (!iso) return 'Sin abrir';
    const date = new Date(iso);
    return date.toLocaleString('es-ES', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
  };
  return `<section class="plan-read-tracker"><div class="plan-read-tracker-head"><strong>Lectura del plan de juego</strong><span class="plan-read-progress">${seen.length}/${players.length} jugadoras</span></div><div class="plan-read-list">${players.map(player => {
    const receipt = receipts[player.id];
    const hasSeen = receipt?.version === version;
    return `<div class="plan-read-item ${hasSeen?'seen':'pending'}"><i data-lucide="${hasSeen?'circle-check':'clock-3'}"></i><span><b>${escapeSessionText(player.name)}</b><small>${hasSeen?formatReadTime(receipt.viewedAt):'Todavía no lo ha abierto'}</small></span></div>`;
  }).join('')}</div></section>`;
}
window.renderPlanReadTracker = renderPlanReadTracker;

function setWellnessSleepChoice(value) {
  const normalized = Math.max(1, Math.min(5, Number(value) || 3));
  const hidden = document.getElementById('wellness-sleep-quality');
  if (hidden) hidden.value = String(normalized);
  document.querySelectorAll('[data-sleep]').forEach(button => button.classList.toggle('selected', Number(button.dataset.sleep) === normalized));
}
document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-sleep]');
  if (!button) return;
  setWellnessSleepChoice(button.dataset.sleep);
});
window.setWellnessSleepChoice = setWellnessSleepChoice;

let avatarCropTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
let avatarCropPointers = new Map();
let avatarCropLastPinchDistance = 0;
let avatarCropLastCenter = null;

function clampAvatarCropTransform() {
  if (!avatarCropImage) return;
  avatarCropTransform.zoom = Math.max(1, Math.min(4, avatarCropTransform.zoom));
  const size = 500;
  const baseScale = Math.max(size / avatarCropImage.naturalWidth, size / avatarCropImage.naturalHeight);
  const drawWidth = avatarCropImage.naturalWidth * baseScale * avatarCropTransform.zoom;
  const drawHeight = avatarCropImage.naturalHeight * baseScale * avatarCropTransform.zoom;
  const maxX = Math.max(0, (drawWidth - size) / 2);
  const maxY = Math.max(0, (drawHeight - size) / 2);
  avatarCropTransform.offsetX = Math.max(-maxX, Math.min(maxX, avatarCropTransform.offsetX));
  avatarCropTransform.offsetY = Math.max(-maxY, Math.min(maxY, avatarCropTransform.offsetY));
}
function getAvatarCropSettings() {
  return { zoom: avatarCropTransform.zoom, x: avatarCropTransform.offsetX, y: avatarCropTransform.offsetY, directOffsets: true };
}
function drawAvatarCrop(canvas, outputSize = 500) {
  if (!canvas || !avatarCropImage) return;
  clampAvatarCropTransform();
  const ctx = canvas.getContext('2d');
  canvas.width = outputSize; canvas.height = outputSize;
  const baseScale = Math.max(outputSize / avatarCropImage.naturalWidth, outputSize / avatarCropImage.naturalHeight);
  const scale = baseScale * avatarCropTransform.zoom;
  const drawWidth = avatarCropImage.naturalWidth * scale;
  const drawHeight = avatarCropImage.naturalHeight * scale;
  const ratio = outputSize / 500;
  const drawX = (outputSize - drawWidth) / 2 + avatarCropTransform.offsetX * ratio;
  const drawY = (outputSize - drawHeight) / 2 + avatarCropTransform.offsetY * ratio;
  ctx.clearRect(0,0,outputSize,outputSize);
  ctx.drawImage(avatarCropImage, drawX, drawY, drawWidth, drawHeight);
}
function renderAvatarCropPreview(){ drawAvatarCrop(document.getElementById('avatar-crop-canvas'),500); }
const openAvatarCropEditorRC18Base = openAvatarCropEditor;
openAvatarCropEditor = function(file) {
  avatarCropTransform = {zoom:1, offsetX:0, offsetY:0};
  avatarCropPointers.clear(); avatarCropLastPinchDistance=0; avatarCropLastCenter=null;
  return openAvatarCropEditorRC18Base(file);
};
function adjustAvatarZoom(delta, center={x:250,y:250}) {
  const previous = avatarCropTransform.zoom;
  avatarCropTransform.zoom = Math.max(1, Math.min(4, previous + delta));
  if (previous !== avatarCropTransform.zoom) {
    const factor = avatarCropTransform.zoom / previous;
    avatarCropTransform.offsetX = (avatarCropTransform.offsetX - (center.x-250)) * factor + (center.x-250);
    avatarCropTransform.offsetY = (avatarCropTransform.offsetY - (center.y-250)) * factor + (center.y-250);
  }
  clampAvatarCropTransform(); renderAvatarCropPreview();
}
function initAvatarGestureCrop() {
  const stage = document.getElementById('avatar-crop-stage');
  if (!stage || stage.dataset.gesturesReady) return;
  stage.dataset.gesturesReady='1';
  const pointFromEvent = event => { const r=stage.getBoundingClientRect(); return {x:(event.clientX-r.left)*500/r.width,y:(event.clientY-r.top)*500/r.height}; };
  stage.addEventListener('pointerdown', event => { stage.setPointerCapture(event.pointerId); avatarCropPointers.set(event.pointerId, pointFromEvent(event)); stage.classList.add('is-dragging'); });
  stage.addEventListener('pointermove', event => {
    if (!avatarCropPointers.has(event.pointerId)) return;
    const current=pointFromEvent(event), previous=avatarCropPointers.get(event.pointerId); avatarCropPointers.set(event.pointerId,current);
    const points=[...avatarCropPointers.values()];
    if(points.length===1){ avatarCropTransform.offsetX += current.x-previous.x; avatarCropTransform.offsetY += current.y-previous.y; }
    else if(points.length>=2){ const [a,b]=points; const distance=Math.hypot(a.x-b.x,a.y-b.y); const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; if(avatarCropLastPinchDistance){ adjustAvatarZoom((distance-avatarCropLastPinchDistance)/180,center); } if(avatarCropLastCenter){ avatarCropTransform.offsetX += center.x-avatarCropLastCenter.x; avatarCropTransform.offsetY += center.y-avatarCropLastCenter.y; } avatarCropLastPinchDistance=distance; avatarCropLastCenter=center; }
    clampAvatarCropTransform(); renderAvatarCropPreview(); event.preventDefault();
  },{passive:false});
  const end=event=>{avatarCropPointers.delete(event.pointerId);if(avatarCropPointers.size<2){avatarCropLastPinchDistance=0;avatarCropLastCenter=null;}if(!avatarCropPointers.size)stage.classList.remove('is-dragging');};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  stage.addEventListener('wheel',event=>{const p=pointFromEvent(event);adjustAvatarZoom(event.deltaY<0?.15:-.15,p);event.preventDefault();},{passive:false});
  document.getElementById('avatar-zoom-in')?.addEventListener('click',()=>adjustAvatarZoom(.2));
  document.getElementById('avatar-zoom-out')?.addEventListener('click',()=>adjustAvatarZoom(-.2));
}
document.addEventListener('DOMContentLoaded', initAvatarGestureCrop);
window.openAvatarCropEditor=openAvatarCropEditor;
window.getAvatarCropSettings=getAvatarCropSettings;
window.drawAvatarCrop=drawAvatarCrop;
window.renderAvatarCropPreview=renderAvatarCropPreview;

// La gestión de usuarios queda exclusivamente en el portal del administrador.
document.addEventListener('DOMContentLoaded', () => {
  const refreshRoleTiles = () => document.querySelectorAll('[data-target="users"], #mini-users').forEach(el => el.style.display = isAdministratorUser() ? '' : 'none');
  refreshRoleTiles();
  window.addEventListener('storage', refreshRoleTiles);
});


/* ==========================================================================
   RC1.8.1 — NAVEGACIÓN WEB INMEDIATA Y RECORTE MÓVIL SEGURO
   ========================================================================== */
function initFastDesktopNavRC181() {
  const nav = document.getElementById('desktop-quick-nav');
  if (!nav || nav.dataset.fastBound === '1') return;
  nav.dataset.fastBound = '1';

  nav.addEventListener('pointerdown', event => {
    const button = event.target.closest('.desktop-nav-item');
    if (!button) return;
    nav.querySelectorAll('.desktop-nav-item').forEach(item => item.classList.remove('is-pressing'));
    button.classList.add('is-pressing');
  }, {passive:true});

  nav.addEventListener('click', event => {
    const button = event.target.closest('.desktop-nav-item');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const target = button.dataset.target;
    nav.querySelectorAll('.desktop-nav-item').forEach(item => {
      item.classList.toggle('active', item === button);
      item.classList.remove('is-pressing');
    });
    if (!target) return;
    openModule(target === 'home' ? 'home-portal' : target);
  }, true);
}

document.addEventListener('DOMContentLoaded', initFastDesktopNavRC181);

/* ========================================================================== 
   RC1.8.2 — ASISTENCIA OFICIAL INMEDIATA Y MODAL MÓVIL SEGURO
   ========================================================================== */
calculatePlayerAttendanceAndAchievements = function calculatePlayerAttendanceAndAchievementsRC182(playerId) {
  const trainingIds = new Set((appState.events || []).filter(event => isTrainingEvent(event)).map(event => event.id));
  const officialByEvent = new Map();
  (appState.attendanceData || []).forEach(record => {
    if (record.playerId !== playerId || !trainingIds.has(record.eventId)) return;
    officialByEvent.set(record.eventId, record);
  });
  const records = [...officialByEvent.values()].sort((a,b) => {
    const eventA=(appState.events||[]).find(event=>event.id===a.eventId);
    const eventB=(appState.events||[]).find(event=>event.id===b.eventId);
    return parseEventStart(eventA)-parseEventStart(eventB);
  });
  const isPresent = record => ['present','attended'].includes(record.status);
  const isAbsent = record => ['absent','missed'].includes(record.status);
  const totalAttended = records.filter(isPresent).length;
  const totalMissed = records.filter(isAbsent).length;
  const total = totalAttended + totalMissed;
  const ratio = total ? Math.round(totalAttended * 100 / total) : 0;
  let running=0,maxStreak=0;
  records.forEach(record=>{ running=isPresent(record)?running+1:0; maxStreak=Math.max(maxStreak,running); });
  const engagement=getPlayerEngagement(playerId);
  const levels=[{name:'Inicio',min:0},{name:'Compromiso',min:50},{name:'Constancia',min:150},{name:'Referente',min:300},{name:'Líder de equipo',min:500}];
  let levelIndex=0; levels.forEach((level,index)=>{ if(engagement.xp>=level.min) levelIndex=index; });
  const level=levels[levelIndex],nextLevel=levels[levelIndex+1]||null;
  return {
    totalAttended,totalMissed,ratio,currentStreak:running,maxStreak,points:engagement.xp,level:level.name,
    nextLevel:nextLevel?.name||null,pointsToNext:nextLevel?Math.max(0,nextLevel.min-engagement.xp):0,
    levelProgress:nextLevel?Math.min(100,Math.round((engagement.xp-level.min)*100/(nextLevel.min-level.min))):100,
    achievements:engagement.achievements||[]
  };
};
window.calculatePlayerAttendanceAndAchievements=calculatePlayerAttendanceAndAchievements;

const openVerifyAttendanceModalRC182Base=openVerifyAttendanceModal;
openVerifyAttendanceModal=function openVerifyAttendanceModalRC182(eventId){
  openVerifyAttendanceModalRC182Base(eventId);
  document.body.classList.add('attendance-modal-open');
};
window.openVerifyAttendanceModal=openVerifyAttendanceModal;

document.addEventListener('click',event=>{
  if(event.target.closest('#modal-verify-attendance .modal-close-btn')){
    document.body.classList.remove('attendance-modal-open');
  }
});

const initVerifyAttendanceFormListenerRC182Base=initVerifyAttendanceFormListener;
initVerifyAttendanceFormListener=function initVerifyAttendanceFormListenerRC182(){
  initVerifyAttendanceFormListenerRC182Base();
  const form=document.getElementById('form-verify-attendance');
  if(!form||form.dataset.rc182Bound==='1') return;
  form.dataset.rc182Bound='1';
  form.addEventListener('submit',()=>{
    document.body.classList.remove('attendance-modal-open');
    setTimeout(()=>{
      homeDashboardCache={revision:-1,role:'',dayKey:''};
      invalidateViewRenderCache();
      renderHomeDashboard();
    },0);
  });
};

/* ========================================================================== 
   RC1.8.3 — USUARIOS SOLO ADMIN, CONTROL DE ENTRENOS Y MISIÓN DE ASISTENCIA
   ========================================================================== */

function refreshAdministratorOnlyAccessRC183() {
  const showUsers = isAdministratorUser();
  document.querySelectorAll('[data-target="users"], #mini-users, #island-card-users').forEach(element => {
    element.style.display = showUsers ? '' : 'none';
    element.setAttribute('aria-hidden', showUsers ? 'false' : 'true');
  });
}

const applyRolePermissionsRC183Base = applyRolePermissions;
applyRolePermissions = function applyRolePermissionsRC183() {
  applyRolePermissionsRC183Base();
  refreshAdministratorOnlyAccessRC183();
};

function isAttendanceOfficiallyValidated(event) {
  if (!event) return false;
  if (event.attendanceValidatedAt) return true;
  return (appState.attendanceData || []).some(record =>
    record.eventId === event.id &&
    (record.validatedAt || record.source === 'coach_roll_call')
  );
}

getPlayerWeeklyMissions = function getPlayerWeeklyMissionsRC183(playerId) {
  const weekKey = getWeekKeyFromDate();
  const cfg = appState.engagementSettings || ENGAGEMENT_DEFAULTS;
  const wellness = (appState.wellnessLogs || []).some(log =>
    log.playerId === playerId &&
    (log.weekKey === weekKey || getWeekKeyFromDate(log.dateKey || log.date || log.createdAt) === weekKey)
  );
  const weekEvents = (appState.events || []).filter(event =>
    isTrainingEvent(event) && getWeekKeyFromDate(event.date) === weekKey
  );
  const completedEvents = weekEvents.filter(event => isTrainingFinished(event));
  const validatedEvents = weekEvents.filter(isAttendanceOfficiallyValidated);
  const confirmed = weekEvents.filter(event =>
    (appState.trainingConfirmations || []).some(record =>
      record.playerId === playerId && record.eventId === event.id && record.status === 'yes'
    )
  ).length;
  const attended = validatedEvents.filter(event =>
    (appState.attendanceData || []).some(record =>
      record.playerId === playerId &&
      record.eventId === event.id &&
      ['present', 'attended'].includes(record.status)
    )
  ).length;
  const rpe = completedEvents.filter(event =>
    (appState.trainingRPEs || []).some(record => record.playerId === playerId && record.eventId === event.id)
  ).length;

  return [
    {
      id: 'confirm', icon: 'calendar-check', title: 'Confirmar “Asistiré”',
      done: weekEvents.length > 0 && confirmed === weekEvents.length,
      progress: confirmed, target: weekEvents.length || 1,
      xp: cfg.attendanceConfirm * Math.max(1, weekEvents.length),
      detail: 'Confirma tu disponibilidad para cada entrenamiento'
    },
    {
      id: 'attendance', icon: 'badge-check', title: 'Asistencia confirmada',
      done: validatedEvents.length > 0 && attended === validatedEvents.length,
      progress: attended, target: validatedEvents.length || 1,
      xp: cfg.trainingAttendance * Math.max(1, validatedEvents.length),
      detail: validatedEvents.length
        ? 'Se completa en cuanto el entrenador valida la lista'
        : 'Pendiente de que el entrenador valide una lista esta semana'
    },
    {
      id: 'wellness', icon: 'heart-pulse', title: 'Completar Bienestar',
      done: wellness, progress: wellness ? 1 : 0, target: 1,
      xp: cfg.wellness,
      detail: 'Responder el cuestionario de esta semana'
    },
    {
      id: 'rpe-week', icon: 'gauge', title: 'Completar la Carga semanal',
      done: completedEvents.length > 0 && rpe === completedEvents.length,
      progress: rpe, target: completedEvents.length || 1,
      xp: cfg.rpe * Math.max(1, completedEvents.length),
      detail: 'Registrar la percepción del esfuerzo de todos los entrenamientos finalizados'
    }
  ];
};
window.getPlayerWeeklyMissions = getPlayerWeeklyMissions;

renderCoachAttendanceList = function renderCoachAttendanceListRC183() {
  const container = document.getElementById('coach-attendance-list');
  if (!container) return;

  const range = getRC17WeekRange();
  const trainings = (appState.events || [])
    .filter(event => isTrainingEvent(event) && eventInRC17Week(event, range))
    .sort((a, b) => parseEventStart(a) - parseEventStart(b));

  if (!trainings.length) {
    container.innerHTML = `
      <div class="training-empty coach-control-empty">
        <i data-lucide="calendar-range"></i>
        <h3>Sin entrenamientos esta semana</h3>
        <p>Cuando programes una sesión aparecerá aquí con su preparación, lista oficial y respuestas de Carga.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="openModule('training')">
          <i data-lucide="plus"></i> Ir a Entrenamientos
        </button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const upcoming = trainings.filter(event => !isTrainingFinished(event));
  const completed = trainings.filter(event => isTrainingFinished(event));

  const renderTrainingControlCard = (event, finished) => {
    const attendanceRecords = (appState.attendanceData || []).filter(record => record.eventId === event.id);
    const presentCount = attendanceRecords.filter(record => ['present','attended'].includes(record.status)).length;
    const validated = isAttendanceOfficiallyValidated(event);
    const rpeRecords = (appState.trainingRPEs || []).filter(record => record.eventId === event.id && record.playerId);
    const rpePct = appState.players?.length ? Math.round(rpeRecords.length * 100 / appState.players.length) : 0;
    const planned = Boolean(event.plan || event.description || event.attachmentId || event.sessionImage);
    return `
      <button type="button" class="attendance-card coach-training-control-card" onclick="${finished ? `openCoachAttendanceDetail('${event.id}')` : `openSeasonEvent('${event.id}')`}">
        <div class="att-card-left">
          <span class="coach-control-date">${formatEventDate(event.date)} · ${event.time || 'Hora pendiente'}</span>
          <strong>${escapeSessionText(event.title || 'Entrenamiento')}</strong>
          <small>${event.location ? escapeSessionText(event.location) : 'Ubicación pendiente'}</small>
        </div>
        <div class="coach-control-statuses">
          <span class="${planned ? 'is-complete' : 'is-pending'}"><i data-lucide="notebook-pen"></i>${planned ? 'Preparado' : 'Sin preparar'}</span>
          <span class="${validated ? 'is-complete' : 'is-pending'}"><i data-lucide="clipboard-check"></i>${validated ? `${presentCount} asistencias validadas` : 'Lista pendiente'}</span>
          ${finished ? `<span class="${rpePct === 100 ? 'is-complete' : 'is-neutral'}"><i data-lucide="gauge"></i>${rpePct}% Carga respondida</span>` : '<span class="is-neutral"><i data-lucide="clock-3"></i>Próximo</span>'}
        </div>
        <i data-lucide="chevron-right" class="coach-control-arrow"></i>
      </button>`;
  };

  container.innerHTML = `
    ${upcoming.length ? `<section class="coach-control-section"><div class="coach-control-section-title"><span>Próximos entrenamientos</span><b>${upcoming.length}</b></div>${upcoming.map(event => renderTrainingControlCard(event, false)).join('')}</section>` : ''}
    ${completed.length ? `<section class="coach-control-section"><div class="coach-control-section-title"><span>Entrenamientos completados</span><b>${completed.length}</b></div>${completed.map(event => renderTrainingControlCard(event, true)).join('')}</section>` : ''}
    ${!upcoming.length && !completed.length ? '<p class="coach-control-note">No hay sesiones disponibles en la semana actual.</p>' : ''}`;
  if (window.lucide) lucide.createIcons();
};
window.renderCoachAttendanceList = renderCoachAttendanceList;

function refreshAttendanceValidationUIRC183() {
  syncEngagementLedger();
  invalidateViewRenderCache();
  homeDashboardCache = { revision: -1, role: '', dayKey: '' };
  try { renderHomePortalRSVP(); } catch (_) {}
  try { renderHomeDashboard(); } catch (_) {}
  try { renderCoachAttendanceList(); } catch (_) {}
}

const initVerifyAttendanceFormListenerRC183Base = initVerifyAttendanceFormListener;
initVerifyAttendanceFormListener = function initVerifyAttendanceFormListenerRC183() {
  initVerifyAttendanceFormListenerRC183Base();
  const form = document.getElementById('form-verify-attendance');
  if (!form || form.dataset.rc183Bound === '1') return;
  form.dataset.rc183Bound = '1';
  form.addEventListener('submit', () => {
    setTimeout(refreshAttendanceValidationUIRC183, 0);
  });
};

function initRC183() {
  refreshAdministratorOnlyAccessRC183();
  applyRolePermissions();
}
document.addEventListener('DOMContentLoaded', initRC183);
document.addEventListener('click', event => {
  if (event.target.closest('#btn-profile-header, #btn-profile-home, [data-open-profile]')) return;
  requestAnimationFrame(refreshAdministratorOnlyAccessRC183);
});

/* ========================================================================== 
   RC1.9 — PANEL DE ADMINISTRACIÓN DEL CLUB
   ========================================================================== */
function ensureRC19AdminData() {
  if (!appState.adminConfig) {
    appState.adminConfig = {
      modules: { wellness:true, load:true, gamification:true, planning:true, tests:true, stats:true, tactics:true },
      language: 'es'
    };
  }
  if (!Array.isArray(appState.teams) || !appState.teams.length) {
    appState.teams = [{
      id:'team-main',
      name: appState.teamInfo?.category || 'Cadete Femenino',
      coachUsername:'entrenador',
      playerIds:(appState.players || []).map(p=>p.id),
      active:true
    }];
  }
  if (!Array.isArray(appState.seasons) || !appState.seasons.length) {
    appState.seasons = [{
      id:'season-current',
      name:appState.teamInfo?.season || '2026 - 2027',
      active:true,
      createdAt:new Date().toISOString()
    }];
  }
}

function rc19Escape(value='') { return escapeSessionText(String(value)); }
function rc19RoleLabel(role) {
  return ({administrator:'Administrador',admin:'Administrador',coach:'Entrenador',player:'Jugadora'})[role] || role;
}
function rc19GetAdminMetrics() {
  ensureRC19AdminData();
  const users = appState.users || [];
  return {
    teams:(appState.teams || []).filter(t=>t.active !== false).length,
    players:(appState.players || []).length,
    coaches:users.filter(u=>u.role === 'coach').length,
    admins:users.filter(u=>['administrator','admin'].includes(u.role)).length,
    season:(appState.seasons || []).find(s=>s.active)?.name || appState.teamInfo?.season || '—'
  };
}

function renderAdminDashboardRC19() {
  if (!isAdministratorUser()) return '';
  const m = rc19GetAdminMetrics();
  return `<section class="admin-overview-panel">
    <div class="admin-overview-head"><div><span>Administración</span><h2>Estado del club</h2></div><button type="button" class="btn btn-primary btn-sm" onclick="openModule('users')"><i data-lucide="settings-2"></i>Abrir panel</button></div>
    <div class="admin-overview-grid">
      <article><i data-lucide="shield-check"></i><strong>${m.admins}</strong><span>Administradores</span></article>
      <article><i data-lucide="clipboard-user"></i><strong>${m.coaches}</strong><span>Entrenadores</span></article>
      <article><i data-lucide="users-round"></i><strong>${m.players}</strong><span>Jugadoras</span></article>
      <article><i data-lucide="volleyball"></i><strong>${m.teams}</strong><span>Equipos activos</span></article>
      <article class="admin-season-metric"><i data-lucide="calendar-range"></i><strong>${rc19Escape(m.season)}</strong><span>Temporada activa</span></article>
    </div>
  </section>`;
}

const renderHomeDashboardRC19Base = renderHomeDashboard;
renderHomeDashboard = function renderHomeDashboardRC19() {
  renderHomeDashboardRC19Base();
  const root = document.getElementById('home-dashboard');
  if (!root || !isAdministratorUser()) return;
  root.querySelector('.admin-overview-panel')?.remove();
  root.insertAdjacentHTML('afterbegin', renderAdminDashboardRC19());
  if (window.lucide) requestAnimationFrame(()=>{ try { lucide.createIcons(); } catch(_){} });
};
window.renderHomeDashboard = renderHomeDashboard;

function renderAdminPortalRC19(activeTab='overview') {
  if (!isAdministratorUser()) return;
  ensureRC19AdminData();
  const view = document.getElementById('view-users');
  if (!view) return;
  const users = appState.users || [];
  const teams = appState.teams || [];
  const seasons = appState.seasons || [];
  const metrics = rc19GetAdminMetrics();
  const tabs = [
    ['overview','Resumen','layout-dashboard'],['users','Usuarios','users'],['teams','Equipos','volleyball'],['seasons','Temporadas','calendar-range'],['config','Configuración','settings']
  ];
  view.innerHTML = `<section class="admin-portal">
    <header class="admin-portal-header"><div><span class="dashboard-eyebrow"><i data-lucide="shield-check"></i> Solo administrador</span><h1>Administración del club</h1><p>Gestiona accesos, equipos, temporadas y módulos desde un único lugar.</p></div><span class="admin-active-season">${rc19Escape(metrics.season)}</span></header>
    <nav class="admin-tabs">${tabs.map(([id,label,icon])=>`<button type="button" class="${activeTab===id?'active':''}" onclick="renderAdminPortalRC19('${id}')"><i data-lucide="${icon}"></i>${label}</button>`).join('')}</nav>
    <div class="admin-tab-content">${renderAdminTabRC19(activeTab, {users,teams,seasons,metrics})}</div>
  </section>`;
  if (window.lucide) requestAnimationFrame(()=>{ try { lucide.createIcons(); } catch(_){} });
}
window.renderAdminPortalRC19 = renderAdminPortalRC19;

function renderAdminTabRC19(tab, ctx) {
  if (tab === 'overview') return `<div class="admin-summary-grid">
    <article class="admin-summary-card"><i data-lucide="users-round"></i><div><strong>${ctx.metrics.players}</strong><span>Jugadoras registradas</span></div></article>
    <article class="admin-summary-card"><i data-lucide="clipboard-user"></i><div><strong>${ctx.metrics.coaches}</strong><span>Entrenadores activos</span></div></article>
    <article class="admin-summary-card"><i data-lucide="volleyball"></i><div><strong>${ctx.metrics.teams}</strong><span>Equipos activos</span></div></article>
    <article class="admin-summary-card"><i data-lucide="calendar-check"></i><div><strong>${rc19Escape(ctx.metrics.season)}</strong><span>Temporada activa</span></div></article>
    <article class="admin-action-card admin-span-2"><div><h3>Acciones rápidas</h3><p>Las funciones críticas quedan separadas de la gestión deportiva.</p></div><div class="admin-action-buttons"><button class="btn btn-outline" onclick="renderAdminPortalRC19('users')"><i data-lucide="user-cog"></i>Gestionar usuarios</button><button class="btn btn-outline" onclick="renderAdminPortalRC19('teams')"><i data-lucide="users-round"></i>Gestionar equipos</button><button class="btn btn-outline" onclick="renderAdminPortalRC19('seasons')"><i data-lucide="calendar-range"></i>Temporadas</button><button class="btn btn-primary" onclick="renderAdminPortalRC19('config')"><i data-lucide="settings"></i>Configuración</button></div></article>
  </div>`;

  if (tab === 'users') return `<section class="admin-section"><div class="admin-section-head"><div><h2>Usuarios y roles</h2><p>Crea accesos, restablece contraseñas y activa o desactiva cuentas.</p></div><button class="btn btn-primary" onclick="adminCreateUserRC19()"><i data-lucide="user-plus"></i>Nuevo usuario</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${ctx.users.map(u=>`<tr><td><strong>${rc19Escape(u.name)}</strong>${u.playerId?`<small>${rc19Escape((appState.players||[]).find(p=>p.id===u.playerId)?.name||'')}</small>`:''}</td><td>@${rc19Escape(u.username)}</td><td><span class="admin-role role-${u.role}">${rc19RoleLabel(u.role)}</span></td><td><span class="admin-user-status ${u.disabled?'disabled':'active'}">${u.disabled?'Desactivado':'Activo'}</span></td><td><div class="admin-row-actions"><button title="Restablecer contraseña" onclick="adminResetPasswordRC19('${rc19Escape(u.username)}')"><i data-lucide="key-round"></i></button><button title="${u.disabled?'Activar':'Desactivar'}" onclick="adminToggleUserRC19('${rc19Escape(u.username)}')"><i data-lucide="${u.disabled?'user-check':'user-x'}"></i></button>${u.username!=='admin'?`<button class="danger" title="Eliminar" onclick="adminDeleteUserRC19('${rc19Escape(u.username)}')"><i data-lucide="trash-2"></i></button>`:''}</div></td></tr>`).join('')}</tbody></table></div></section>`;

  if (tab === 'teams') return `<section class="admin-section"><div class="admin-section-head"><div><h2>Equipos</h2><p>Asigna entrenadores y jugadoras a cada equipo.</p></div><button class="btn btn-primary" onclick="adminCreateTeamRC19()"><i data-lucide="plus"></i>Nuevo equipo</button></div><div class="admin-team-grid">${ctx.teams.map(team=>{const coach=ctx.users.find(u=>u.username===team.coachUsername);return `<article class="admin-team-card ${team.active===false?'is-inactive':''}"><div class="admin-team-card-head"><span><i data-lucide="volleyball"></i></span><button onclick="adminEditTeamRC19('${team.id}')"><i data-lucide="pencil"></i></button></div><h3>${rc19Escape(team.name)}</h3><p><b>Entrenador:</b> ${rc19Escape(coach?.name||'Sin asignar')}</p><p><b>Jugadoras:</b> ${(team.playerIds||[]).length}</p><span class="admin-team-state">${team.active===false?'Inactivo':'Activo'}</span></article>`}).join('')}</div></section>`;

  if (tab === 'seasons') return `<section class="admin-section"><div class="admin-section-head"><div><h2>Temporadas</h2><p>Conserva el histórico y elige qué temporada está activa.</p></div><button class="btn btn-primary" onclick="adminCreateSeasonRC19()"><i data-lucide="calendar-plus"></i>Nueva temporada</button></div><div class="admin-season-list">${ctx.seasons.map(s=>`<article class="admin-season-row ${s.active?'active':''}"><div><i data-lucide="${s.active?'calendar-check':'archive'}"></i><span><strong>${rc19Escape(s.name)}</strong><small>${s.active?'Temporada activa':'Histórico conservado'}</small></span></div>${s.active?'<span class="viz-badge">Activa</span>':`<button class="btn btn-outline btn-sm" onclick="adminActivateSeasonRC19('${s.id}')">Activar</button>`}</article>`).join('')}</div></section>`;

  const cfg = appState.adminConfig || {modules:{}};
  return `<section class="admin-section"><div class="admin-section-head"><div><h2>Configuración del club</h2><p>Personalización y módulos disponibles para el equipo.</p></div><button class="btn btn-outline" onclick="document.getElementById('btn-club-settings')?.click()"><i data-lucide="palette"></i>Identidad visual</button></div><div class="admin-config-grid"><article class="admin-config-card"><h3>Módulos activos</h3>${[['wellness','Bienestar'],['load','Carga / RPE'],['gamification','Gamificación'],['planning','Planificación'],['tests','Tests físicos'],['stats','Estadísticas'],['tactics','Plan de juego']].map(([key,label])=>`<label class="admin-switch-row"><span>${label}</span><input type="checkbox" ${cfg.modules?.[key]!==false?'checked':''} onchange="adminToggleModuleRC19('${key}',this.checked)"></label>`).join('')}</article><article class="admin-config-card"><h3>Datos del club</h3><dl><div><dt>Club</dt><dd>${rc19Escape(appState.teamInfo?.name||'')}</dd></div><div><dt>Categoría</dt><dd>${rc19Escape(appState.teamInfo?.category||'')}</dd></div><div><dt>Temporada</dt><dd>${rc19Escape(ctx.metrics.season)}</dd></div><div><dt>Idioma</dt><dd>Castellano</dd></div></dl><button class="btn btn-primary" onclick="document.getElementById('btn-club-settings')?.click()">Editar datos del club</button></article></div></section>`;
}

function adminPersistRC19(message) {
  saveAppData(appState, {immediate:true});
  invalidateViewRenderCache();
  homeDashboardCache = {revision:-1,role:'',dayKey:''};
  if (message) showToast(message);
}
function adminCreateUserRC19() {
  const name = prompt('Nombre completo del nuevo usuario:'); if (!name) return;
  const username = (prompt('Nombre de usuario:')||'').trim().toLowerCase(); if (!username) return;
  if ((appState.users||[]).some(u=>u.username===username)) return showToast('Ese usuario ya existe.','error');
  const roleInput = (prompt('Rol: administrator, coach o player','coach')||'coach').trim().toLowerCase();
  const role = ['administrator','coach','player'].includes(roleInput)?roleInput:'coach';
  appState.users.push({username,password:'123456',name:name.trim(),role,playerId:null,lastLogin:null,disabled:false});
  adminPersistRC19('Usuario creado con contraseña inicial 123456.'); renderAdminPortalRC19('users');
}
function adminResetPasswordRC19(username) { const u=(appState.users||[]).find(x=>x.username===username); if(!u)return; const p=prompt(`Nueva contraseña para @${username}:`,'123456'); if(!p)return; u.password=p; adminPersistRC19('Contraseña actualizada.'); renderAdminPortalRC19('users'); }
function adminToggleUserRC19(username) { const u=(appState.users||[]).find(x=>x.username===username); if(!u)return; u.disabled=!u.disabled; adminPersistRC19(u.disabled?'Usuario desactivado.':'Usuario activado.'); renderAdminPortalRC19('users'); }
function adminDeleteUserRC19(username) { if(!confirm(`¿Eliminar el acceso @${username}?`))return; appState.users=(appState.users||[]).filter(u=>u.username!==username); adminPersistRC19('Usuario eliminado.'); renderAdminPortalRC19('users'); }
function adminCreateTeamRC19() { const name=prompt('Nombre del equipo:'); if(!name)return; const coaches=(appState.users||[]).filter(u=>u.role==='coach'); const coachUsername=prompt(`Usuario del entrenador (${coaches.map(c=>c.username).join(', ')||'sin entrenadores'}):`,coaches[0]?.username||'')||''; appState.teams.push({id:`team-${Date.now()}`,name:name.trim(),coachUsername,playerIds:[],active:true}); adminPersistRC19('Equipo creado.'); renderAdminPortalRC19('teams'); }
function adminEditTeamRC19(id) { const team=(appState.teams||[]).find(t=>t.id===id); if(!team)return; const name=prompt('Nombre del equipo:',team.name); if(name)team.name=name.trim(); const coach=prompt('Usuario del entrenador:',team.coachUsername||''); if(coach!==null)team.coachUsername=coach.trim(); const playerInput=prompt('IDs de jugadoras separados por coma:',(team.playerIds||[]).join(',')); if(playerInput!==null)team.playerIds=playerInput.split(',').map(v=>v.trim()).filter(id=>(appState.players||[]).some(p=>p.id===id)); adminPersistRC19('Equipo actualizado.'); renderAdminPortalRC19('teams'); }
function adminCreateSeasonRC19() { const name=prompt('Nombre de la nueva temporada (ej. 2027 - 2028):'); if(!name)return; if(!confirm('Se creará la temporada y se activará. El histórico anterior se conserva.'))return; (appState.seasons||[]).forEach(s=>s.active=false); const season={id:`season-${Date.now()}`,name:name.trim(),active:true,createdAt:new Date().toISOString()}; appState.seasons.push(season); appState.teamInfo.season=season.name; adminPersistRC19('Nueva temporada activada.'); updateTeamHeaderInfo(); renderAdminPortalRC19('seasons'); }
function adminActivateSeasonRC19(id) { const s=(appState.seasons||[]).find(x=>x.id===id); if(!s||!confirm(`¿Activar la temporada ${s.name}?`))return; appState.seasons.forEach(x=>x.active=x.id===id); appState.teamInfo.season=s.name; adminPersistRC19('Temporada activa actualizada.'); updateTeamHeaderInfo(); renderAdminPortalRC19('seasons'); }
function adminToggleModuleRC19(key,checked) { ensureRC19AdminData(); appState.adminConfig.modules[key]=Boolean(checked); adminPersistRC19('Configuración actualizada.'); }
Object.assign(window,{adminCreateUserRC19,adminResetPasswordRC19,adminToggleUserRC19,adminDeleteUserRC19,adminCreateTeamRC19,adminEditTeamRC19,adminCreateSeasonRC19,adminActivateSeasonRC19,adminToggleModuleRC19});

const openModuleRC19Base = openModule;
openModule = function openModuleRC19(moduleName, options={}) {
  openModuleRC19Base(moduleName, options);
  if (moduleName === 'users' && isAdministratorUser()) renderAdminPortalRC19('overview');
};
window.openModule = openModule;

function initRC19() {
  ensureRC19AdminData();
  // El acceso existente a Usuarios pasa a representar el panel completo de administración.
  document.querySelectorAll('[data-target="users"] .mini-label, #mini-users span').forEach(el=>el.textContent='Administración');
  document.querySelectorAll('.island-card[onclick*="users"] h3').forEach(el=>el.textContent='Administración');
  if (isAdministratorUser()) {
    try { renderHomeDashboard(); } catch(_) {}
  }
}
document.addEventListener('DOMContentLoaded', initRC19);

// ============================================================================
// RC2.0 · Administración avanzada: auditoría, copias, permisos y comunicados
// ============================================================================
function ensureRC20AdminData(){
  ensureRC19AdminData();
  appState.auditLog = Array.isArray(appState.auditLog) ? appState.auditLog : [];
  appState.announcements = Array.isArray(appState.announcements) ? appState.announcements : [];
  appState.coachPermissions = appState.coachPermissions && typeof appState.coachPermissions === 'object' ? appState.coachPermissions : {};
  (appState.users||[]).filter(u=>u.role==='coach').forEach(u=>{
    if(!appState.coachPermissions[u.username]) appState.coachPermissions[u.username]={
      createTrainings:true, editStats:true, uploadPlanning:true, managePlayers:false, deleteTrainings:true, publishTactics:true
    };
  });
}
function rc20Audit(action, detail=''){
  ensureRC20AdminData();
  const user = currentUser?.name || currentUser?.username || 'Sistema';
  appState.auditLog.unshift({id:`audit-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,at:new Date().toISOString(),user,action,detail});
  appState.auditLog = appState.auditLog.slice(0,300);
}
function rc20FmtDate(value){try{return new Date(value).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'});}catch(_){return ''}}
function rc20Escape(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

const renderAdminPortalRC19Base = renderAdminPortalRC19;
renderAdminPortalRC19 = function renderAdminPortalRC20(activeTab='overview'){
  if(!isAdministratorUser()) return renderAdminPortalRC19Base(activeTab);
  ensureRC20AdminData();
  const view=document.getElementById('view-users'); if(!view)return;
  const users=appState.users||[], teams=appState.teams||[], seasons=appState.seasons||[], metrics=rc19GetAdminMetrics();
  const tabs=[
    ['overview','Resumen','layout-dashboard'],['users','Usuarios','users'],['teams','Equipos','volleyball'],['seasons','Temporadas','calendar-range'],
    ['permissions','Permisos','shield-check'],['announcements','Comunicados','megaphone'],['audit','Auditoría','history'],['backups','Copias','database-backup'],['config','Configuración','settings']
  ];
  view.innerHTML=`<section class="admin-portal">
    <header class="admin-portal-header"><div><span class="dashboard-eyebrow"><i data-lucide="shield-check"></i> Solo administrador</span><h1>Administración del club</h1><p>Usuarios, equipos, permisos, comunicaciones y seguridad de los datos.</p></div><span class="admin-active-season">${rc20Escape(metrics.season)}</span></header>
    <nav class="admin-tabs">${tabs.map(([id,label,icon])=>`<button type="button" class="${activeTab===id?'active':''}" onclick="renderAdminPortalRC19('${id}')"><i data-lucide="${icon}"></i>${label}</button>`).join('')}</nav>
    <div class="admin-tab-content">${renderAdminTabRC20(activeTab,{users,teams,seasons,metrics})}</div>
  </section>`;
  if(window.lucide) requestAnimationFrame(()=>{try{lucide.createIcons()}catch(_){}});
};
window.renderAdminPortalRC19=renderAdminPortalRC19;

function renderAdminTabRC20(tab,ctx){
  if(!['permissions','announcements','audit','backups'].includes(tab)) return renderAdminTabRC19(tab,ctx);
  if(tab==='permissions'){
    const labels={createTrainings:'Crear entrenamientos',editStats:'Editar estadísticas',uploadPlanning:'Subir planificación',managePlayers:'Gestionar jugadoras',deleteTrainings:'Eliminar entrenamientos',publishTactics:'Publicar plan de juego'};
    const coaches=ctx.users.filter(u=>u.role==='coach');
    return `<section class="admin-section"><div class="admin-section-head"><div><h2>Permisos de entrenadores</h2><p>Define qué puede hacer cada entrenador sin convertirlo en administrador.</p></div></div><div class="admin-permission-grid">${coaches.length?coaches.map(c=>{const p=appState.coachPermissions[c.username]||{};return `<article class="admin-config-card"><h3>${rc20Escape(c.name||c.username)}</h3><small>@${rc20Escape(c.username)}</small>${Object.entries(labels).map(([k,l])=>`<label class="admin-switch-row"><span>${l}</span><input type="checkbox" ${p[k]!==false?'checked':''} onchange="adminSetCoachPermissionRC20('${rc20Escape(c.username)}','${k}',this.checked)"></label>`).join('')}</article>`}).join(''):'<div class="admin-empty">No hay entrenadores creados.</div>'}</div></section>`;
  }
  if(tab==='announcements'){
    return `<section class="admin-section"><div class="admin-section-head"><div><h2>Comunicados</h2><p>Publica avisos oficiales. No es un chat y las jugadoras no pueden responder.</p></div><button class="btn btn-primary" onclick="adminCreateAnnouncementRC20()"><i data-lucide="plus"></i>Nuevo comunicado</button></div><div class="admin-announcement-list">${appState.announcements.length?appState.announcements.map(a=>`<article class="admin-announcement-card ${a.active===false?'is-archived':''}"><div><span>${rc20FmtDate(a.createdAt)}</span><h3>${rc20Escape(a.title)}</h3><p>${rc20Escape(a.body)}</p><small>Destinatarios: ${rc20Escape(a.audience||'Todo el club')}</small></div><div class="admin-row-actions"><button title="${a.active===false?'Volver a publicar':'Archivar'}" onclick="adminToggleAnnouncementRC20('${a.id}')"><i data-lucide="${a.active===false?'rotate-ccw':'archive'}"></i></button><button class="danger" title="Eliminar" onclick="adminDeleteAnnouncementRC20('${a.id}')"><i data-lucide="trash-2"></i></button></div></article>`).join(''):'<div class="admin-empty">Todavía no hay comunicados.</div>'}</div></section>`;
  }
  if(tab==='audit'){
    return `<section class="admin-section"><div class="admin-section-head"><div><h2>Auditoría</h2><p>Registro local de las acciones administrativas más importantes.</p></div><button class="btn btn-outline" onclick="adminClearAuditRC20()"><i data-lucide="trash-2"></i>Vaciar registro</button></div><div class="admin-audit-list">${appState.auditLog.length?appState.auditLog.map(e=>`<article><time>${rc20FmtDate(e.at)}</time><div><strong>${rc20Escape(e.user)}</strong><span>${rc20Escape(e.action)}</span>${e.detail?`<small>${rc20Escape(e.detail)}</small>`:''}</div></article>`).join(''):'<div class="admin-empty">No hay acciones registradas todavía.</div>'}</div></section>`;
  }
  return `<section class="admin-section"><div class="admin-section-head"><div><h2>Copias e importación</h2><p>Protege los datos del club y mueve información entre dispositivos.</p></div></div><div class="admin-backup-grid">
    <article class="admin-config-card"><i data-lucide="download"></i><h3>Exportar copia completa</h3><p>Incluye jugadoras, calendario, entrenamientos, asistencia, bienestar, carga, estadísticas y configuración.</p><button class="btn btn-primary" onclick="adminExportBackupRC20()">Descargar JSON</button></article>
    <article class="admin-config-card"><i data-lucide="upload"></i><h3>Restaurar copia</h3><p>Valida el archivo y crea una copia de seguridad previa antes de sustituir los datos.</p><button class="btn btn-outline" onclick="triggerVolleyCoachImport()">Importar JSON</button></article>
    <article class="admin-config-card"><i data-lucide="file-spreadsheet"></i><h3>Exportar usuarios</h3><p>Descarga una lista CSV de accesos, roles y estado.</p><button class="btn btn-outline" onclick="adminExportUsersCSVRC20()">Descargar CSV</button></article>
    <article class="admin-config-card"><i data-lucide="rotate-ccw"></i><h3>Copia anterior a importación</h3><p>Restaura la copia automática creada justo antes de la última importación.</p><button class="btn btn-outline" onclick="adminRestorePreImportRC20()">Restaurar copia previa</button></article>
  </div></section>`;
}

function adminSetCoachPermissionRC20(username,key,value){ensureRC20AdminData();appState.coachPermissions[username][key]=Boolean(value);rc20Audit('Actualizó permisos',`${username}: ${key} = ${value?'sí':'no'}`);adminPersistRC19('Permisos actualizados.');}
function adminCreateAnnouncementRC20(){const title=prompt('Título del comunicado:');if(!title)return;const body=prompt('Mensaje:');if(!body)return;const audience=prompt('Destinatarios (ej. Todo el club, Cadete, Infantil):','Todo el club')||'Todo el club';const a={id:`announcement-${Date.now()}`,title:title.trim(),body:body.trim(),audience:audience.trim(),active:true,createdAt:new Date().toISOString(),createdBy:currentUser?.username||'admin'};appState.announcements.unshift(a);rc20Audit('Publicó un comunicado',a.title);adminPersistRC19('Comunicado publicado.');renderAdminPortalRC19('announcements');renderHomeDashboard();}
function adminToggleAnnouncementRC20(id){const a=appState.announcements.find(x=>x.id===id);if(!a)return;a.active=!a.active;rc20Audit(a.active?'Volvió a publicar un comunicado':'Archivó un comunicado',a.title);adminPersistRC19(a.active?'Comunicado publicado.':'Comunicado archivado.');renderAdminPortalRC19('announcements');renderHomeDashboard();}
function adminDeleteAnnouncementRC20(id){const a=appState.announcements.find(x=>x.id===id);if(!a||!confirm(`¿Eliminar el comunicado “${a.title}”?`))return;appState.announcements=appState.announcements.filter(x=>x.id!==id);rc20Audit('Eliminó un comunicado',a.title);adminPersistRC19('Comunicado eliminado.');renderAdminPortalRC19('announcements');renderHomeDashboard();}
function adminClearAuditRC20(){if(!confirm('¿Vaciar todo el registro de auditoría local?'))return;appState.auditLog=[];adminPersistRC19('Registro de auditoría vaciado.');renderAdminPortalRC19('audit');}
function adminExportBackupRC20(){rc20Audit('Exportó una copia de seguridad');adminPersistRC19();exportVolleyCoachBackup();}
function adminExportUsersCSVRC20(){const rows=[['Nombre','Usuario','Rol','Estado'],...(appState.users||[]).map(u=>[u.name||'',u.username||'',rc19RoleLabel(u.role),u.disabled?'Desactivado':'Activo'])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`VolleyCoach_usuarios_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);rc20Audit('Exportó usuarios en CSV');adminPersistRC19('Usuarios exportados.');}
function adminRestorePreImportRC20(){const raw=localStorage.getItem('volleycoach_data_backup_before_import');if(!raw)return showToast('No existe una copia previa a importación.','error');if(!confirm('Se sustituirán los datos actuales por la copia previa a la última importación. ¿Continuar?'))return;localStorage.setItem('volleycoach_data',raw);localStorage.setItem('volleycoach_last_saved_at',new Date().toISOString());alert('Copia previa restaurada. La aplicación se recargará.');location.reload();}
Object.assign(window,{adminSetCoachPermissionRC20,adminCreateAnnouncementRC20,adminToggleAnnouncementRC20,adminDeleteAnnouncementRC20,adminClearAuditRC20,adminExportBackupRC20,adminExportUsersCSVRC20,adminRestorePreImportRC20});

// Registra también las acciones de la RC1.9.
const adminPersistRC19Base=adminPersistRC19;
adminPersistRC19=function adminPersistRC20(message){adminPersistRC19Base(message);};

function renderAnnouncementsOnHomeRC20(){
  ensureRC20AdminData();
  const root=document.getElementById('home-dashboard'); if(!root)return;
  root.querySelector('.club-announcements')?.remove();
  const active=appState.announcements.filter(a=>a.active!==false).slice(0,3); if(!active.length)return;
  const html=`<section class="club-announcements"><div class="club-announcements-head"><i data-lucide="megaphone"></i><strong>Comunicados del club</strong></div>${active.map(a=>`<article><span>${rc20Escape(a.audience||'Todo el club')}</span><h3>${rc20Escape(a.title)}</h3><p>${rc20Escape(a.body)}</p><time>${rc20FmtDate(a.createdAt)}</time></article>`).join('')}</section>`;
  const anchor=root.querySelector('.admin-overview-panel')||root.firstElementChild; if(anchor)anchor.insertAdjacentHTML('afterend',html);else root.insertAdjacentHTML('afterbegin',html);
  if(window.lucide)requestAnimationFrame(()=>{try{lucide.createIcons()}catch(_){}});
}
const renderHomeDashboardRC20Base=renderHomeDashboard;
renderHomeDashboard=function renderHomeDashboardRC20(){const out=renderHomeDashboardRC20Base();renderAnnouncementsOnHomeRC20();return out;};
window.renderHomeDashboard=renderHomeDashboard;

document.addEventListener('DOMContentLoaded',()=>{ensureRC20AdminData();renderAnnouncementsOnHomeRC20();});


/* ==========================================================================\n   RC2.0.1 — ZONAS DE CLIC, RPE DE PRUEBA Y NAVEGACIÓN WEB\n   ========================================================================== */
// Durante la fase de pruebas, la RPE permanece disponible en cualquier entrenamiento.
isRpeSubmissionWindowOpen = function isRpeSubmissionWindowOpenRC201(event) {
  return Boolean(event);
};
window.isRpeSubmissionWindowOpen = isRpeSubmissionWindowOpen;

function initImmediateDesktopControlsRC201() {
  const oldNav = document.getElementById('desktop-quick-nav');
  if (oldNav && oldNav.dataset.rc201Bound !== '1') {
    const nav = oldNav.cloneNode(true);
    nav.dataset.rc201Bound = '1';
    oldNav.replaceWith(nav);
    let activatedByPointer = false;
    const activate = (button) => {
      if (!button) return;
      const target = button.dataset.target;
      nav.querySelectorAll('.desktop-nav-item').forEach(item => item.classList.toggle('active', item === button));
      if (target) openModule(target === 'home' ? 'home-portal' : target);
    };
    nav.addEventListener('pointerup', event => {
      const button = event.target.closest('.desktop-nav-item');
      if (!button || event.button > 0) return;
      event.preventDefault();
      event.stopPropagation();
      activatedByPointer = true;
      activate(button);
      setTimeout(() => { activatedByPointer = false; }, 50);
    }, true);
    nav.addEventListener('click', event => {
      const button = event.target.closest('.desktop-nav-item');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      if (!activatedByPointer) activate(button);
    }, true);
    if (window.lucide) requestAnimationFrame(() => { try { lucide.createIcons(); } catch (_) {} });
  }

  // El botón de salir responde en toda su superficie, no solo sobre el icono/texto.
  document.addEventListener('pointerup', event => {
    const button = event.target.closest('.dashboard-logout-btn');
    if (!button || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    handleLogout(event);
  }, true);
}
document.addEventListener('DOMContentLoaded', initImmediateDesktopControlsRC201);

// Refresca la tarjeta de tareas sin exigir recargar la página.
const renderWellnessRC201Base = renderWellness;
renderWellness = function renderWellnessRC201() {
  renderWellnessRC201Base();
  try {
    invalidateViewRenderCache();
    homeDashboardCache = { revision: -1, role: '', dayKey: '' };
  } catch (_) {}
};
window.renderWellness = renderWellness;


/* ==========================================================================\n   RC2.0.3 — SEGUIMIENTO SEMANAL, RPE Y SUEÑO OBLIGATORIO\n   ========================================================================== */
(function(){
  const normalizeId = value => String(value ?? '').trim();
  const eventRecords = eventId => (appState.trainingRPEs || []).filter(record => {
    const rid = record?.eventId ?? record?.trainingId ?? record?.sessionId;
    return normalizeId(rid) === normalizeId(eventId) && Number.isFinite(Number(record?.rpeVal));
  });
  const officialValidated = event => Boolean(event?.attendanceValidatedAt || event?.attendanceOfficial || event?.attendanceValidated === true);
  const weekDate = value => {
    const raw = value instanceof Date ? value : new Date(`${value}T12:00:00`);
    return Number.isNaN(raw.getTime()) ? null : raw;
  };

  getWeeklyCoachTracking = function getWeeklyCoachTrackingRC203(){
    const range = getRC17WeekRange();
    const players = appState.players || [];
    const trainings = (appState.events || []).filter(event => isTrainingEvent(event) && eventInRC17Week(event,range));
    const finished = trainings.filter(event => isTrainingFinished(event));
    const wellnessResponders = new Set((appState.wellnessLogs || []).filter(log => {
      const raw = log.dateKey || log.date || getLocalDateKey(new Date(log.createdAt || Date.now()));
      const date = weekDate(raw);
      return date && date >= range.start && date <= range.end;
    }).map(log => log.playerId));
    const confirmationExpected = trainings.length * players.length;
    const confirmationDone = trainings.reduce((sum,event) => sum + new Set((appState.trainingConfirmations || []).filter(c=>normalizeId(c.eventId)===normalizeId(event.id)).map(c=>c.playerId)).size,0);
    const validated = trainings.filter(officialValidated);
    const dueForValidation = trainings.filter(event => {
      const d = weekDate(event.date);
      return d && d <= new Date() && !officialValidated(event);
    });
    const rpeSessions = trainings.map(event => {
      const records = eventRecords(event.id).filter(r => r.playerId);
      const responders = new Set(records.map(r=>r.playerId));
      const avg = records.length ? records.reduce((s,r)=>s+Number(r.rpeVal),0)/records.length : null;
      return {event,done:responders.size,total:players.length,pct:players.length?Math.round(responders.size*100/players.length):0,average:avg,coachRpe:Number.isFinite(Number(event.coachRpe))?Number(event.coachRpe):null};
    });
    return {
      range, players:players.length, trainings, finished, validated,
      wellnessDone:wellnessResponders.size, wellnessPending:Math.max(0,players.length-wellnessResponders.size),
      confirmationDone, confirmationExpected, confirmationPending:Math.max(0,confirmationExpected-confirmationDone),
      validationDone:validated.length, validationTotal:trainings.length, validationPending:dueForValidation.length, rpeSessions
    };
  };
  window.getWeeklyCoachTracking = getWeeklyCoachTracking;

  renderWeeklyCoachTrackingCard = function renderWeeklyCoachTrackingCardRC203(){
    const tracking = getWeeklyCoachTracking();
    const dateLabel = `${tracking.range.start.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${tracking.range.end.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`;
    const rpeRows = tracking.rpeSessions.length ? tracking.rpeSessions.map(item => {
      const team = item.average === null ? '—' : item.average.toFixed(1);
      const coach = item.coachRpe === null ? '—' : item.coachRpe.toFixed(1);
      return `<div class="weekly-rpe-row weekly-rpe-row-detailed"><span>${escapeDashboardText(item.event.title || 'Entrenamiento')}<small>${formatEventDate(item.event.date)}</small></span><div class="weekly-rpe-values"><em>Equipo <b>${team}</b></em><em>Mi RPE <b>${coach}</b></em></div><strong>${item.pct}%</strong><div class="weekly-rpe-mini"><span style="width:${item.pct}%"></span></div><b>${item.done}/${item.total}</b></div>`;
    }).join('') : '<p class="weekly-empty">No hay entrenamientos programados esta semana.</p>';
    return `<article class="dashboard-card dashboard-card-wide weekly-tracking-card"><div class="dashboard-card-topline"><span class="dashboard-eyebrow"><i data-lucide="calendar-range"></i> Seguimiento semanal</span><span class="weekly-range">${dateLabel}</span></div><div class="weekly-tracking-grid">
      ${renderRC17Progress('Bienestar',tracking.wellnessDone,tracking.players,'heart-pulse')}
      ${renderRC17Progress('Confirmaciones',tracking.confirmationDone,tracking.confirmationExpected,'calendar-check')}
      ${renderRC17Progress('Listas validadas',tracking.validationDone,tracking.validationTotal,'badge-check')}
    </div><div class="weekly-rpe-section"><div class="weekly-rpe-title"><span><i data-lucide="activity"></i> Respuesta de Carga/RPE</span><small>Media semanal y detalle por entrenamiento</small></div>${rpeRows}</div><div class="weekly-pending-summary"><span><b>${tracking.wellnessPending}</b> bienestar pendientes</span><span><b>${tracking.confirmationPending}</b> confirmaciones pendientes</span><span><b>${tracking.validationPending}</b> listas por validar</span></div></article>`;
  };
  window.renderWeeklyCoachTrackingCard = renderWeeklyCoachTrackingCard;

  renderCoachAttendanceList = function renderCoachAttendanceListRC203(){
    const container = document.getElementById('coach-attendance-list');
    if (!container) return;
    const range = getRC17WeekRange();
    const trainings = (appState.events || []).filter(event => isTrainingEvent(event) && eventInRC17Week(event,range)).sort((a,b)=>parseEventStart(a)-parseEventStart(b));
    if (!trainings.length){
      container.innerHTML='<div class="training-empty coach-control-empty"><i data-lucide="calendar-range"></i><h3>Sin entrenamientos esta semana</h3><p>Cuando programes una sesión aparecerá aquí con su preparación, asistencia y percepción del esfuerzo.</p></div>';
      if(window.lucide) lucide.createIcons(); return;
    }
    const cards=trainings.map(event=>{
      const finished=isTrainingFinished(event);
      const records=eventRecords(event.id).filter(r=>r.playerId);
      const avg=records.length?records.reduce((s,r)=>s+Number(r.rpeVal),0)/records.length:null;
      const coach=Number.isFinite(Number(event.coachRpe))?Number(event.coachRpe):null;
      const validated=officialValidated(event);
      const attendance=(appState.attendanceData||[]).filter(r=>normalizeId(r.eventId)===normalizeId(event.id));
      const present=attendance.filter(r=>['present','attended'].includes(r.status)).length;
      const planned=Boolean(event.plan||event.description||event.attachmentId||event.sessionImage);
      return `<button type="button" class="attendance-card coach-training-control-card" onclick="${finished?`openCoachAttendanceDetail('${event.id}')`:`openSeasonEvent('${event.id}')`}"><div class="att-card-left"><span class="coach-control-date">${formatEventDate(event.date)} · ${event.time||'Hora pendiente'}</span><strong>${escapeSessionText(event.title||'Entrenamiento')}</strong><small>${finished?'Finalizado':'Próximo'}</small></div><div class="coach-control-statuses"><span class="${planned?'is-complete':'is-pending'}"><i data-lucide="notebook-pen"></i>${planned?'Preparado':'Sin preparar'}</span><span class="${validated?'is-complete':'is-pending'}"><i data-lucide="clipboard-check"></i>${validated?`${present} asistencias validadas`:'Lista pendiente'}</span><span class="is-neutral"><i data-lucide="users"></i>Equipo: ${avg===null?'—':avg.toFixed(1)}</span><span class="is-neutral"><i data-lucide="user-round"></i>Mi RPE: ${coach===null?'—':coach.toFixed(1)}</span><span class="is-neutral"><i data-lucide="gauge"></i>${records.length}/${(appState.players||[]).length} respuestas</span></div><i data-lucide="chevron-right" class="coach-control-arrow"></i></button>`;
    }).join('');
    container.innerHTML=`<section class="coach-control-section"><div class="coach-control-section-title"><span>Entrenamientos de la semana</span><b>${trainings.length}</b></div>${cards}</section>`;
    if(window.lucide) lucide.createIcons();
  };
  window.renderCoachAttendanceList=renderCoachAttendanceList;

  renderTeamRpeSummary = function renderTeamRpeSummaryRC203(){
    const section=document.getElementById('rpe-team-summary-section');
    const grid=document.getElementById('rpe-team-summary-grid');
    if(!section||!grid) return;
    if(!isCoachUser()){section.style.display='none';return;}
    section.style.display='block';
    const trainings=(appState.events||[]).filter(isTrainingEvent).sort((a,b)=>getTrainingDateTime(b)-getTrainingDateTime(a)).slice(0,18);
    if(!trainings.length){grid.innerHTML='<p class="training-no-rpe">Todavía no hay entrenamientos registrados.</p>';return;}
    grid.innerHTML=trainings.map(training=>{
      const records=eventRecords(training.id).filter(r=>r.playerId);
      const avg=records.length?records.reduce((s,r)=>s+Number(r.rpeVal),0)/records.length:null;
      const date=weekDate(training.date);
      const label=date?date.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}):String(training.date||'');
      return `<button type="button" class="rpe-average-tile ${records.length?'has-data':'is-empty'}" onclick="openRpeResponsesModal('${training.id}')"><span>${label}</span><strong>${avg===null?'—':avg.toFixed(1)}</strong><small>${records.length} respuesta${records.length===1?'':'s'}</small></button>`;
    }).join('');
  };
  window.renderTeamRpeSummary=renderTeamRpeSummary;

  renderBorgMatrix = function renderBorgMatrixRC203(){
    const thead=document.getElementById('borg-matrix-thead-tr');
    const tbody=document.getElementById('borg-matrix-tbody');
    if(!thead||!tbody) return;
    thead.innerHTML='<th>Semana / día</th><th>Respuestas</th><th>Bienestar medio</th><th>Sueño medio</th><th>Detalle</th>';
    let logs=(appState.wellnessLogs||[]).filter(Boolean);
    if(!isCoachUser()){
      const user=getCurrentUser(); if(user?.playerId) logs=logs.filter(l=>l.playerId===user.playerId);
    }
    const groups=new Map();
    logs.forEach(log=>{
      const dateKey=log.dateKey||log.date||(log.createdAt?getLocalDateKey(new Date(log.createdAt)):null);
      if(!dateKey) return;
      const info=getWeekInfoForDate(new Date(`${dateKey}T12:00:00`));
      if(!groups.has(info.weekKey)) groups.set(info.weekKey,{monday:info.mondayDate,days:new Map()});
      const week=groups.get(info.weekKey);
      if(!week.days.has(dateKey)) week.days.set(dateKey,[]);
      week.days.get(dateKey).push(log);
    });
    const entries=[...groups.entries()].sort((a,b)=>b[1].monday-a[1].monday);
    if(!entries.length){tbody.innerHTML='<tr><td colspan="5" class="weekly-empty">Todavía no hay cuestionarios contestados.</td></tr>';return;}
    tbody.innerHTML=entries.map(([weekKey,week])=>{
      const all=[...week.days.values()].flat();
      const f=all.map(l=>Number(l.fatigue)).filter(Number.isFinite);
      const s=all.map(l=>Number(l.sleepQuality)).filter(v=>Number.isFinite(v)&&v>0);
      const favg=f.length?(f.reduce((a,b)=>a+b,0)/f.length).toFixed(1):'—';
      const savg=s.length?(s.reduce((a,b)=>a+b,0)/s.length).toFixed(1):'—';
      const sunday=new Date(week.monday); sunday.setDate(sunday.getDate()+6);
      const header=`<tr class="wellness-week-summary"><td><strong>${week.monday.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})} – ${sunday.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</strong></td><td>${all.length}</td><td><b>${favg}</b>/5</td><td><b>${savg}</b>/5</td><td>Media semanal</td></tr>`;
      const days=[...week.days.entries()].sort((a,b)=>new Date(b[0])-new Date(a[0])).map(([dateKey,dayLogs])=>{
        const df=dayLogs.map(l=>Number(l.fatigue)).filter(Number.isFinite);
        const ds=dayLogs.map(l=>Number(l.sleepQuality)).filter(v=>Number.isFinite(v)&&v>0);
        const names=dayLogs.map(l=>(appState.players||[]).find(p=>p.id===l.playerId)?.name||l.playerName||'Jugadora').join(', ');
        return `<tr class="wellness-day-detail"><td>${new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'2-digit'})}</td><td>${dayLogs.length}</td><td>${df.length?(df.reduce((a,b)=>a+b,0)/df.length).toFixed(1):'—'}</td><td>${ds.length?(ds.reduce((a,b)=>a+b,0)/ds.length).toFixed(1):'—'}</td><td>${escapeDashboardText(names)}</td></tr>`;
      }).join('');
      return header+days;
    }).join('');
  };
  window.renderBorgMatrix=renderBorgMatrix;

  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('form-wellness');
    const submit=document.getElementById('btn-submit-wellness');
    const hidden=document.getElementById('wellness-sleep-quality');
    const sync=()=>{if(submit) submit.disabled=!(hidden&&hidden.value);};
    if(hidden&&!hidden.value) sync();
    document.querySelectorAll('[data-sleep]').forEach(btn=>btn.addEventListener('click',()=>{if(hidden) hidden.value=btn.dataset.sleep;sync();}));
    form?.addEventListener('submit',event=>{
      if(!hidden?.value){event.preventDefault();event.stopImmediatePropagation();showToast('Selecciona cómo estás durmiendo antes de enviar la valoración.','error');sync();}
    },true);
  });

  const originalOpenWellness=openAddWellnessModal;
  openAddWellnessModal=function openAddWellnessModalRC203(targetPlayerId,targetWeekNum){
    originalOpenWellness(targetPlayerId,targetWeekNum);
    const select=document.getElementById('wellness-player-select');
    const pid=select?.value;
    const status=pid?getPlayerDailyStatus(pid):null;
    const hidden=document.getElementById('wellness-sleep-quality');
    const submit=document.getElementById('btn-submit-wellness');
    if(!status?.log){
      if(hidden) hidden.value='';
      document.querySelectorAll('[data-sleep]').forEach(button=>button.classList.remove('selected'));
      if(submit) submit.disabled=true;
    }
  };
  window.openAddWellnessModal=openAddWellnessModal;

  const originalSetSleep=setWellnessSleepChoice;
  setWellnessSleepChoice=function setWellnessSleepChoiceRC203(value){
    if(value===null||value===undefined||value===''){
      const hidden=document.getElementById('wellness-sleep-quality'); if(hidden) hidden.value='';
      document.querySelectorAll('[data-sleep]').forEach(button=>button.classList.remove('selected'));
      const submit=document.getElementById('btn-submit-wellness'); if(submit) submit.disabled=true;
      return;
    }
    originalSetSleep(value);
    const submit=document.getElementById('btn-submit-wellness'); if(submit) submit.disabled=false;
  };
  window.setWellnessSleepChoice=setWellnessSleepChoice;

  /* ========================================================================== 
     BLOQUE C · SINCRO DE EVENTOS & CALENDARIO EN SUPABASE CON REALTIME
     ========================================================================== */

  function generateDynamicBirthdayEvents() {
    const players = appState.players || [];
    const currentYear = new Date().getFullYear();
    const bdays = [];
    players.forEach(p => {
      const rawDate = p.birthDate || p.birth_date;
      if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate))) return;
      const parts = String(rawDate).split('-');
      const bdayDate = `${currentYear}-${parts[1]}-${parts[2]}`;
      const pName = p.name || p.full_name || 'Jugadora';
      bdays.push({
        id: `bday_${p.id || p.legacy_id || pName}_${currentYear}`,
        type: 'Cumpleaños',
        title: `🎂 Cumpleaños de ${pName}`,
        date: bdayDate,
        time: '00:00',
        location: 'CV Bunyola',
        status: 'Próximo',
        description: `¡Felicidades a ${pName}! 🎉`
      });
    });
    return bdays;
  }
  window.generateDynamicBirthdayEvents = generateDynamicBirthdayEvents;

  let isSupabaseEventsLoading = false;

  async function loadEventsFromSupabase(options = {}) {
    if (!window.VolleySupabase) return;
    const client = window.VolleySupabase.getClient();
    if (!client) return;

    if (isSupabaseEventsLoading && !options.force) return;
    isSupabaseEventsLoading = true;

    try {
      const user = getCurrentUser();
      const clubId = user?.clubId || window.VolleySupabase.config?.clubId;
      const teamId = user?.teamId || null;

      if (options.showToast) {
        showToast("Cargando calendario desde Supabase...", "info");
      }

      const { data: remoteEvents, error } = await window.VolleySupabase.fetchEvents(clubId, teamId);
      if (error) {
        console.warn('[Supabase Events] Error al consultar eventos:', error);
        if (options.showToast) {
          showToast("Error al cargar eventos de Supabase: " + (error.message || "Fallo de red"), "error");
        }
        isSupabaseEventsLoading = false;
        return;
      }

      if (Array.isArray(remoteEvents)) {
        const dynamicBdays = generateDynamicBirthdayEvents();
        const remoteIds = new Set(remoteEvents.map(e => e.id));
        const nonDuplicateBdays = dynamicBdays.filter(b => !remoteIds.has(b.id));

        appState.events = [...remoteEvents, ...nonDuplicateBdays];
        saveAppData(appState);

        if (typeof invalidateViewRenderCache === "function") invalidateViewRenderCache();
        homeDashboardCache = { revision: -1, role: "", dayKey: "" };

        requestAnimationFrame(() => {
          try { renderGoogleCalendar(); } catch (e) {}
          try { renderTraining(); } catch (e) {}
          try { renderHomeDashboard(); } catch (e) {}
          try { renderStats(); } catch (e) {}
          try { renderCompetition(); } catch (e) {}
        });
      }

      // Suscribirse a cambios Realtime si no hay suscripción activa
      if (clubId && typeof window.VolleySupabase.subscribeEventsRealtime === 'function') {
        window.VolleySupabase.subscribeEventsRealtime(clubId, (payload) => {
          console.log('[Supabase Realtime] Evento actualizado en remoto:', payload.eventType);
          loadEventsFromSupabase({ silent: true, force: true });
        });
      }
    } catch (err) {
      console.error('[Supabase Events] Excepción al sincronizar:', err);
    } finally {
      isSupabaseEventsLoading = false;
    }
  }
  window.loadEventsFromSupabase = loadEventsFromSupabase;

  let isSupabaseAttendanceLoading = false;

  async function loadAttendanceFromSupabase(options = {}) {
    if (!window.VolleySupabase) return;
    const client = window.VolleySupabase.getClient();
    if (!client) return;

    if (isSupabaseAttendanceLoading && !options.force) return;
    isSupabaseAttendanceLoading = true;

    try {
      const user = getCurrentUser();
      const clubId = user?.clubId || window.VolleySupabase.config?.clubId;

      const { data: rows, error } = await window.VolleySupabase.fetchAttendance(clubId);
      if (error) {
        console.warn('[Supabase Attendance] Error al consultar asistencia:', error);
        isSupabaseAttendanceLoading = false;
        return;
      }

      if (Array.isArray(rows)) {
        const confirmations = [];
        const officialLogs = [];

        rows.forEach(r => {
          if (r.player_response) {
            confirmations.push({
              eventId: r.event_id,
              eventIdLegacy: r.events?.legacy_id || null,
              playerId: r.player_id,
              playerIdLegacy: r.players?.legacy_id || null,
              status: r.player_response,
              timestamp: r.updated_at || r.created_at
            });
          }

          if (r.official_status && r.validated_at) {
            officialLogs.push({
              id: r.id,
              eventId: r.event_id,
              eventIdLegacy: r.events?.legacy_id || null,
              playerId: r.player_id,
              playerIdLegacy: r.players?.legacy_id || null,
              status: r.official_status,
              source: 'coach_roll_call',
              validatedAt: r.validated_at,
              validatedBy: r.validated_by
            });
          }
        });

        appState.trainingConfirmations = confirmations;
        appState.attendanceData = officialLogs;
        saveAppData(appState);

        if (typeof invalidateViewRenderCache === "function") invalidateViewRenderCache();

        requestAnimationFrame(() => {
          try { renderHomeDashboard(); } catch (e) {}
          try { renderTraining(); } catch (e) {}
          try { renderHomePortalRSVP(); } catch (e) {}
          try { renderCoachAttendanceList(); } catch (e) {}
          try {
            const modal = document.getElementById('modal-verify-attendance');
            const openEvtId = document.getElementById('verify-attendance-event-id')?.value;
            if (modal && modal.classList.contains('active') && openEvtId) {
              openVerifyAttendanceModal(openEvtId);
            }
          } catch(e) {}
        });
      }

      if (clubId && typeof window.VolleySupabase.subscribeAttendanceRealtime === 'function') {
        window.VolleySupabase.subscribeAttendanceRealtime(clubId, (payload) => {
          console.log('[Supabase Realtime] Cambio en asistencia detectado:', payload.eventType);
          loadAttendanceFromSupabase({ silent: true, force: true });
        });
      }
    } catch (err) {
      console.error('[Supabase Attendance] Excepción al sincronizar:', err);
    } finally {
      isSupabaseAttendanceLoading = false;
    }
  }
  window.loadAttendanceFromSupabase = loadAttendanceFromSupabase;

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.VolleySupabase && window.VolleySupabase.getClient()) {
        loadEventsFromSupabase({ silent: true });
        loadAttendanceFromSupabase({ silent: true });
      }
    }, 800);
  });
})();
