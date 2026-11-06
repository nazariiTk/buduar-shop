-- Оновлення check-констрейнтів для підтримки оплати через Monobank
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_type_check 
  CHECK (payment_type IN ('upon_receipt', 'card', 'monobank', 'card_online'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
