(function () {
  'use strict';

  const config = window.VOLLEY_SUPABASE_CONFIG || {};
  let client = null;

  function initialize() {
    if (!config.enabled) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[Supabase] La librería no está disponible.');
      return null;
    }
    if (!config.url || !config.publishableKey) {
      console.warn('[Supabase] Faltan URL o publishable key.');
      return null;
    }

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  function getClient() {
    return client || initialize();
  }

  async function healthcheck() {
    const supabaseClient = getClient();
    if (!supabaseClient) {
      return { ok: false, status: 'client-error', message: 'Cliente Supabase no disponible' };
    }

    try {
      const { data, error } = await supabaseClient.rpc('volleycoach_healthcheck');
      if (error) {
        return {
          ok: false,
          status: error.code === 'PGRST202' ? 'schema-missing' : 'database-error',
          message: error.code === 'PGRST202'
            ? 'Conexión correcta; falta ejecutar el esquema SQL'
            : error.message,
          error
        };
      }
      return { ok: true, status: 'ready', message: String(data || 'Supabase conectado') };
    } catch (error) {
      return { ok: false, status: 'network-error', message: 'No se pudo conectar con Supabase', error };
    }
  }

  function usernameToEmail(username) {
    const clean = String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `${clean}@${config.usernameDomain || 'cvbunyola.app'}`;
  }

  async function signInWithUsername(username, password) {
    const supabaseClient = getClient();
    if (!supabaseClient) throw new Error('Supabase no está inicializado.');

    const cleanUsername = String(username || '').trim();
    if (!cleanUsername) {
      return { data: null, error: new Error('Por favor, introduce tu usuario.') };
    }

    let emailToUse = null;

    // 1. Buscar en la tabla profiles el registro cuyo username coincida
    try {
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('auth_email, username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (profileData && profileData.auth_email) {
        emailToUse = profileData.auth_email;
      }
    } catch (e) {
      console.warn('[Supabase] Error consultando profiles:', e);
    }

    // 2. Fallback via RPC por si RLS limita la consulta anon a la tabla profiles
    if (!emailToUse) {
      try {
        const { data: rpcData } = await supabaseClient.rpc('get_auth_email_by_username', { p_username: cleanUsername });
        if (rpcData) {
          emailToUse = rpcData;
        }
      } catch (e) {
        // ignora fallback rpc
      }
    }

    // 3. Fallback si el usuario introdujo un correo completo directamente (ej. admin@club.es)
    if (!emailToUse && cleanUsername.includes('@')) {
      emailToUse = cleanUsername;
    }

    // 4. Fallback para usuarios existentes creados con el dominio por defecto (ej. username@cvbunyola.app)
    if (!emailToUse) {
      const cleanSimple = cleanUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      const defaultDomain = config.usernameDomain || 'cvbunyola.app';
      emailToUse = `${cleanSimple}@${defaultDomain}`;
    }

    if (!emailToUse) {
      return {
        data: null,
        error: new Error('Usuario o contraseña incorrectos.')
      };
    }

    // 4. Realizar signInWithPassword utilizando el correo real obtenido y la contraseña introducida
    const authResult = await supabaseClient.auth.signInWithPassword({
      email: emailToUse,
      password: password
    });

    if (authResult.error) {
      return {
        data: null,
        error: new Error('Usuario o contraseña incorrectos.')
      };
    }

    return authResult;
  }

  async function signOut() {
    const supabaseClient = getClient();
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }

  async function getSession() {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: { session: null }, error: new Error('Supabase no inicializado') };
    return supabaseClient.auth.getSession();
  }

  async function getProfile() {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: null, error: new Error('Supabase no inicializado') };
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) return { data: null, error: authError || new Error('No hay una sesión activa') };
    return supabaseClient
      .from('profiles')
      .select('id, club_id, username, full_name, role, avatar_path, active, last_login_at')
      .eq('id', authData.user.id)
      .single();
  }

  async function getIdentity() {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: null, error: new Error('Supabase no inicializado') };
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) return { data: null, error: authError || new Error('No hay una sesión activa') };

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, club_id, username, full_name, role, avatar_path, active, last_login_at, preferred_language')
      .eq('id', authData.user.id)
      .single();
    if (profileError) return { data: null, error: profileError };

    let player = null;
    let teams = [];

    if (profile.role === 'player') {
      const playerResult = await supabaseClient
        .from('players')
        .select('id, legacy_id, club_id, team_id, dorsal, birth_date, position, status, private_data, active, teams:team_id(id, name, category, active)')
        .eq('profile_id', authData.user.id)
        .maybeSingle();
      if (playerResult.error) return { data: null, error: playerResult.error };
      player = playerResult.data || null;
      if (player?.teams) teams = [player.teams];
    } else if (profile.role === 'coach') {
      const staffResult = await supabaseClient
        .from('team_staff')
        .select('teams:team_id(id, name, category, active)')
        .eq('profile_id', authData.user.id);
      if (staffResult.error) return { data: null, error: staffResult.error };
      teams = (staffResult.data || []).map(row => row.teams).filter(Boolean);
    } else if (profile.role === 'administrator' && profile.club_id) {
      const teamsResult = await supabaseClient
        .from('teams')
        .select('id, name, category, active')
        .eq('club_id', profile.club_id)
        .eq('active', true)
        .order('name');
      if (teamsResult.error) return { data: null, error: teamsResult.error };
      teams = teamsResult.data || [];
    }

    return { data: { authUser: authData.user, profile, player, teams }, error: null };
  }

  async function updateOwnProfile(changes) {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: null, error: new Error('Supabase no inicializado') };
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) return { data: null, error: authError || new Error('No hay una sesión activa') };

    const allowed = {};
    if (typeof changes?.full_name === 'string') allowed.full_name = changes.full_name.trim();
    if (typeof changes?.avatar_path === 'string' || changes?.avatar_path === null) allowed.avatar_path = changes.avatar_path;
    if (['es', 'ca'].includes(changes?.preferred_language)) allowed.preferred_language = changes.preferred_language;
    if (!Object.keys(allowed).length) return { data: null, error: new Error('No hay cambios válidos') };

    return supabaseClient
      .from('profiles')
      .update(allowed)
      .eq('id', authData.user.id)
      .select('id, club_id, username, full_name, role, avatar_path, active, last_login_at, preferred_language')
      .single();
  }

  async function updateOwnPlayer(changes) {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: null, error: new Error('Supabase no inicializado') };
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) return { data: null, error: authError || new Error('No hay una sesión activa') };

    const allowed = {};
    if (Number.isInteger(Number(changes?.dorsal))) allowed.dorsal = Number(changes.dorsal);
    if (typeof changes?.birth_date === 'string' || changes?.birth_date === null) allowed.birth_date = changes.birth_date || null;
    if (typeof changes?.position === 'string') allowed.position = changes.position.trim();
    if (!Object.keys(allowed).length) return { data: null, error: new Error('No hay cambios válidos') };

    return supabaseClient
      .from('players')
      .update(allowed)
      .eq('profile_id', authData.user.id)
      .select('id, legacy_id, team_id, dorsal, birth_date, position, status, active')
      .single();
  }

  async function touchLastLogin() {
    const supabaseClient = getClient();
    if (!supabaseClient) return;
    const { data } = await supabaseClient.auth.getUser();
    if (!data?.user) return;
    await supabaseClient
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  async function updatePassword(newPassword) {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: null, error: new Error('Supabase no inicializado') };
    return supabaseClient.auth.updateUser({ password: newPassword });
  }

  function paintConnectionStatus(result) {
    const el = document.getElementById('supabase-connection-status');
    if (!el) return;
    el.dataset.state = result.ok ? 'ready' : result.status;
    el.innerHTML = `<span class="supabase-status-dot" aria-hidden="true"></span><span>${escapeHtml(result.message)}</span>`;
    el.title = result.ok
      ? 'El proyecto Supabase y el esquema están disponibles.'
      : 'Consulta SUPABASE_PASO_1.md para completar la configuración.';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function initializeStatus() {
    const result = await healthcheck();
    paintConnectionStatus(result);
    window.dispatchEvent(new CustomEvent('volley:supabase-status', { detail: result }));
    return result;
  }

  window.VolleySupabase = Object.freeze({
    config,
    getClient,
    healthcheck,
    initializeStatus,
    usernameToEmail,
    signInWithUsername,
    signOut,
    getSession,
    getProfile,
    getIdentity,
    updateOwnProfile,
    updateOwnPlayer,
    touchLastLogin,
    updatePassword
  });

  document.addEventListener('DOMContentLoaded', initializeStatus, { once: true });
})();
