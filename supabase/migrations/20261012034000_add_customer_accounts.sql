ALTER TABLE public.customers
  ALTER COLUMN source_id DROP NOT NULL;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_idx
  ON public.customers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_self_access
  ON public.customers
  FOR ALL
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY orders_self_read
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY order_items_self_read
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.create_customer_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers
  SET auth_user_id = NEW.id,
      email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data ->> 'name', name),
      address = COALESCE(NEW.raw_user_meta_data ->> 'address', address)
  WHERE auth_user_id IS NULL
    AND phone IS NOT NULL
    AND phone = NEW.raw_user_meta_data ->> 'phone';

  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customers (
    auth_user_id, email, name, phone, address, is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'address',
    true
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_customer_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile();
