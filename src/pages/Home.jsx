import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        // Fetch 3 active products from catalog view
        const { data: catalogData, error } = await supabase
          .from('product_catalog_view')
          .select('*')
          .eq('is_active', true)
          .limit(3);
          
        if (error || !catalogData || catalogData.length === 0) return;

        const articleIds = catalogData.map(p => p.main_article_id).filter(Boolean);
        const groupIds = catalogData.map(p => p.id).filter(Boolean);
        
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

        const enrichedProducts = catalogData.map(p => ({
          ...p,
          price: priceMap[p.main_article_id] || 0,
          main_photo_url: p.main_photo_url || photoMap[p.id] || null
        }));

        setFeaturedProducts(enrichedProducts);
      } catch (err) {
        console.error("Error fetching featured products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, []);

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
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif mb-4">Популярні моделі</h2>
            <div className="w-16 h-[1px] bg-[var(--color-primary)] mx-auto"></div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-lg overflow-hidden shadow-sm">
                  <div className="aspect-[3/4] bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Немає доступних товарів
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {featuredProducts.map(product => (
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
