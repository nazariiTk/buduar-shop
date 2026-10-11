-- Product grouping integrity and the RPCs used by the admin grouping screens.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM product_skus
    WHERE article_id IS NOT NULL
    GROUP BY article_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique product_skus.article_id index: duplicate article links exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM product_skus
    GROUP BY product_id
    HAVING count(*) FILTER (WHERE is_main) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique product_skus main index: groups have multiple main SKUs';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS product_skus_article_id_unique
  ON product_skus (article_id)
;

CREATE UNIQUE INDEX IF NOT EXISTS product_skus_one_main_per_product
  ON product_skus (product_id)
  WHERE is_main;

CREATE OR REPLACE FUNCTION public.get_unlinked_articles(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT '',
  p_in_stock boolean DEFAULT true
)
RETURNS TABLE (
  code text,
  text_name text,
  total_quantity numeric,
  articles jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH available AS (
    SELECT
      pv.article_id,
      pv.code,
      pv.text_name,
      pv.barcode,
      pv.price,
      pv.quantity,
      pv.shop_name
    FROM product_view pv
    WHERE NOT EXISTS (
      SELECT 1
      FROM product_skus ps
      WHERE ps.article_id = pv.article_id
    )
      AND (
        coalesce(p_search, '') = ''
        OR pv.code ILIKE '%' || p_search || '%'
        OR pv.text_name ILIKE '%' || p_search || '%'
      )
      AND (NOT coalesce(p_in_stock, true) OR pv.quantity > 0)
  ),
  grouped AS (
    SELECT
      a.code,
      min(a.text_name) AS text_name,
      sum(coalesce(a.quantity, 0)) AS total_quantity,
      jsonb_agg(
        jsonb_build_object(
          'article_id', a.article_id,
          'code', a.code,
          'text_name', a.text_name,
          'barcode', a.barcode,
          'price', a.price,
          'quantity', a.quantity,
          'shop_name', a.shop_name
        )
        ORDER BY a.article_id
      ) AS articles
    FROM available a
    GROUP BY a.code
  )
  SELECT g.code, g.text_name, g.total_quantity, g.articles
  FROM grouped g
  ORDER BY g.code
  LIMIT greatest(coalesce(p_limit, 50), 0)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_unlinked_articles_count(
  p_search text DEFAULT '',
  p_in_stock boolean DEFAULT true
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(DISTINCT pv.code)
  FROM product_view pv
  WHERE NOT EXISTS (
    SELECT 1
    FROM product_skus ps
    WHERE ps.article_id = pv.article_id
  )
    AND (
      coalesce(p_search, '') = ''
      OR pv.code ILIKE '%' || p_search || '%'
      OR pv.text_name ILIKE '%' || p_search || '%'
    )
    AND (NOT coalesce(p_in_stock, true) OR pv.quantity > 0);
$$;

CREATE OR REPLACE FUNCTION public.save_parsed_product(
  p_product_id bigint DEFAULT NULL,
  p_product_data jsonb DEFAULT NULL,
  p_photos jsonb DEFAULT NULL,
  p_variants jsonb DEFAULT '[]'::jsonb,
  p_materials jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_product_id bigint := p_product_id;
  v_variant jsonb;
  v_article_id bigint;
  v_is_main boolean;
  v_main_id bigint;
  v_photo jsonb;
  v_material_id bigint;
BEGIN
  IF v_product_id IS NULL THEN
    IF p_product_data IS NULL OR coalesce(p_product_data->>'name', '') = '' THEN
      RAISE EXCEPTION 'Product data with a name is required for a new group';
    END IF;

    INSERT INTO products (
      name,
      slug,
      category_id,
      description,
      keywords,
      base_article_code,
      brand_id,
      gender,
      is_active
    )
    VALUES (
      p_product_data->>'name',
      p_product_data->>'slug',
      nullif(p_product_data->>'category_id', '')::bigint,
      coalesce(p_product_data->>'description', ''),
      nullif(p_product_data->>'keywords', ''),
      nullif(p_product_data->>'base_article_code', ''),
      nullif(p_product_data->>'brand_id', '')::bigint,
      nullif(p_product_data->>'gender', ''),
      coalesce((p_product_data->>'is_active')::boolean, true)
    )
    RETURNING id INTO v_product_id;
  ELSE
    PERFORM 1 FROM products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product group % does not exist', v_product_id;
    END IF;
  END IF;

  IF jsonb_typeof(coalesce(p_variants, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(p_variants, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one product variant is required';
  END IF;

  SELECT (variant->>'article_id')::bigint
  INTO v_article_id
  FROM jsonb_array_elements(p_variants) AS variant
  GROUP BY (variant->>'article_id')::bigint
  HAVING count(*) > 1
  LIMIT 1;
  IF v_article_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate article_id % in product variants', v_article_id;
  END IF;

  FOR v_variant IN SELECT value FROM jsonb_array_elements(p_variants)
  LOOP
    v_article_id := nullif(v_variant->>'article_id', '')::bigint;
    IF v_article_id IS NULL THEN
      RAISE EXCEPTION 'Every product variant must have an article_id';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM product_view WHERE article_id = v_article_id) THEN
      RAISE EXCEPTION 'Article % does not exist in product_view', v_article_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM product_skus
      WHERE article_id = v_article_id AND product_id <> v_product_id
    ) THEN
      RAISE EXCEPTION 'Article % is already linked to another product group', v_article_id;
    END IF;
  END LOOP;

  UPDATE product_skus
  SET is_main = false
  WHERE product_id = v_product_id;

  FOR v_variant IN SELECT value FROM jsonb_array_elements(p_variants)
  LOOP
    v_article_id := (v_variant->>'article_id')::bigint;
    v_is_main := coalesce((v_variant->>'is_main')::boolean, false);

    INSERT INTO product_skus (product_id, article_id, size_id, color_id, is_main)
    VALUES (
      v_product_id,
      v_article_id,
      nullif(v_variant->>'size_id', '')::bigint,
      nullif(v_variant->>'color_id', '')::bigint,
      false
    )
    ON CONFLICT (article_id) DO UPDATE
      SET product_id = excluded.product_id,
          size_id = excluded.size_id,
          color_id = excluded.color_id;

    IF v_is_main AND v_main_id IS NULL THEN
      v_main_id := v_article_id;
    END IF;
  END LOOP;

  IF v_main_id IS NULL THEN
    SELECT id INTO v_main_id
    FROM product_skus
    WHERE product_id = v_product_id
    ORDER BY id
    LIMIT 1;
  ELSE
    SELECT id INTO v_main_id
    FROM product_skus
    WHERE product_id = v_product_id AND article_id = v_main_id;
  END IF;

  IF v_main_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine the main SKU for product %', v_product_id;
  END IF;

  UPDATE product_skus
  SET is_main = true
  WHERE id = v_main_id;

  IF jsonb_typeof(coalesce(p_photos, '[]'::jsonb)) = 'array' THEN
    FOR v_photo IN SELECT value FROM jsonb_array_elements(p_photos)
    LOOP
      INSERT INTO product_photos (product_id, url, is_main, sort_order)
      VALUES (
        v_product_id,
        v_photo->>'url',
        coalesce((v_photo->>'is_main')::boolean, false),
        coalesce((v_photo->>'sort_order')::integer, 0)
      );
    END LOOP;
  END IF;

  IF jsonb_typeof(coalesce(p_materials, '[]'::jsonb)) = 'array' THEN
    DELETE FROM product_materials WHERE product_id = v_product_id;
    FOR v_material_id IN
      SELECT value::text::bigint FROM jsonb_array_elements_text(p_materials)
    LOOP
      INSERT INTO product_materials (product_id, material_id)
      SELECT v_product_id, v_material_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM product_materials pm
        WHERE pm.product_id = v_product_id
          AND pm.material_id = v_material_id
      );
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$$;