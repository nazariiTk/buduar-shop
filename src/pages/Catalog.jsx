import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, X, Filter } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
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
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [selectedSizes, setSelectedSizes] = useState(new Set());
  const [selectedColors, setSelectedColors] = useState(new Set());
  const [selectedBrands, setSelectedBrands] = useState(new Set());
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  // Завантажити довідники
  const [filterSizes, setFilterSizes] = useState([]);
  const [filterColors, setFilterColors] = useState([]);
  const [filterBrands, setFilterBrands] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from('sizes').select('*').order('sort_order'),
      supabase.from('colors').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
    ]).then(([s, c, b]) => {
      setFilterSizes(s.data || []);
      setFilterColors(c.data || []);
      setFilterBrands(b.data || []);
    });
  }, []);

  useEffect(() => {
    setSelectedSizes(new Set());
    setSelectedColors(new Set());
    setSelectedBrands(new Set());
    setPriceRange({ min: '', max: '' });
    setPage(0);
  }, [selectedCategory]);

  useEffect(() => {
    setPage(0);
  }, [selectedCategory, searchQuery]);

  // Set active categories when URL param or categories load
  useEffect(() => {
    if (categoryFromUrl && categories.length > 0) {
      setSelectedCategory(categoryFromUrl);
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



  useEffect(() => {
    async function fetchProducts() {
      if (categoriesLoading) return; // Wait for categories to load first to build proper slugs

      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('*, product_photos(url, is_main), product_skus(article_id, is_main)', { count: 'exact' })
          .eq('is_active', true)
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (searchQuery.length >= 2) {
          const safe = searchQuery.replace(/[,%]/g, '');
          query = query.or(`name.ilike.%${safe}%,keywords.ilike.%${safe}%`);
        } else if (selectedCategory) {
          // Знаходимо всіх нащадків обраної категорії
          const allCategories = categories;
          const cat = allCategories.find(c => c.slug === selectedCategory);
          
          if (cat) {
            // Збираємо slug обраної + всіх дочірніх
            const children = allCategories.filter(c => c.parent_id === cat.id);
            const grandchildren = allCategories.filter(c => 
              children.some(ch => ch.id === c.parent_id)
            );
            
            const catIds = [
              cat.id,
              ...children.map(c => c.id),
              ...grandchildren.map(c => c.id)
            ];
            
            query = query.in('category_id', catIds);
          }
        }

        // Розміри — через product_skus
        if (selectedSizes.size > 0) {
          // Спочатку знаходимо product_id з потрібними розмірами
          const { data: variantData } = await supabase
            .from('product_skus')
            .select('product_id')
            .in('size_id', [...selectedSizes]);
          
          const productIds = [...new Set(variantData?.map(v => v.product_id) || [])];
          if (productIds.length > 0) {
            query = query.in('product_id', productIds);
          } else {
            setProducts([]); setLoading(false); return;
          }
        }

        // Кольори — через product_skus
        if (selectedColors.size > 0) {
          const { data: variantData } = await supabase
            .from('product_skus')
            .select('product_id')
            .in('color_id', [...selectedColors]);
          
          const productIds = [...new Set(variantData?.map(v => v.product_id) || [])];
          if (productIds.length > 0) {
            query = query.in('product_id', productIds);
          } else {
            setProducts([]); setLoading(false); return;
          }
        }

        // Бренди — напряму в products (через brand_id)
        if (selectedBrands.size > 0) {
          query = query.in('brand_id', [...selectedBrands]);
        }

        // Ціни — через product_view та product_skus
        if (priceRange.min || priceRange.max) {
          let priceQuery = supabase.from('product_view').select('article_id');
          if (priceRange.min) priceQuery = priceQuery.gte('price', Number(priceRange.min));
          if (priceRange.max) priceQuery = priceQuery.lte('price', Number(priceRange.max));
          
          const { data: priceData } = await priceQuery;
          const validArticleIds = [...new Set(priceData?.map(p => p.article_id) || [])];
          
          if (validArticleIds.length > 0) {
            const { data: skuData } = await supabase
              .from('product_skus')
              .select('product_id')
              .in('article_id', validArticleIds);
              
            const validProductIds = [...new Set(skuData?.map(s => s.product_id) || [])];
            if (validProductIds.length > 0) {
              query = query.in('id', validProductIds);
            } else {
              setProducts([]); setTotalCount(0); setLoading(false); return;
            }
          } else {
             setProducts([]); setTotalCount(0); setLoading(false); return;
          }
        }

        const { data: catalogData, error, count } = await query;
        if (error) throw error;
        if (count !== null) setTotalCount(count);

        const articleIds = catalogData.map(p => {
          const mainSku = p.product_skus?.find(s => s.is_main) || p.product_skus?.[0];
          return mainSku?.article_id;
        }).filter(Boolean);

        const productIds = catalogData.map(p => p.id).filter(Boolean);

        let priceMap = {};

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

        // if (productIds.length > 0) {
        //   const { data: photoData, error: photoError } = await supabase
        //     .from('product_photos')
        //     .select('product_id, url')
        //     .in('product_id', productIds)
        //     .order('sort_order', { ascending: true });

        //   if (!photoError && photoData) {
        //     photoMap = photoData.reduce((acc, curr) => {
        //       // Store first photo only if not already stored
        //       if (!acc[curr.product_id]) {
        //         acc[curr.product_id] = curr.url;
        //       }
        //       return acc;
        //     }, {});
        //   }
        // }

        // Map prices and photos back to products
        const productsWithPrice = catalogData.map(p => {
          const mainSku = p.product_skus?.find(s => s.is_main) || p.product_skus?.[0];
          const mainArticleId = mainSku?.article_id;
          const mainPhoto = p.product_photos?.find(photo => photo.is_main)?.url || p.product_photos?.[0]?.url || null;

          return {
            ...p,
            price: priceMap[mainArticleId] || 0,
            main_photo_url: mainPhoto
          };
        });

        setProducts(productsWithPrice);

      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, categoriesLoading, categories, page, searchQuery, selectedSizes, selectedColors, selectedBrands, priceRange]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Helmet>
        <title>Каталог товарів — БУДУАР</title>
        <meta name="description" content="Великий вибір білизни, піжам, купальників та аксесуарів. Доставка по всій Україні." />
      </Helmet>
      
      <h1 className="text-3xl font-serif mb-8">Каталог товарів</h1>

      <div className="flex gap-8">
        {/* Бічна панель — десктоп */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar
            sizes={filterSizes}
            colors={filterColors}
            brands={filterBrands}
            selectedSizes={selectedSizes}
            selectedColors={selectedColors}
            selectedBrands={selectedBrands}
            priceRange={priceRange}
            onSizeToggle={(id) => setSelectedSizes(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            onColorToggle={(id) => setSelectedColors(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            onBrandToggle={(id) => setSelectedBrands(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            onPriceChange={setPriceRange}
            onReset={() => {
              setSelectedSizes(new Set());
              setSelectedColors(new Set());
              setSelectedBrands(new Set());
              setPriceRange({ min: '', max: '' });
            }}
          />
        </aside>

        {/* Основний контент */}
        <div className="flex-1 min-w-0">
          {/* Мобільний пошук і фільтр */}
          <div className="lg:hidden mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Пошук..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm"
            >
              <Filter className="h-4 w-4" />
              Фільтри
            </button>
          </div>

          {/* Активний фільтр — показуємо що обрано */}
          {selectedCategory && !searchQuery && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">
                {categories.find(c => c.slug === selectedCategory)?.name_uk}
              </span>
              <button
                onClick={() => { setSelectedCategory(null); setPage(0); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕ Скинути
              </button>
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
                  {categories.filter(c => !c.parent_id).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(cat.slug);
                        setPage(0);
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:border-gray-400 bg-white transition-colors"
                    >
                      {cat.name}
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
              <ProductCard key={product.id} product={product} />
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
          <p className="text-center text-sm text-gray-500 mt-4">
            Показано {products.length} з {totalCount} товарів
          </p>
        )}
        </div>
      </div>

      {/* Мобільний drawer з фільтрами */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-medium">Фільтри</h3>
              <button onClick={() => setMobileFiltersOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar
              sizes={filterSizes}
              colors={filterColors}
              brands={filterBrands}
              selectedSizes={selectedSizes}
              selectedColors={selectedColors}
              selectedBrands={selectedBrands}
              priceRange={priceRange}
              onSizeToggle={(id) => setSelectedSizes(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
              onColorToggle={(id) => setSelectedColors(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
              onBrandToggle={(id) => setSelectedBrands(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
              onPriceChange={setPriceRange}
              onReset={() => {
                setSelectedSizes(new Set());
                setSelectedColors(new Set());
                setSelectedBrands(new Set());
                setPriceRange({ min: '', max: '' });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
