import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const NP_API_KEY = Deno.env.get('NP_API_KEY')

    if (!NP_API_KEY) {
      throw new Error('NP_API_KEY is not configured on the server')
    }

    // Add the API key to the request body
    const npRequestBody = {
      ...body,
      apiKey: NP_API_KEY
    }

    // Basic validation to prevent arbitrary Nova Poshta API calls (only allow city/branch searches)
    if (
      !['searchSettlements', 'getWarehouses'].includes(npRequestBody.calledMethod)
    ) {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(npRequestBody),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
