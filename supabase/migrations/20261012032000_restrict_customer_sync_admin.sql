CREATE TABLE IF NOT EXISTS public.sync_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_admins_self_read
  ON public.sync_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS customers_authenticated_read ON public.customers;
DROP POLICY IF EXISTS customers_admin_write ON public.customers;
DROP POLICY IF EXISTS customer_sales_authenticated_read ON public.customer_sales;
DROP POLICY IF EXISTS customer_sales_admin_write ON public.customer_sales;
DROP POLICY IF EXISTS customer_sale_items_authenticated_read ON public.customer_sale_items;
DROP POLICY IF EXISTS customer_sale_items_admin_write ON public.customer_sale_items;

CREATE POLICY customers_admin_access
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

CREATE POLICY customer_sales_admin_access
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

CREATE POLICY customer_sale_items_admin_access
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
