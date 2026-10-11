INSERT INTO public.categories (slug, name_uk, sort_order, parent_id)
SELECT 'toys', 'Іграшки', 20, NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories
  WHERE slug = 'toys'
);
