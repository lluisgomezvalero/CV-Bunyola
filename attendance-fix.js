(function () {
  'use strict';

  function install() {
    if (typeof window.isSamePlayerId !== 'function' || typeof window.confirmTrainingAttendance !== 'function' || typeof window.openVerifyAttendanceModal !== 'function' || typeof window.loadAttendanceFromSupabase !== 'function') {
      window.setTimeout(install, 120);
      return;
    }
    if (window.__attendanceSyncFixInstalled) return;
    window.__attendanceSyncFixInstalled = true;

    const originalIsSamePlayerId = window.isSamePlayerId;
    window.isSamePlayerId = function patchedIsSamePlayerId(idA, idB) {
      if (!idA || !idB) return false;
      const a = String(idA).trim();
      const b = String(idB).trim();
      if (a === b) return true;

      const players = (typeof appState !== 'undefined' && Array.isArray(appState.players)) ? appState.players : [];
      const aliasesFor = value => {
        const aliases = new Set([String(value)]);
        players.forEach(p => {
          const ids = [p.id, p.legacy_id, p.legacyId, p.profile_id, p.authId, p.supabaseId].filter(Boolean).map(String);
          if (ids.includes(String(value))) ids.forEach(x => aliases.add(x));
        });
        try {
          const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
          if (user) {
            const ids = [user.playerId, user.supabasePlayerId, user.authId, user.id].filter(Boolean).map(String);
            if (ids.includes(String(value))) ids.forEach(x => aliases.add(x));
          }
        } catch (_) {}
        return aliases;
      };

      const aa = aliasesFor(a);
      const bb = aliasesFor(b);
      for (const value of aa) if (bb.has(value)) return true;
      try { return originalIsSamePlayerId(idA, idB); } catch (_) { return false; }
    };

    // BLOQUEO DEL BUCLE: la implementación base intenta volver a abrir
    // "Pasar lista" al terminar cada carga de Supabase. Durante una hidratación
    // impedimos esa reapertura automática. El modal solo se abre por acción del usuario.
    const baseLoadAttendance = window.loadAttendanceFromSupabase;
    window.loadAttendanceFromSupabase = async function stableLoadAttendance() {
      if (window.__attendanceHydrating) return;
      window.__attendanceHydrating = true;
      try {
        return await baseLoadAttendance.apply(this, arguments);
      } finally {
        window.__attendanceHydrating = false;
      }
    };

    const originalOpenVerify = window.openVerifyAttendanceModal;
    window.openVerifyAttendanceModal = async function stableOpenVerifyAttendanceModal(eventId) {
      // Esta llamada puede venir del requestAnimationFrame interno de
      // loadAttendanceFromSupabase. En ese caso NO reabrimos el modal.
      if (window.__attendanceHydrating) return;

      try {
        await window.loadAttendanceFromSupabase({ silent: true, force: true });
      } catch (error) {
        console.warn('[AttendanceFix] No se pudo refrescar antes de pasar lista:', error);
      }
      return originalOpenVerify.call(this, eventId);
    };

    const originalConfirm = window.confirmTrainingAttendance;
    window.confirmTrainingAttendance = async function patchedConfirmTrainingAttendance(eventId, status, btnElement) {
      const result = await originalConfirm.call(this, eventId, status, btnElement);
      try {
        await window.loadAttendanceFromSupabase({ silent: true, force: true });
      } catch (error) {
        console.warn('[AttendanceFix] No se pudo refrescar asistencia tras responder:', error);
      }
      try { if (typeof renderHomeDashboard === 'function') renderHomeDashboard(); } catch (_) {}
      try { if (typeof renderHomePortalRSVP === 'function') renderHomePortalRSVP(); } catch (_) {}
      try { if (typeof renderTraining === 'function') renderTraining(); } catch (_) {}
      try {
        if (typeof activeSessionId !== 'undefined' && activeSessionId === eventId && typeof renderSessionCenterDetail === 'function') renderSessionCenterDetail();
      } catch (_) {}
      return result;
    };

    console.info('[AttendanceFix] IDs sincronizados y bucle de Pasar lista desactivado.');
  }

  install();
})();
