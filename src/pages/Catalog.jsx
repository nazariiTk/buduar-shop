import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeParent, setActiveParent] = useState(null);

  // Set active categories when URL param or categories load
  useEffect(() => {
    if (categoryFromUrl && categories.length > 0) {
      setSelectedCategory(categoryFromUrl);
      const catObj = categories.find(c => c.slug === categoryFromUrl);
      if (catObj) {
        if (!catObj.parent_id) {
          setActiveParent(categoryFromUrl);
        } else {
          const parentObj = categories.find(c => c.id === catObj.parent_id);
          if (parentObj) setActiveParent(parentObj.slug);
        }
      }
    }
  }, [categoryFromUrl, categories]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data) {
          setCategories(data);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const topLevel = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const subLevel = useMemo(() => categories.filter(c => c.parent_id), [categories]);

  const activeParentObj = useMemo(() => categories.find(c => c.slug === activeParent), [categories, activeParent]);
  const visibleSubs = useMemo(() => subLevel.filter(c => c.parent_id === activeParentObj?.id), [subLevel, activeParentObj]);

  useEffect(() => {
    async function fetchProducts() {
      if (categoriesLoading) return; // Wait for categories to load first to build proper slugs

      setLoading(true);
      try {
        let query = supabase
          .from('product_catalog_view')
          .select('*')
          .eq('is_active', true);

        const selectedCatObj = categories.find(c => c.slug === selectedCategory);
        let categorySlugs = [];

        if (selectedCatObj) {
          if (!selectedCatObj.parent_id) {
            // Верхня — беремо її і всі підкатегорії
            const childSlugs = subLevel
              .filter(c => c.parent_id === selectedCatObj.id)
              .map(c => c.slug);
            categorySlugs = [selectedCategory, ...childSlugs];
          } else {
            // Підкатегорія — тільки вона
            categorySlugs = [selectedCategory];
          }
        }

        if (categorySlugs.length > 0) {
          query = query.in('category', categorySlugs);
        }

        const { data: catalogData, error } = await query;
        if (error) throw error;

        // Extract article IDs to fetch prices
        const articleIds = catalogData.map(p => p.main_article_id).filter(Boolean);
        const groupIds = catalogData.map(p => p.group_id).filter(Boolean);

        let priceMap = {};
        let photoMap = {};

        if (articleIds.length > 0) {
          const { data: priceData, error: priceError } = await supabase
            .from('product_view')
            .select('article_id, price')
            .in('article_id', articleIds);

          if (!priceError && priceData) {
            priceMap = priceData.reduce((acc, curr) => {
              // Store lowest price if duplicates, or just first one
              if (!acc[curr.article_id] || acc[curr.article_id] > curr.price) {
                acc[curr.article_id] = curr.price;
              }
              return acc;
            }, {});
          }
        }

        // if (groupIds.length > 0) {
        //   const { data: photoData, error: photoError } = await supabase
        //     .from('product_photos')
        //     .select('group_id, url')
        //     .in('group_id', groupIds)
        //     .order('sort_order', { ascending: true });

        //   if (!photoError && photoData) {
        //     photoMap = photoData.reduce((acc, curr) => {
        //       // Store first photo only if not already stored
        //       if (!acc[curr.group_id]) {
        //         acc[curr.group_id] = curr.url;
        //       }
        //       return acc;
        //     }, {});
        //   }
        // }

        // Map prices and photos back to products
        const productsWithPrice = catalogData.map(p => ({
          ...p,
          price: priceMap[p.main_article_id] || 0,
          main_photo_url: p.main_photo_url || photoMap[p.group_id] || null
        }));

        setProducts(productsWithPrice);

      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, categoriesLoading, categories, subLevel]);

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-serif mb-8 text-center">Каталог товарів</h1>

        {/* Фільтри */}
        <div className="mb-12">
          {/* Рядок 1: Головні категорії */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:justify-center md:overflow-visible">
            <button
              onClick={() => {
                setActiveParent(null);
                setSelectedCategory(null);
              }}
              className={`px-5 py-2.5 border rounded-full text-sm font-medium transition-all ${activeParent === null
                ? 'bg-gray-800 border-gray-800 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
            >
              Всі
            </button>

            {!categoriesLoading && topLevel.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveParent(cat.slug);
                  setSelectedCategory(cat.slug);
                }}
                className={`px-5 py-2.5 border rounded-full text-sm font-medium transition-all ${activeParent === cat.slug
                  ? 'bg-gray-800 border-gray-800 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
              >
                {cat.name_uk}
              </button>
            ))}
          </div>

          {/* Розділювач */}
          {activeParent && visibleSubs.length > 0 && (
            <div className="w-16 h-[1px] bg-gray-200 mx-auto my-6"></div>
          )}

          {/* Рядок 2: Підкатегорії */}
          {activeParent && visibleSubs.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:justify-center md:overflow-visible">
              <button
                onClick={() => setSelectedCategory(activeParentObj.slug)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === activeParentObj?.slug
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-text)]'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Всі {activeParentObj?.name_uk.toLowerCase()}
              </button>

              {visibleSubs.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedCategory(sub.slug)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === sub.slug
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-text)]'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {sub.name_uk}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-[3/4] bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-serif text-[var(--color-text-light)]">Товарів не знайдено</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map(product => (
              <ProductCard key={product.id || product.group_id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
