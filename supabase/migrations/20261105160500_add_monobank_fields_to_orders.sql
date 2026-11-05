-- Додаємо стовпці для зберігання інформації про Monobank інвойс та оплату
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_invoice_id text,
ADD COLUMN IF NOT EXISTS payment_details jsonb;

CREATE INDEX IF NOT EXISTS orders_payment_invoice_id_idx ON public.orders (payment_invoice_id);
