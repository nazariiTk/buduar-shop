-- ============================================================================
-- Захист представлень (Views) product_view та product_catalog_view
-- ============================================================================

-- 1. Вмикаємо security_invoker = true на обох представленнях,
-- щоб вони підпорядковувались політикам RLS базових таблиць (прибирає статус Unrestricted у Supabase)
ALTER VIEW public.product_view SET (security_invoker = true);
ALTER VIEW public.product_catalog_view SET (security_invoker = true);

-- 2. Забираємо зайві права (INSERT/UPDATE/DELETE/TRUNCATE) на product_view, залишаючи лише SELECT
REVOKE ALL ON public.product_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_view TO anon, authenticated, service_role;

-- 3. Повністю закриваємо застарілий product_catalog_view (та старі таблиці product_groups, product_variants) від публічного доступу
REVOKE ALL ON public.product_catalog_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_catalog_view TO service_role;

DROP POLICY IF EXISTS public_read_product_groups ON public.product_groups;
DROP POLICY IF EXISTS public_read_product_variants ON public.product_variants;

-- 4. Обмежуємо публічний доступ до articles та stocks (і відповідно до product_view):
-- Звичайні відвідувачі сайту бачать ТІЛЬКИ ті артикули та залишки, які вже прив'язані до опублікованих товарів у product_skus.
-- Повну базу з 58 000+ необроблених артикулів 1С бачать виключно адміністратори (через існуючі політики admin_manage_articles / admin_manage_stocks).

DROP POLICY IF EXISTS public_read_articles ON public.articles;
CREATE POLICY public_read_articles ON public.articles
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.product_skus ps
      WHERE ps.article_id = articles.id
    )
  );

DROP POLICY IF EXISTS public_read_stocks ON public.stocks;
CREATE POLICY public_read_stocks ON public.stocks
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.product_skus ps
      WHERE ps.article_id = stocks.article_id
    )
  );
