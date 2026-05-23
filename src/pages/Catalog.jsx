import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 24;

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const searchFromUrl = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeParent, setActiveParent] = useState(null);
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [selectedCategory, searchQuery]);

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
          .select('*', { count: 'exact' })
          .eq('is_active', true)
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

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

        if (searchQuery.length >= 2) {
          const safe = searchQuery.replace(/[,%]/g, '');
          query = query.or(`name.ilike.%${safe}%,keywords.ilike.%${safe}%`);
        } else if (categorySlugs.length > 0) {
          query = query.in('category', categorySlugs);
        }

        const { data: catalogData, error, count } = await query;
        if (error) throw error;
        if (count !== null) setTotalCount(count);

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
  }, [selectedCategory, categoriesLoading, categories, subLevel, page, searchQuery]);

  return (
    <div className="py-12">
      <Helmet>
        <title>Каталог товарів — БУДУАР</title>
        <meta name="description" content="Великий вибір білизни, піжам, купальників та аксесуарів. Доставка по всій Україні." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-serif mb-8 text-center">Каталог товарів</h1>

        {/* Пошуковий рядок */}
        <div className="relative max-w-lg mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Пошук товарів..."
            className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-400 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setPage(0); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Фільтри */}
        {!searchQuery && (
          <div className="mb-12">
            {/* Рядок 1: Головні категорії */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4 md:px-0 md:flex-wrap md:justify-center">
            <button
              onClick={() => {
                setActiveParent(null);
                setSelectedCategory(null);
              }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeParent === null
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-700'
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
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeParent === cat.slug
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-700'
                  }`}
              >
                {cat.name_uk}
              </button>
            ))}
          </div>

          {/* Рядок 2: Підкатегорії */}
          {activeParent && visibleSubs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4 md:px-0 md:flex-wrap md:justify-center mt-3">
              <button
                onClick={() => setSelectedCategory(activeParentObj.slug)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${selectedCategory === activeParentObj?.slug
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-text)]'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                Всі
              </button>

              {visibleSubs.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedCategory(sub.slug)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${selectedCategory === sub.slug
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-text)]'
                    : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  {sub.name_uk}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
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
            {searchQuery ? (
              <>
                <p className="text-xl font-serif text-[var(--color-text-light)] mb-3">
                  Нічого не знайдено за запитом «{searchQuery}»
                </p>
                <p className="text-sm text-gray-400 mb-8">
                  Спробуйте інший запит або перегляньте категорії
                </p>
                <div className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
                  {topLevel.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSearchQuery('');
                        setActiveParent(cat.slug);
                        setSelectedCategory(cat.slug);
                        setPage(0);
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:border-gray-400 bg-white transition-colors"
                    >
                      {cat.name_uk}
                    </button>
                  ))}
                  <button
                    onClick={() => { setSearchQuery(''); setPage(0); }}
                    className="px-4 py-2 bg-gray-800 text-white rounded-full text-sm"
                  >
                    Показати всі товари
                  </button>
                </div>
              </>
            ) : (
              <h2 className="text-2xl font-serif text-[var(--color-text-light)]">
                Товарів не знайдено
              </h2>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
            {products.map(product => (
              <ProductCard key={product.id || product.group_id} product={product} />
            ))}
          </div>
        )}

        {totalCount > PAGE_SIZE && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <button
              onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium disabled:opacity-40 hover:border-gray-400 transition-colors bg-white"
            >
              ← Назад
            </button>

            <div className="flex gap-1">
              {[...Array(Math.ceil(totalCount / PAGE_SIZE))].map((_, idx) => {
                const total = Math.ceil(totalCount / PAGE_SIZE);
                const show = idx === 0 || idx === total - 1 || Math.abs(idx - page) <= 1;
                const showDots = !show && (idx === 1 || idx === total - 2);

                if (showDots) return (
                  <span key={idx} className="px-2 py-2 text-gray-400 text-sm">...</span>
                );
                if (!show) return null;

                return (
                  <button
                    key={idx}
                    onClick={() => { setPage(idx); window.scrollTo(0, 0); }}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      page === idx
                        ? 'bg-gray-800 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              disabled={page >= Math.ceil(totalCount / PAGE_SIZE) - 1}
              className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium disabled:opacity-40 hover:border-gray-400 transition-colors bg-white"
            >
              Вперед →
            </button>
          </div>
        )}

        {totalCount > 0 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            Показано {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} з {totalCount} товарів
          </p>
        )}
      </div>
    </div>
  );
}
