import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, X, Filter } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import BoudoirOrnament from '../components/BoudoirOrnament';
import { supabase } from '../lib/supabase';
import { getName } from '../utils/format';

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

  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || null);
  const [prevCategoryFromUrl, setPrevCategoryFromUrl] = useState(categoryFromUrl);
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [selectedSizes, setSelectedSizes] = useState(new Set());
  const [selectedColors, setSelectedColors] = useState(new Set());
  const [selectedBrands, setSelectedBrands] = useState(new Set());
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  const applyCategoryChange = (nextCategory) => {
    setSelectedCategory(nextCategory);
    setSelectedSizes(new Set());
    setSelectedColors(new Set());
    setSelectedBrands(new Set());
    setPriceRange({ min: '', max: '' });
    setPage(0);
  };

  if (categoryFromUrl !== prevCategoryFromUrl) {
    setPrevCategoryFromUrl(categoryFromUrl);
    if (categoryFromUrl) {
      applyCategoryChange(categoryFromUrl);
    }
  }

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
      
      <h1 className="text-3xl md:text-4xl font-serif text-text mb-2">Каталог товарів</h1>
      <BoudoirOrnament variant="divider" className="w-36 mb-6 text-border" />

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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Пошук..."
                className="w-full pl-9 pr-4 py-2 bg-surface border border-border/40 text-text placeholder:text-text-light text-sm focus:outline-none focus-visible:border-primary transition-colors"
              />
            </div>
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border/40 text-text text-sm hover:border-primary focus-visible:outline-none focus-visible:border-primary transition-colors"
            >
              <Filter className="h-4 w-4 text-primary" />
              Фільтри
            </button>
          </div>

          {/* Активний фільтр — показуємо що обрано */}
          {selectedCategory && !searchQuery && (
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-serif tracking-wide text-text">
                {getName(categories.find(c => c.slug === selectedCategory))}
              </span>
              <button
                onClick={() => applyCategoryChange(null)}
                className="text-xs text-text-light hover:text-primary focus-visible:outline-none focus-visible:text-primary transition-colors"
              >
                ✕ Скинути
              </button>
            </div>
          )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-surface border border-border/30 overflow-hidden">
                <div className="aspect-[3/4] bg-surface-muted"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-surface-muted w-3/4"></div>
                  <div className="h-4 bg-surface-muted w-1/2"></div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-5 bg-surface-muted w-1/3"></div>
                    <div className="h-8 bg-surface-muted w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-surface border border-border/30 px-6">
            {searchQuery ? (
              <>
                <p className="text-xl font-serif text-text mb-3">
                  Нічого не знайдено за запитом «{searchQuery}»
                </p>
                <p className="text-sm text-text-light mb-8">
                  Спробуйте інший запит або перегляньте категорії
                </p>
                <div className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
                  {categories.filter(c => !c.parent_id).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSearchQuery('');
                        applyCategoryChange(cat.slug);
                      }}
                      className="px-4 py-2 border border-border/40 text-text text-sm hover:border-primary bg-background focus-visible:outline-none focus-visible:border-primary transition-colors"
                    >
                      {cat.name}
                    </button>
                  ))}
                  <button
                    onClick={() => { setSearchQuery(''); setPage(0); }}
                    className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-hover text-sm font-serif tracking-wider uppercase focus-visible:outline-none transition-colors"
                  >
                    Показати всі товари
                  </button>
                </div>
              </>
            ) : (
              <h2 className="text-2xl font-serif text-text-light">
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
              className="px-4 py-2 border border-border/40 bg-surface text-text text-sm font-serif tracking-wider disabled:opacity-40 disabled:pointer-events-none hover:border-primary focus-visible:outline-none focus-visible:border-primary transition-colors"
            >
              ← Назад
            </button>

            <div className="flex gap-1">
              {[...Array(Math.ceil(totalCount / PAGE_SIZE))].map((_, idx) => {
                const total = Math.ceil(totalCount / PAGE_SIZE);
                const show = idx === 0 || idx === total - 1 || Math.abs(idx - page) <= 1;
                const showDots = !show && (idx === 1 || idx === total - 2);

                if (showDots) return (
                  <span key={idx} className="px-2 py-2 text-text-light text-sm">...</span>
                );
                if (!show) return null;

                return (
                  <button
                    key={idx}
                    onClick={() => { setPage(idx); window.scrollTo(0, 0); }}
                    className={`w-9 h-9 text-sm font-serif transition-colors focus-visible:outline-none ${
                      page === idx
                        ? 'bg-primary text-on-primary border border-primary'
                        : 'bg-surface border border-border/40 text-text hover:border-primary'
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
              className="px-4 py-2 border border-border/40 bg-surface text-text text-sm font-serif tracking-wider disabled:opacity-40 disabled:pointer-events-none hover:border-primary focus-visible:outline-none focus-visible:border-primary transition-colors"
            >
              Вперед →
            </button>
          </div>
        )}

        {totalCount > 0 && (
          <p className="text-center text-sm text-text-light mt-4">
            Показано {products.length} з {totalCount} товарів
          </p>
        )}
        </div>
      </div>

      {/* Мобільний drawer з фільтрами */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay"
            onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface border-l border-border/40 overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-border/30">
              <h3 className="font-serif text-xl text-text">Фільтри</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="text-text-light hover:text-primary focus-visible:outline-none transition-colors"
              >
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
