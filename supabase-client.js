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
    return supabaseClient.auth.signInWithPassword({
      email: usernameToEmail(username),
      password
    });
  }

  async function signOut() {
    const supabaseClient = getClient();
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }

  async function getProfile() {
    const supabaseClient = getClient();
    if (!supabaseClient) return { data: null, error: new Error('Supabase no inicializado') };
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) return { data: null, error: authError };
    return supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
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
    getProfile
  });

  document.addEventListener('DOMContentLoaded', initializeStatus, { once: true });
})();
