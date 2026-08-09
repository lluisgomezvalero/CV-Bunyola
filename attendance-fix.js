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
      const aa = aliasesFor(a), bb = aliasesFor(b);
      for (const value of aa) if (bb.has(value)) return true;
      try { return originalIsSamePlayerId(idA, idB); } catch (_) { return false; }
    };

    // La función base openVerifyAttendanceModal dispara una carga asíncrona de Supabase
    // sin esperarla. Para evitar datos viejos y el bucle de reapertura, hacemos UNA carga
    // primero y, mientras pintamos el modal, bloqueamos únicamente la recarga interna.
    const baseLoadAttendance = window.loadAttendanceFromSupabase;
    window.loadAttendanceFromSupabase = async function stableLoadAttendance() {
      if (window.__attendanceSkipNestedLoad) return null;
      return await baseLoadAttendance.apply(this, arguments);
    };

    const originalOpenVerify = window.openVerifyAttendanceModal;
    window.openVerifyAttendanceModal = async function stableOpenVerifyAttendanceModal(eventId) {
      if (window.__attendanceOpeningModal) return;
      window.__attendanceOpeningModal = true;
      try {
        await baseLoadAttendance.call(this, { silent: true, force: true });
        window.__attendanceSkipNestedLoad = true;
        return originalOpenVerify.call(this, eventId);
      } catch (error) {
        console.warn('[AttendanceFix] No se pudo refrescar antes de pasar lista:', error);
        window.__attendanceSkipNestedLoad = true;
        return originalOpenVerify.call(this, eventId);
      } finally {
        window.__attendanceSkipNestedLoad = false;
        window.__attendanceOpeningModal = false;
      }
    };

    // Cancelar debe cerrar de verdad el modal y anular cualquier reapertura pendiente.
    document.addEventListener('click', function (e) {
      const modal = document.getElementById('modal-verify-attendance');
      if (!modal?.classList.contains('active')) return;
      const btn = e.target?.closest?.('button');
      if (!btn) return;
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text.includes('cancelar') || text.includes('cerrar')) {
        window.__attendanceOpeningModal = true;
        modal.classList.remove('active');
        window.setTimeout(() => { window.__attendanceOpeningModal = false; }, 250);
      }
    }, true);

    const originalConfirm = window.confirmTrainingAttendance;
    window.confirmTrainingAttendance = async function patchedConfirmTrainingAttendance(eventId, status, btnElement) {
      const result = await originalConfirm.call(this, eventId, status, btnElement);
      try { await baseLoadAttendance.call(this, { silent: true, force: true }); } catch (error) {
        console.warn('[AttendanceFix] No se pudo refrescar asistencia tras responder:', error);
      }
      try { if (typeof renderHomeDashboard === 'function') renderHomeDashboard(); } catch (_) {}
      try { if (typeof renderHomePortalRSVP === 'function') renderHomePortalRSVP(); } catch (_) {}
      try { if (typeof renderTraining === 'function') renderTraining(); } catch (_) {}
      try { if (typeof activeSessionId !== 'undefined' && activeSessionId === eventId && typeof renderSessionCenterDetail === 'function') renderSessionCenterDetail(); } catch (_) {}
      return result;
    };

    console.info('[AttendanceFix] Modal de pasar lista estabilizado.');
  }
  install();
})();
