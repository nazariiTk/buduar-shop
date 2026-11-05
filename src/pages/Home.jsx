import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import BoudoirOrnament from '../components/BoudoirOrnament';
import { Helmet } from 'react-helmet-async';
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

    // Query helper function
    const getQuery = (filterSlugs) => {
      let query = supabase
        .from('products')
        // Using inner join on categories to filter by slug if provided
        .select(`
          *, 
          product_photos(url, is_main), 
          product_skus(article_id, is_main),
          categories${categorySlug ? '!inner' : ''}(slug)
        `)
        .eq('is_active', true);
      
      if (filterSlugs) query = query.in('slug', filterSlugs);
      if (categorySlug) query = query.eq('categories.slug', categorySlug);
      
      return query;
    };

    if (slugs.length > 0) {
      const { data } = await getQuery(slugs);
      fetchedProducts = data || [];
    }

    // 2. Fallback — якщо популярних немає (або немає за обраною категорією)
    if (fetchedProducts.length === 0) {
      let query = getQuery().limit(8);
      const { data } = await query;
      fetchedProducts = data || [];
    }

    // 3. Збагачуємо даними цін
    if (fetchedProducts.length > 0) {
      const articleIds = fetchedProducts.map(p => {
        const mainSku = p.product_skus?.find(s => s.is_main) || p.product_skus?.[0];
        return mainSku?.article_id;
      }).filter(Boolean);
      
      let priceMap = {};

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

      fetchedProducts = fetchedProducts.map(p => {
        const mainSku = p.product_skus?.find(s => s.is_main) || p.product_skus?.[0];
        const mainArticleId = mainSku?.article_id;
        const mainPhoto = p.product_photos?.find(photo => photo.is_main)?.url || p.product_photos?.[0]?.url || null;

        return {
          ...p,
          price: priceMap[mainArticleId] || 0,
          main_photo_url: mainPhoto
        };
      });
    }

    return fetchedProducts;
  }

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      const data = await fetchPopular(activeCategory);
      if (active) {
        setProducts(data);
        setPreviousProducts(data);
        setLoading(false);
      }
    }
    run();
    return () => { active = false; };
  }, [activeCategory]);

  const categories = [
    { name: 'Всі', slug: null },
    { name: 'Білизна', slug: 'lingerie' },
    { name: 'Піжами', slug: 'sleepwear' },
    { name: 'Купальники', slug: 'swimwear' },
  ];

  return (
    <div>
      <Helmet>
        <title>БУДУАР — Бутик розкішної білизни</title>
        <meta name="description" content="Магазин ексклюзивної білизни, піжам та купальників БУДУАР у Трускавці. Широкий асортимент та доставка по Україні." />
        <meta property="og:title" content="БУДУАР — Бутик розкішної білизни" />
        <meta property="og:description" content="Магазин ексклюзивної білизни, піжам та купальників БУДУАР у Трускавці. Широкий асортимент та доставка по Україні." />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "БУДУАР",
            "url": typeof window !== 'undefined' ? window.location.origin : '',
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog?search={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "БУДУАР",
            "url": typeof window !== 'undefined' ? window.location.origin : '',
            "logo": `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`,
            "description": "Бутик розкішної білизни у Трускавці",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Трускавець",
              "addressCountry": "UA"
            }
          })}
        </script>
      </Helmet>
      {/* Hero Section */}
      <section className="py-8 md:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-surface border border-border/40 relative overflow-hidden px-6 py-20 md:py-28 lg:py-36 flex flex-col items-center text-center">
          <BoudoirOrnament variant="corner" className="w-16 h-16 text-border/70 absolute top-4 left-4 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-16 h-16 text-border/70 absolute top-4 right-4 -scale-x-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-16 h-16 text-border/70 absolute bottom-4 left-4 -scale-y-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-16 h-16 text-border/70 absolute bottom-4 right-4 -scale-x-100 -scale-y-100 pointer-events-none" />

          <div className="max-w-3xl mx-auto border border-border/30 rounded-t-full px-6 sm:px-14 pt-14 pb-12 bg-background/60">
            <p className="text-xs uppercase tracking-[0.3em] text-text-light mb-4 font-serif">
              Бутик вишуканої білизни • Est. XIX
            </p>
            <BoudoirOrnament variant="divider" className="w-44 mx-auto mb-6 text-border" />

            <h1 className="text-4xl md:text-6xl font-serif text-text mb-6 leading-tight">
              Витончене <span className="italic font-normal text-primary">мистецтво</span> спокуси
            </h1>
            <p className="text-lg md:text-xl text-text-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Створено для вашого комфорту та впевненості. Відкрийте для себе колекцію ексклюзивних піжам, білизни та купальників у атмосфері французького будуару.
            </p>
            <Link
              to="/catalog"
              className="inline-block bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-9 py-4 text-sm font-serif uppercase tracking-widest transition-all duration-500"
            >
              Переглянути колекцію
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-serif text-text">Популярні моделі</h2>
            <BoudoirOrnament variant="divider" className="w-36 mx-auto mt-3 text-border" />
          </div>

          <div className={`flex justify-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide ${loading ? 'pointer-events-none' : ''}`}>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-6 py-2.5 border text-sm font-serif tracking-wider uppercase transition-all duration-300 whitespace-nowrap ${
                  activeCategory === cat.slug
                    ? 'bg-primary border-primary text-on-primary shadow-sm'
                    : 'bg-surface border-border/40 text-text hover:border-primary'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {loading && previousProducts.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-surface-muted border border-border/20 mb-3"></div>
                  <div className="h-4 bg-surface-muted border border-border/20 w-3/4 mb-2"></div>
                  <div className="h-4 bg-surface-muted border border-border/20 w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 transition-opacity duration-300 ${
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
              className="inline-block border border-border/60 bg-surface text-text px-8 py-3.5 text-sm font-serif tracking-widest uppercase hover:bg-primary hover:border-primary hover:text-on-primary transition-all duration-300"
            >
              Переглянути всі
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
