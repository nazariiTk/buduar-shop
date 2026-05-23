import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [previousProducts, setPreviousProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  async function fetchPopular(categorySlug) {
    // 1. Спробуємо взяти популярні з замовлень
    const { data: orderData } = await supabase
      .from('order_items')
      .select('product_slug, product_name, count:id.count()')
      .not('product_slug', 'is', null)
      .order('count', { ascending: false })
      .limit(8);

    let slugs = orderData?.map(i => i.product_slug) || [];
    let fetchedProducts = [];

    if (slugs.length > 0) {
      let query = supabase
        .from('product_catalog_view')
        .select('*')
        .eq('is_active', true)
        .in('slug', slugs);
      
      if (categorySlug) query = query.eq('category', categorySlug);
      
      const { data } = await query;
      fetchedProducts = data || [];
    }

    // 2. Fallback — якщо популярних немає (або немає за обраною категорією)
    if (fetchedProducts.length === 0) {
      let query = supabase
        .from('product_catalog_view')
        .select('*')
        .eq('is_active', true)
        .limit(8);
      
      if (categorySlug) query = query.eq('category', categorySlug);
      
      const { data } = await query;
      fetchedProducts = data || [];
    }

    // 3. Збагачуємо даними фото та ціни (ручний join, як було раніше)
    if (fetchedProducts.length > 0) {
      const articleIds = fetchedProducts.map(p => p.main_article_id).filter(Boolean);
      const groupIds = fetchedProducts.map(p => p.id || p.group_id).filter(Boolean);
      
      let priceMap = {};
      let photoMap = {};

      if (articleIds.length > 0) {
        const { data: priceData } = await supabase
          .from('product_view')
          .select('article_id, price')
          .in('article_id', articleIds);
          
        if (priceData) {
          priceMap = priceData.reduce((acc, curr) => {
            if (!acc[curr.article_id] || acc[curr.article_id] > curr.price) {
              acc[curr.article_id] = curr.price;
            }
            return acc;
          }, {});
        }
      }

      if (groupIds.length > 0) {
        const { data: photoData } = await supabase
          .from('product_photos')
          .select('group_id, url')
          .in('group_id', groupIds)
          .order('sort_order', { ascending: true });

        if (photoData) {
          photoMap = photoData.reduce((acc, curr) => {
            if (!acc[curr.group_id]) {
              acc[curr.group_id] = curr.url;
            }
            return acc;
          }, {});
        }
      }

      fetchedProducts = fetchedProducts.map(p => ({
        ...p,
        price: priceMap[p.main_article_id] || 0,
        main_photo_url: p.main_photo_url || photoMap[p.id || p.group_id] || null
      }));
    }

    return fetchedProducts;
  }

  async function loadProducts(categorySlug) {
    setLoading(true);
    // НЕ очищаємо products одразу — залишаємо старі для плавного переходу
    const data = await fetchPopular(categorySlug);
    setProducts(data);
    setPreviousProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts(activeCategory);
  }, [activeCategory]);

  const categories = [
    { name: 'Всі', slug: null },
    { name: 'Білизна', slug: 'lingerie' },
    { name: 'Піжами', slug: 'sleepwear' },
    { name: 'Купальники', slug: 'swimwear' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[var(--color-primary-light)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-24 md:py-32 lg:py-40 flex flex-col items-center text-center">
            {/* Ornament Placeholder */}
            <div className="mb-8 opacity-80 w-32 h-16 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 50\'%3E%3Cpath fill=\'%23ffffff\' d=\'M50,10 C60,30 80,40 90,20 C80,10 60,20 50,40 C40,20 20,10 10,20 C20,40 40,30 50,10 Z\'/%3E%3C/svg%3E")' }}></div>

            <h1 className="text-4xl md:text-6xl font-serif text-[var(--color-text)] mb-6">
              Бутик розкішної білизни
            </h1>
            <p className="text-lg md:text-xl text-[var(--color-text-light)] max-w-2xl mb-10">
              Створено для вашого комфорту та впевненості. Відкрийте для себе колекцію ексклюзивних піжам, білизни та купальників.
            </p>
            <Link
              to="/catalog"
              className="inline-block bg-[var(--color-text)] text-[var(--color-background)] px-8 py-4 text-sm font-medium tracking-widest uppercase hover:bg-opacity-90 transition-all"
            >
              Перейти до каталогу
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif mb-4">Популярні моделі</h2>
            <div className="w-16 h-[1px] bg-[var(--color-primary)] mx-auto"></div>
          </div>

          <div className={`flex justify-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide ${loading ? 'pointer-events-none' : ''}`}>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-5 py-2.5 border rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.slug
                    ? 'bg-gray-800 border-gray-800 text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {loading && previousProducts.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-300 ${
              loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
            }`}>
              {(loading ? previousProducts : products).map(product => (
                <ProductCard key={product.id || product.group_id} product={product} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/catalog"
              className="inline-block border border-[var(--color-text)] text-[var(--color-text)] px-8 py-3 text-sm font-medium tracking-widest uppercase hover:bg-[var(--color-text)] hover:text-[var(--color-background)] transition-all"
            >
              Переглянути всі
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
