import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if the user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // You can optionally add a role check here if your admin uses a specific role
    // e.g., checking if user is an admin in a profiles table or JWT claim

    const { promptText } = await req.json()

    if (!promptText) {
      return new Response(JSON.stringify({ error: 'promptText is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured on the server')
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptText }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()

    // Pass rate limits headers back to client
    const headers = new Headers({
      ...corsHeaders,
      'Content-Type': 'application/json',
      'x-ratelimit-limit-requests': response.headers.get('x-ratelimit-limit-requests') || '',
      'x-ratelimit-remaining-requests': response.headers.get('x-ratelimit-remaining-requests') || '',
      'x-ratelimit-reset-requests': response.headers.get('x-ratelimit-reset-requests') || '',
      'x-ratelimit-limit-tokens': response.headers.get('x-ratelimit-limit-tokens') || '',
      'x-ratelimit-remaining-tokens': response.headers.get('x-ratelimit-remaining-tokens') || '',
      'x-ratelimit-reset-tokens': response.headers.get('x-ratelimit-reset-tokens') || '',
    })

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
