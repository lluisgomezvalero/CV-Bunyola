(function () {
  'use strict';

  // Sincronización aislada del Plan de Juego con Supabase.
  // Mantiene la UI/localStorage existente y usa Supabase como fuente compartida
  // para publicaciones y confirmaciones de lectura entre dispositivos.

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let readsChannel = null;
  let refreshInFlight = false;
  let lastHydratedPlanId = null;

  function getClient() {
    return window.VolleySupabase?.getClient?.() || null;
  }

  function currentRecord() {
    try {
      return typeof getActiveScoutingRecord === 'function' ? getActiveScoutingRecord() : null;
    } catch (_) {
      return null;
    }
  }

  function publicationVersion(record) {
    try {
      if (typeof getPlanPublicationVersion === 'function') return getPlanPublicationVersion(record);
    } catch (_) {}
    return record?.publicationVersion || record?.publishedAt || null;
  }

  async function resolveEventUuid(eventId) {
    const client = getClient();
    if (!client || !eventId) return null;
    if (UUID_RE.test(String(eventId))) return String(eventId);

    const { data, error } = await client
      .from('events')
      .select('id')
      .eq('legacy_id', String(eventId))
      .maybeSingle();

    if (error) {
      console.warn('[GamePlanSync] No se pudo resolver el evento:', error);
      return null;
    }
    return data?.id || null;
  }

  async function getLatestPlan(eventId) {
    const client = getClient();
    if (!client) return null;
    const eventUuid = await resolveEventUuid(eventId);
    if (!eventUuid) return null;

    const { data, error } = await client
      .from('game_plans')
      .select('id,event_id,club_id,team_id,version,status,payload,published_at,created_by,created_at,updated_at')
      .eq('event_id', eventUuid)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GamePlanSync] Error al cargar el plan publicado:', error);
      return null;
    }
    return data || null;
  }

  async function syncPublishedPlan(record) {
    const client = getClient();
    if (!client || !record || record.status !== 'published' || !record.publishedPlan) return null;
    if (typeof isCoachUser === 'function' && !isCoachUser()) return getLatestPlan(window.activeScoutingMatchId || (typeof activeScoutingMatchId !== 'undefined' ? activeScoutingMatchId : null));

    const eventId = (typeof activeScoutingMatchId !== 'undefined' ? activeScoutingMatchId : null);
    const eventUuid = await resolveEventUuid(eventId);
    if (!eventUuid) return null;

    const versionKey = publicationVersion(record);
    const latest = await getLatestPlan(eventUuid);
    if (latest?.payload?.publicationVersion === versionKey) return latest;

    const identityResult = await window.VolleySupabase?.getIdentity?.();
    const identity = identityResult?.data;
    if (!identity?.profile?.id || !identity.profile.club_id) return latest;

    let teamId = null;
    try {
      const evt = (typeof appState !== 'undefined' && Array.isArray(appState.events))
        ? appState.events.find(e => String(e.id) === String(eventId) || String(e.legacyId || e.legacy_id || '') === String(eventId))
        : null;
      teamId = evt?.teamId || evt?.team_id || identity.teams?.[0]?.id || null;
    } catch (_) {
      teamId = identity.teams?.[0]?.id || null;
    }

    const nextVersion = Math.max(1, Number(latest?.version || 0) + 1);
    const payload = {
      plan: record.publishedPlan,
      publicationVersion: versionKey,
      localPublishedAt: record.publishedAt || null
    };

    const { data, error } = await client
      .from('game_plans')
      .insert({
        event_id: eventUuid,
        club_id: identity.profile.club_id,
        team_id: teamId,
        version: nextVersion,
        status: 'published',
        payload,
        published_at: record.publishedAt || new Date().toISOString(),
        created_by: identity.profile.id
      })
      .select('id,event_id,version,status,payload,published_at')
      .single();

    if (error) {
      console.warn('[GamePlanSync] No se pudo sincronizar la publicación:', error);
      return latest;
    }

    console.info('[GamePlanSync] Plan publicado sincronizado con Supabase.');
    return data;
  }

  async function currentPlayerUuid() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user?.supabasePlayerId && UUID_RE.test(String(user.supabasePlayerId))) return user.supabasePlayerId;

    const identityResult = await window.VolleySupabase?.getIdentity?.();
    return identityResult?.data?.player?.id || null;
  }

  async function recordRead(record) {
    const client = getClient();
    if (!client || !record || record.status !== 'published') return;

    const eventId = (typeof activeScoutingMatchId !== 'undefined' ? activeScoutingMatchId : null);
    const plan = await getLatestPlan(eventId);
    if (!plan?.id) {
      console.warn('[GamePlanSync] No existe aún una publicación Supabase para este plan. El entrenador debe abrir o volver a publicar el plan una vez.');
      return;
    }

    const playerId = await currentPlayerUuid();
    if (!playerId) return;

    const { error } = await client
      .from('game_plan_reads')
      .insert({ game_plan_id: plan.id, player_id: playerId, read_at: new Date().toISOString() });

    // La PK (game_plan_id, player_id) hace la lectura idempotente. Una segunda
    // apertura desde otro dispositivo puede devolver 23505 y no es un fallo.
    if (error && error.code !== '23505') {
      console.warn('[GamePlanSync] No se pudo registrar la lectura:', error);
      return;
    }

    if (!error) console.info('[GamePlanSync] Lectura del plan registrada en Supabase.');
  }

  async function hydrateReadReceipts(record, rerender) {
    if (refreshInFlight || !record || record.status !== 'published') return;
    if (typeof isCoachUser === 'function' && !isCoachUser()) return;

    const client = getClient();
    if (!client) return;
    refreshInFlight = true;

    try {
      const plan = await syncPublishedPlan(record);
      if (!plan?.id) return;

      const { data, error } = await client
        .from('game_plan_reads')
        .select('player_id,read_at,players(id,legacy_id,profile_id)')
        .eq('game_plan_id', plan.id)
        .order('read_at', { ascending: true });

      if (error) {
        console.warn('[GamePlanSync] No se pudieron cargar las lecturas:', error);
        return;
      }

      const version = publicationVersion(record);
      const receipts = {};
      for (const row of (data || [])) {
        const localKey = row.players?.legacy_id || row.player_id;
        receipts[localKey] = { version, viewedAt: row.read_at };
      }

      const oldSerialized = JSON.stringify(record.readReceipts || {});
      const newSerialized = JSON.stringify(receipts);
      record.readReceipts = receipts;

      try {
        if (typeof appState !== 'undefined' && appState.matchScouting && typeof activeScoutingMatchId !== 'undefined') {
          appState.matchScouting[activeScoutingMatchId] = record;
        }
      } catch (_) {}

      lastHydratedPlanId = plan.id;
      if (oldSerialized !== newSerialized && typeof rerender === 'function') rerender();
    } finally {
      refreshInFlight = false;
    }
  }

  function subscribeReads() {
    const client = getClient();
    if (!client || readsChannel) return;

    readsChannel = client
      .channel('game-plan-reads-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_plan_reads' }, async payload => {
        if (!payload?.new?.game_plan_id) return;
        if (lastHydratedPlanId && payload.new.game_plan_id !== lastHydratedPlanId) return;
        const record = currentRecord();
        if (!record) return;
        const baseRender = window.__gamePlanSyncBaseRenderTactics;
        await hydrateReadReceipts(record, () => {
          if (typeof baseRender === 'function') baseRender();
        });
      })
      .subscribe();
  }

  function install() {
    if (!window.VolleySupabase || typeof window.renderTactics !== 'function') {
      window.setTimeout(install, 120);
      return;
    }
    if (window.__gamePlanSyncInstalled) return;
    window.__gamePlanSyncInstalled = true;

    const baseMarkRead = window.markCurrentPlayerPlanRead;
    window.markCurrentPlayerPlanRead = function syncedMarkCurrentPlayerPlanRead(record) {
      try { if (typeof baseMarkRead === 'function') baseMarkRead(record); } catch (error) { console.warn(error); }
      void recordRead(record);
    };

    const basePublish = window.publishScoutingPlan;
    if (typeof basePublish === 'function') {
      window.publishScoutingPlan = function syncedPublishScoutingPlan() {
        const result = basePublish.apply(this, arguments);
        window.setTimeout(() => {
          const record = currentRecord();
          void syncPublishedPlan(record).then(() => hydrateReadReceipts(record, () => {
            if (typeof window.__gamePlanSyncBaseRenderTactics === 'function') window.__gamePlanSyncBaseRenderTactics();
          }));
        }, 0);
        return result;
      };
    }

    const baseRenderTactics = window.renderTactics;
    window.__gamePlanSyncBaseRenderTactics = baseRenderTactics;
    window.renderTactics = function syncedRenderTactics() {
      const result = baseRenderTactics.apply(this, arguments);
      const record = currentRecord();
      if (record?.status === 'published' && typeof isCoachUser === 'function' && isCoachUser()) {
        void hydrateReadReceipts(record, () => baseRenderTactics());
        subscribeReads();
      }
      return result;
    };

    // Si el plan ya estaba abierto cuando cargó este módulo, sincronizarlo.
    try {
      const record = currentRecord();
      if (record?.status === 'published' && typeof isCoachUser === 'function' && isCoachUser()) {
        void hydrateReadReceipts(record, () => baseRenderTactics());
        subscribeReads();
      }
    } catch (_) {}

    console.info('[GamePlanSync] Sincronización del Plan de Juego activada.');
  }

  install();
})();
