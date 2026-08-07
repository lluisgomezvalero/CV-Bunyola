import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Error de configuración del servidor.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Buscar en public.profiles por username (case-insensitive) y active = true
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_email, active')
      .ilike('username', String(username).trim())
      .eq('active', true)
      .maybeSingle()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Obtener el email del usuario de auth.users o de profile.auth_email
    let authEmail = profile.auth_email
    if (!authEmail) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      authEmail = authUser?.user?.email ?? null
    }

    if (!authEmail) {
      return new Response(
        JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Autenticar con el email real y la contraseña introducida
    const { data: sessionData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: authEmail,
      password: password
    })

    if (authError || !sessionData?.session) {
      return new Response(
        JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        session: sessionData.session,
        user: sessionData.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
