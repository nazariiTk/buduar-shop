import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONO_API = 'https://api.monobank.ua'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Валідація обов'язкових полів
    const required = ['first_name', 'last_name', 'phone', 'email', 'delivery_type', 'payment_type', 'items']
    for (const field of required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Поле ${field} обов'язкове` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Валідація телефону
    if (body.phone.replace(/\D/g, '').length < 10) {
      return new Response(
        JSON.stringify({ error: 'Невірний номер телефону' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Валідація товарів
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Кошик порожній' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authorization = req.headers.get('Authorization')
    let userId: string | null = null
    if (authorization?.startsWith('Bearer ')) {
      const { data: userData } = await supabase.auth.getUser(
        authorization.slice('Bearer '.length)
      )
      userId = userData.user?.id || null
    }

    // Валідація цін та наявності зі сторони сервера
    const articleIds = body.items.map((i: any) => i.id)
    
    const { data: dbItems, error: dbError } = await supabase
      .from('product_view')
      .select('article_id, price, quantity')
      .in('article_id', articleIds)

    if (dbError) throw dbError

    // Агрегуємо дані бази
    const stockMap = new Map<number, { price: number, total_quantity: number }>()
    if (dbItems) {
      for (const row of dbItems) {
        const id = row.article_id
        if (!stockMap.has(id)) {
          stockMap.set(id, { price: Number(row.price), total_quantity: 0 })
        }
        const current = stockMap.get(id)!
        current.total_quantity += (Number(row.quantity) || 0)
      }
    }

    // Перевіряємо кожен товар у кошику і рахуємо суму
    let subtotal = 0
    const validatedOrderItems = []
    const monoBasketOrder = []

    for (const item of body.items) {
      const articleId = item.id
      const reqQty = Number(item.quantity)
      
      const dbInfo = stockMap.get(articleId)

      if (!dbInfo) {
        return new Response(
          JSON.stringify({ error: `Товар "${item.name}" не знайдено в базі.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (dbInfo.total_quantity < reqQty) {
        return new Response(
          JSON.stringify({ error: `Недостатньо на складі: "${item.name}". Доступно: ${dbInfo.total_quantity}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const itemTotal = dbInfo.price * reqQty
      subtotal += itemTotal

      validatedOrderItems.push({
        article_id:   articleId,
        product_name: item.name,
        product_slug: item.slug || null,
        color:        item.color || null,
        size:         item.size || null,
        image_url:    item.image || null,
        price:        dbInfo.price, // Беремо ціну з БД!
        quantity:     reqQty,
        total:        itemTotal,
      })

      monoBasketOrder.push({
        name: `${item.name}${item.size ? ' (' + item.size + ')' : ''}`,
        qty: reqQty,
        sum: Math.round(dbInfo.price * 100), // ціна в копійках
        unit: 'шт.',
        code: String(articleId),
      })
    }

    // 1. Зберігаємо замовлення в БД
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        first_name:       body.first_name,
        last_name:        body.last_name,
        phone:            body.phone,
        email:            body.email,
        delivery_type:    body.delivery_type,
        payment_type:     body.payment_type,
        payment_status:   'pending',
        comment:          body.comment || null,
        city:             body.city || null,
        city_ref:         body.city_ref || null,
        branch:           body.branch || null,
        branch_ref:       body.branch_ref || null,
        courier_address:  body.courier_address || null,
        pickup_shop_id:   body.pickup_shop_id || null,
        pickup_shop_name: body.pickup_shop_name || null,
        subtotal:         subtotal,
        total:            subtotal,
        user_agent:       body.user_agent || null,
        referrer:         body.referrer || null,
        user_id:          userId,
      })
      .select('id, order_number')
      .single()

    if (orderError) throw orderError

    // 2. Прив'язуємо товари до замовлення
    const itemsToInsert = validatedOrderItems.map(i => ({ ...i, order_id: order.id }))
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // 3. Якщо обрано оплату карткою онлайн через Monobank
    let paymentUrl: string | null = null
    let invoiceId: string | null = null

    if (body.payment_type === 'monobank' || body.payment_type === 'card_online') {
      const monoToken = Deno.env.get('MONOBANK_TOKEN')
      if (monoToken) {
        try {
          const webhookUrl = `${supabaseUrl}/functions/v1/monobank-webhook`
          const clientOrigin = body.origin || 'https://buduar.pp.ua'
          const redirectUrl = `${clientOrigin}/checkout?order=${order.order_number}&status=success`

          const monoPayload = {
            amount: Math.round(subtotal * 100), // сума в копійках
            ccy: 980, // UAH
            merchantPaymInfo: {
              reference: order.order_number,
              destination: `Оплата замовлення ${order.order_number} у бутику «Будуар»`,
              basketOrder: monoBasketOrder,
            },
            redirectUrl: redirectUrl,
            webHookUrl: webhookUrl,
            validity: 3600, // 1 година
            paymentType: 'debit',
          }

          console.log(`Creating Monobank invoice for ${order.order_number}:`, JSON.stringify(monoPayload))

          const monoResp = await fetch(`${MONO_API}/api/merchant/invoice/create`, {
            method: 'POST',
            headers: {
              'X-Token': monoToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(monoPayload),
          })

          const monoData = await monoResp.json()

          if (!monoResp.ok) {
            console.error('Monobank invoice creation failed:', monoData)
          } else if (monoData.invoiceId && monoData.pageUrl) {
            invoiceId = monoData.invoiceId
            paymentUrl = monoData.pageUrl

            // Записуємо invoiceId в замовлення
            await supabase
              .from('orders')
              .update({ payment_invoice_id: invoiceId })
              .eq('id', order.id)
          }
        } catch (monoErr) {
          console.error('Error contacting Monobank API:', monoErr)
        }
      }
    }

    // 4. Відправляємо email-сповіщення
    try {
      await supabase.functions.invoke('send-order-email', {
        body: { order_id: order.id }
      })
    } catch (e) {
      console.warn('Could not trigger order email:', e)
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        payment_url: paymentUrl,
        invoice_id: invoiceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Order error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Помилка сервера' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
