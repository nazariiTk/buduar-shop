-- ============================================================================
-- Комплексне зміцнення безпеки БД (RLS та SECURITY DEFINER RPC)
-- ============================================================================

-- 1. Додаємо другий власній адмін-акаунт у sync_admins (якщо ще не доданий)
INSERT INTO public.sync_admins (user_id)
SELECT id FROM auth.users WHERE email IN ('tkachyshyn1@gmail.com', 'tkachyshynn@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- 2. Переконуємось, що функція перевірки адміна безпечна і швидка
CREATE OR REPLACE FUNCTION public.is_sync_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sync_admins
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_sync_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sync_admin() TO authenticated;

-- 3. Вмикаємо RLS на всіх таблицях, де він був вимкнений
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Базові таблиці синхронізації 1С та довідники магазинів (читання: всім, зміна: тільки адмінам)
-- (Сервісна роль service_role обходить RLS автоматично під час синхронізації 1С)

DROP POLICY IF EXISTS public_read_articles ON public.articles;
DROP POLICY IF EXISTS admin_manage_articles ON public.articles;
CREATE POLICY public_read_articles ON public.articles FOR SELECT TO public USING (true);
CREATE POLICY admin_manage_articles ON public.articles FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS public_read_stocks ON public.stocks;
DROP POLICY IF EXISTS admin_manage_stocks ON public.stocks;
CREATE POLICY public_read_stocks ON public.stocks FOR SELECT TO public USING (true);
CREATE POLICY admin_manage_stocks ON public.stocks FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS public_read_shops ON public.shops;
DROP POLICY IF EXISTS admin_manage_shops ON public.shops;
CREATE POLICY public_read_shops ON public.shops FOR SELECT TO public USING (true);
CREATE POLICY admin_manage_shops ON public.shops FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS public_read_units ON public.units;
DROP POLICY IF EXISTS admin_manage_units ON public.units;
CREATE POLICY public_read_units ON public.units FOR SELECT TO public USING (true);
CREATE POLICY admin_manage_units ON public.units FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS admin_manage_sync_metadata ON public.sync_metadata;
CREATE POLICY admin_manage_sync_metadata ON public.sync_metadata FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS admin_manage_site_shops ON public.site_shops;
CREATE POLICY admin_manage_site_shops ON public.site_shops FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS admin_manage_categories ON public.categories;
CREATE POLICY admin_manage_categories ON public.categories FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS admin_manage_app_config ON public.app_config;
CREATE POLICY admin_manage_app_config ON public.app_config FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS admin_manage_user_roles ON public.user_roles;
CREATE POLICY admin_manage_user_roles ON public.user_roles FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

-- 5. Довідники каталогу (brands, colors, sizes, materials):
-- прибираємо надмірні політики "Enable ALL for authenticated users" і залишаємо зміну лише адмінам

DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON public.brands;
DROP POLICY IF EXISTS auth_manage_brands ON public.brands;
DROP POLICY IF EXISTS admin_manage_brands ON public.brands;
CREATE POLICY admin_manage_brands ON public.brands FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON public.colors;
DROP POLICY IF EXISTS auth_manage_colors ON public.colors;
DROP POLICY IF EXISTS admin_manage_colors ON public.colors;
CREATE POLICY admin_manage_colors ON public.colors FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON public.sizes;
DROP POLICY IF EXISTS auth_manage_sizes ON public.sizes;
DROP POLICY IF EXISTS admin_manage_sizes ON public.sizes;
CREATE POLICY admin_manage_sizes ON public.sizes FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON public.materials;
DROP POLICY IF EXISTS auth_manage_materials ON public.materials;
DROP POLICY IF EXISTS admin_manage_materials ON public.materials;
CREATE POLICY admin_manage_materials ON public.materials FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

-- 6. Товари, варіанти (SKU), фото та матеріали товарів:
-- читання: всім, зміна/видалення: тільки адмінам

DROP POLICY IF EXISTS "Дозволити DELETE товарів" ON public.products;
DROP POLICY IF EXISTS "Дозволити INSERT товарів" ON public.products;
DROP POLICY IF EXISTS "Дозволити UPDATE товарів" ON public.products;
DROP POLICY IF EXISTS admin_manage_products ON public.products;
CREATE POLICY admin_manage_products ON public.products FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS "Дозволити DELETE SKU" ON public.product_skus;
DROP POLICY IF EXISTS "Дозволити INSERT SKU" ON public.product_skus;
DROP POLICY IF EXISTS "Дозволити UPDATE SKU" ON public.product_skus;
DROP POLICY IF EXISTS admin_manage_product_skus ON public.product_skus;
CREATE POLICY admin_manage_product_skus ON public.product_skus FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS auth_delete_product_photos ON public.product_photos;
DROP POLICY IF EXISTS auth_insert_product_photos ON public.product_photos;
DROP POLICY IF EXISTS auth_update_product_photos ON public.product_photos;
DROP POLICY IF EXISTS admin_manage_product_photos ON public.product_photos;
CREATE POLICY admin_manage_product_photos ON public.product_photos FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS auth_manage_product_materials ON public.product_materials;
DROP POLICY IF EXISTS admin_manage_product_materials ON public.product_materials;
CREATE POLICY admin_manage_product_materials ON public.product_materials FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS auth_delete_product_groups ON public.product_groups;
DROP POLICY IF EXISTS auth_insert_product_groups ON public.product_groups;
DROP POLICY IF EXISTS auth_update_product_groups ON public.product_groups;
DROP POLICY IF EXISTS admin_manage_product_groups ON public.product_groups;
CREATE POLICY admin_manage_product_groups ON public.product_groups FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS auth_delete_product_variants ON public.product_variants;
DROP POLICY IF EXISTS auth_insert_product_variants ON public.product_variants;
DROP POLICY IF EXISTS auth_update_product_variants ON public.product_variants;
DROP POLICY IF EXISTS admin_manage_product_variants ON public.product_variants;
CREATE POLICY admin_manage_product_variants ON public.product_variants FOR ALL TO authenticated
  USING (public.is_sync_admin()) WITH CHECK (public.is_sync_admin());

-- 7. Замовлення (orders та order_items):
-- звичайні покупці бачать ТІЛЬКИ свої замовлення, адміни керують усіма, аноніми не читають чужі позиції

DROP POLICY IF EXISTS auth_select_orders ON public.orders;
DROP POLICY IF EXISTS auth_update_orders ON public.orders;
DROP POLICY IF EXISTS orders_self_read ON public.orders;
DROP POLICY IF EXISTS admin_manage_orders ON public.orders;

CREATE POLICY orders_self_read ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_sync_admin());

CREATE POLICY admin_manage_orders ON public.orders
  FOR ALL TO authenticated
  USING (public.is_sync_admin())
  WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS anon_select_order_items ON public.order_items;
DROP POLICY IF EXISTS auth_select_order_items ON public.order_items;
DROP POLICY IF EXISTS order_items_self_read ON public.order_items;
DROP POLICY IF EXISTS admin_manage_order_items ON public.order_items;

CREATE POLICY order_items_self_read ON public.order_items
  FOR SELECT TO authenticated
  USING (
    public.is_sync_admin() OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY admin_manage_order_items ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_sync_admin())
  WITH CHECK (public.is_sync_admin());

-- 7b. Історія офлайн-покупок клієнта (customer_sales, customer_sale_items):
-- дозволяємо клієнту бачити в Особистому кабінеті тільки власні чеки, прив'язані до його профілю
DROP POLICY IF EXISTS customer_sales_self_read ON public.customer_sales;
CREATE POLICY customer_sales_self_read ON public.customer_sales
  FOR SELECT TO authenticated
  USING (
    public.is_sync_admin() OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.source_id = customer_sales.customer_source_id
        AND c.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS customer_sale_items_self_read ON public.customer_sale_items;
CREATE POLICY customer_sale_items_self_read ON public.customer_sale_items
  FOR SELECT TO authenticated
  USING (
    public.is_sync_admin() OR EXISTS (
      SELECT 1 FROM public.customer_sales cs
      JOIN public.customers c ON c.source_id = cs.customer_source_id
      WHERE cs.source_id = customer_sale_items.sale_source_id
        AND c.auth_user_id = (SELECT auth.uid())
    )
  );

-- 8. Очищення застарілого перевантаження save_parsed_product(uuid, ...) та обмеження доступу до RPC адмінки
DROP FUNCTION IF EXISTS public.save_parsed_product(uuid, jsonb, jsonb, jsonb, jsonb);

REVOKE ALL ON FUNCTION public.save_parsed_product(bigint, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_parsed_product(bigint, jsonb, jsonb, jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.get_unlinked_articles(integer, integer, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unlinked_articles(integer, integer, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.get_unlinked_articles_count(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unlinked_articles_count(text, boolean) TO authenticated;

-- 9. Оптимізація політик customers та sync_admins і прибирання дубліката індексу
DROP POLICY IF EXISTS sync_admins_self_read ON public.sync_admins;
CREATE POLICY sync_admins_self_read ON public.sync_admins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS customers_self_access ON public.customers;
CREATE POLICY customers_self_access ON public.customers
  FOR ALL TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS customers_admin_access ON public.customers;
CREATE POLICY customers_admin_access ON public.customers
  FOR ALL TO authenticated
  USING (public.is_sync_admin())
  WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS customer_sales_admin_access ON public.customer_sales;
CREATE POLICY customer_sales_admin_access ON public.customer_sales
  FOR ALL TO authenticated
  USING (public.is_sync_admin())
  WITH CHECK (public.is_sync_admin());

DROP POLICY IF EXISTS customer_sale_items_admin_access ON public.customer_sale_items;
CREATE POLICY customer_sale_items_admin_access ON public.customer_sale_items
  FOR ALL TO authenticated
  USING (public.is_sync_admin())
  WITH CHECK (public.is_sync_admin());

ALTER TABLE public.product_skus DROP CONSTRAINT IF EXISTS product_skus_article_id_key;

