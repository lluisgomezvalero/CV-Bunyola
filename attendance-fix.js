(function () {
  'use strict';

  // Corrección aislada de sincronización de confirmaciones de asistencia.
  // El problema original era que appState usa IDs locales (p1, p2, ...)
  // mientras Supabase devuelve UUIDs. Los jugadores locales ya guardan
  // supabaseId, pero isSamePlayerId no lo tenía en cuenta.

  function install() {
    if (typeof window.isSamePlayerId !== 'function' || typeof window.confirmTrainingAttendance !== 'function' || typeof window.openVerifyAttendanceModal !== 'function') {
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

    const originalConfirm = window.confirmTrainingAttendance;
    window.confirmTrainingAttendance = async function patchedConfirmTrainingAttendance(eventId, status, btnElement) {
      const result = await originalConfirm.call(this, eventId, status, btnElement);

      // Después del guardado, recargar desde Supabase y volver a renderizar.
      // Así el estado visual no depende del registro local temporal.
      try {
        if (typeof window.loadAttendanceFromSupabase === 'function') {
          await window.loadAttendanceFromSupabase({ silent: true, force: true });
        }
      } catch (error) {
        console.warn('[AttendanceFix] No se pudo refrescar asistencia tras responder:', error);
      }

      try { if (typeof renderHomeDashboard === 'function') renderHomeDashboard(); } catch (_) {}
      try { if (typeof renderHomePortalRSVP === 'function') renderHomePortalRSVP(); } catch (_) {}
      try { if (typeof renderTraining === 'function') renderTraining(); } catch (_) {}
      try {
        if (typeof activeSessionId !== 'undefined' && activeSessionId === eventId && typeof renderSessionCenterDetail === 'function') {
          renderSessionCenterDetail();
        }
      } catch (_) {}

      return result;
    };

    const originalOpenVerify = window.openVerifyAttendanceModal;
    window.openVerifyAttendanceModal = async function patchedOpenVerifyAttendanceModal(eventId) {
      // El modal anterior disparaba la carga de Supabase pero renderizaba antes de
      // que terminara. Ahora esperamos a tener las confirmaciones reales.
      try {
        if (typeof window.loadAttendanceFromSupabase === 'function') {
          await window.loadAttendanceFromSupabase({ silent: true, force: true });
        }
      } catch (error) {
        console.warn('[AttendanceFix] No se pudo refrescar antes de pasar lista:', error);
      }
      return originalOpenVerify.call(this, eventId);
    };

    console.info('[AttendanceFix] Corrección de IDs y sincronización de asistencia activada.');
  }

  install();
})();
