import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
import { createVerify } from 'node:crypto'

const MONO_API = 'https://api.monobank.ua'

let cachedPubKey: string | null = null

async function getPubKey(token: string): Promise<string> {
  if (cachedPubKey) return cachedPubKey
  const resp = await fetch(`${MONO_API}/api/merchant/pubkey`, {
    headers: { 'X-Token': token }
  })
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`Failed to fetch Monobank pubkey: ${resp.status} ${errText}`)
  }
  const data = await resp.json()
  cachedPubKey = data.key
  return cachedPubKey!
}

async function verifySignature(rawBody: Uint8Array, xSignB64: string, token: string): Promise<boolean> {
  try {
    const pubKeyB64 = await getPubKey(token)
    const pemStr = Buffer.from(pubKeyB64, 'base64').toString('utf-8')
    const signature = Buffer.from(xSignB64, 'base64')

    const verify = createVerify('SHA256')
    verify.update(rawBody)
    const isValid = verify.verify(pemStr, signature)

    if (!isValid) {
      // Якщо перевірка не вдалась, можливо змінився публічний ключ — пробуємо оновити кеш 1 раз
      cachedPubKey = null
      const freshPubKeyB64 = await getPubKey(token)
      const freshPemStr = Buffer.from(freshPubKeyB64, 'base64').toString('utf-8')
      const retryVerify = createVerify('SHA256')
      retryVerify.update(rawBody)
      return retryVerify.verify(freshPemStr, signature)
    }

    return true
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const token = Deno.env.get('MONOBANK_TOKEN')
  if (!token) {
    console.error('MONOBANK_TOKEN is not configured')
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 })
  }

  const xSign = req.headers.get('X-Sign')
  if (!xSign) {
    console.warn('Missing X-Sign header')
    return new Response(JSON.stringify({ error: 'Missing X-Sign header' }), { status: 400 })
  }

  const rawBody = new Uint8Array(await req.arrayBuffer())
  const isValid = await verifySignature(rawBody, xSign, token)

  if (!isValid) {
    console.error('Invalid Monobank signature')
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403 })
  }

  let payload: any
  try {
    const text = new TextDecoder().decode(rawBody)
    payload = JSON.parse(text)
  } catch (err) {
    console.error('Failed to parse webhook JSON:', err)
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  console.log('Received valid Monobank webhook:', JSON.stringify(payload))

  const invoiceId = payload.invoiceId
  const status = payload.status
  const reference = payload.reference // Наш order_number або id замовлення

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Шукаємо замовлення за payment_invoice_id або за reference (order_number)
    let query = supabase.from('orders').select('id, order_number, payment_status, status')

    if (invoiceId) {
      query = query.or(`payment_invoice_id.eq.${invoiceId},order_number.eq.${reference}`)
    } else if (reference) {
      query = query.eq('order_number', reference)
    }

    const { data: orders, error: findError } = await query
    if (findError) throw findError

    if (!orders || orders.length === 0) {
      console.warn(`Order not found for invoice ${invoiceId} and reference ${reference}`)
      // Повертаємо 200 щоб Monobank не повторював запит нескінченно
      return new Response(JSON.stringify({ received: true, note: 'Order not found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const order = orders[0]

    let newPaymentStatus = order.payment_status
    let newOrderStatus = order.status

    if (status === 'success') {
      newPaymentStatus = 'paid'
      if (order.status === 'new') {
        newOrderStatus = 'confirmed' // або processing
      }
    } else if (status === 'failure') {
      newPaymentStatus = 'failed'
    } else if (status === 'reversed') {
      newPaymentStatus = 'refunded'
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        payment_invoice_id: invoiceId || order.payment_invoice_id,
        payment_details: payload,
        confirmed_at: status === 'success' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) throw updateError

    console.log(`Updated order ${order.order_number}: payment_status=${newPaymentStatus}, status=${newOrderStatus}`)

    return new Response(JSON.stringify({ status: 'ok', order_number: order.order_number }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Error processing order update:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
