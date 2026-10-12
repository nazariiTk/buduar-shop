ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sale_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sync_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY customers_authenticated_read
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ));

CREATE POLICY customers_admin_write
  ON public.customers
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ));

CREATE POLICY customer_sales_authenticated_read
  ON public.customer_sales
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ));

CREATE POLICY customer_sales_admin_write
  ON public.customer_sales
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ));

CREATE POLICY customer_sale_items_authenticated_read
  ON public.customer_sale_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ));

CREATE POLICY customer_sale_items_admin_write
  ON public.customer_sale_items
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE sync_admins.user_id = auth.uid()
  ));
