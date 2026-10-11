UPDATE public.categories AS toys
SET parent_id = kids.id
FROM public.categories AS kids
WHERE toys.slug = 'toys'
  AND kids.slug = 'kids'
  AND toys.id <> kids.id;

INSERT INTO public.categories (slug, name_uk, sort_order, parent_id)
SELECT 'toys', 'Іграшки', 20, kids.id
FROM public.categories AS kids
WHERE kids.slug = 'kids'
  AND NOT EXISTS (
    SELECT 1
    FROM public.categories
    WHERE slug = 'toys'
  );
