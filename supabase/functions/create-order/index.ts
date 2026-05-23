import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Використовуємо service_role для запису
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Рахуємо суму на сервері (не довіряємо фронтенду)
    const subtotal = body.items.reduce(
      (sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 
      0
    )

    // Зберігаємо замовлення
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        first_name:       body.first_name,
        last_name:        body.last_name,
        phone:            body.phone,
        email:            body.email,
        delivery_type:    body.delivery_type,
        payment_type:     body.payment_type,
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
      })
      .select('id, order_number')
      .single()

    if (orderError) throw orderError

    // Зберігаємо товари
    const orderItems = body.items.map((item: any) => ({
      order_id:     order.id,
      article_id:   item.id || null,
      group_id:     item.group_id || null,
      product_name: item.name,
      product_slug: item.slug || null,
      color:        item.color || null,
      size:         item.size || null,
      image_url:    item.image || null,
      price:        Number(item.price),
      quantity:     Number(item.quantity),
      total:        Number(item.price) * Number(item.quantity),
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Відправляємо email (викликаємо існуючу функцію)
    await supabase.functions.invoke('send-order-email', {
      body: { order_id: order.id }
    })

    return new Response(
      JSON.stringify({ success: true, order_number: order.order_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Order error:', err)
    return new Response(
      JSON.stringify({ error: 'Помилка сервера' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
