import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/useCartStore';
import { formatPrice } from '../utils/format';

export default function ProductPage() {
  const { slug } = useParams();
  const addItem = useCartStore(state => state.addItem);
  
  const [product, setProduct] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [variants, setVariants] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [added, setAdded] = useState(false);

  const markUrlBroken = (url) => {
    if (!url) return;
    setBrokenUrls(prev => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        // 1. Load group
        const { data: groupData, error: groupErr } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .single();
          
        if (groupErr) throw groupErr;
        setProduct(groupData);

        // 2. Load photos
        const { data: photosData } = await supabase
          .from('product_photos')
          .select('*')
          .eq('product_id', groupData.id)
          .order('sort_order');
        setPhotos(photosData || []);
        setActivePhoto(0);

        // 3. Load variants
        const { data: variantsData } = await supabase
          .from('product_skus')
          .select('*, sizes(name), colors(name)')
          .eq('product_id', groupData.id);
        
        if (variantsData && variantsData.length > 0) {
          const articleIds = variantsData.map(v => v.article_id);
          const { data: pricesData } = await supabase
            .from('product_view')
            .select('article_id, price, quantity, shop_name, office_id')
            .in('article_id', articleIds);

          const enrichedVariants = variantsData.map(v => ({
            ...v,
            color: v.colors?.name || null,
            size: v.sizes?.name || null,
            product_view: pricesData?.filter(p => p.article_id === v.article_id) || []
          }));
          setVariants(enrichedVariants);
          
          const colors = [...new Set(enrichedVariants.map(v => v.color).filter(Boolean))];
          if (colors.length > 0) {
            setSelectedColor(colors[0]);
            setSelectedSize(null);
          }
        } else {
          setVariants([]);
        }
      } catch (err) {
        console.error("Error loading product:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) loadProduct();
  }, [slug]);

  const showPreviousPhoto = () => {
    setActivePhoto(current => (current - 1 + photos.length) % photos.length);
  };

  const showNextPhoto = () => {
    setActivePhoto(current => (current + 1) % photos.length);
  };

  const handleAddToCart = () => {
    const selectedVariants = variants.filter(v => v.color === selectedColor && v.size === selectedSize);
    const selectedVariant = selectedVariants[0];
    if (!product || !selectedVariant) return;
    
    const itemToAdd = {
      id: selectedVariant.article_id,
      name: product.name,
      category: product.category,
      price: selectedVariant.product_view?.[0]?.price || 0,
      image: photos.length > 0 ? photos[0].url : null,
      color: selectedColor,
      size: selectedSize,
      slug: product.slug
    };
    
    addItem(itemToAdd);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="w-full md:w-3/5 bg-surface-muted border border-border/30 aspect-[3/4]"></div>
          <div className="w-full md:w-2/5 space-y-6">
            <div className="h-10 bg-surface-muted border border-border/20 w-3/4"></div>
            <div className="h-6 bg-surface-muted border border-border/20 w-1/4"></div>
            <div className="h-12 bg-surface-muted border border-border/20 w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || product.is_active === false) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-serif text-text mb-4">Товар недоступний</h1>
        <p className="text-text-light">Можливо, він був знятий з продажу або посилання застаріло.</p>
      </div>
    );
  }

  const uniqueColors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const availableSizes = variants.filter(v => v.color === selectedColor);
  
  // Find all variants matching selected color and size
  const selectedVariants = variants.filter(v => v.color === selectedColor && v.size === selectedSize);
  const selectedVariant = selectedVariants[0]; // For adding to cart
  
  // Gather all availability info across matching variants
  const availability = selectedVariants.flatMap(v => 
    (Array.isArray(v.product_view) ? v.product_view : [v.product_view]).filter(Boolean)
  );

  const totalAvailabilityQty = availability.reduce((sum, view) => sum + (parseFloat(view?.quantity) || 0), 0);

  const displayPrice = selectedVariant?.product_view?.[0]?.price 
    || variants[0]?.product_view?.[0]?.price 
    || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {product && (
        <Helmet>
          <title>{product.name} — БУДУАР</title>
          <meta name="description" content={product.description || `${product.name} — купити в магазині БУДУАР у Трускавці. Доставка по Україні.`} />
          <meta property="og:title" content={product.name} />
          <meta property="og:description" content={product.description || ''} />
          {photos[0] && <meta property="og:image" content={photos[0].url} />}
          <meta property="og:type" content="product" />
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": product.name,
              "image": photos.length > 0 ? photos.map(p => p.url) : undefined,
              "description": product.description || `${product.name} — купити в магазині БУДУАР у Трускавці.`,
              "brand": product.brands?.name ? {
                "@type": "Brand",
                "name": product.brands.name
              } : undefined,
              "offers": {
                "@type": "Offer",
                "url": typeof window !== 'undefined' ? window.location.href : '',
                "priceCurrency": "UAH",
                "price": displayPrice || 0,
                "availability": "https://schema.org/InStock",
                "itemCondition": "https://schema.org/NewCondition"
              }
            })}
          </script>
        </Helmet>
      )}
      <div className="flex flex-col md:flex-row gap-12">
        {/* Left Column - Photos */}
        <div className="w-full md:w-3/5">
          <div className="relative aspect-[3/4] border border-border/30 overflow-hidden bg-surface-muted mb-4">
            {photos.length > 0 && photos[activePhoto]?.url && !brokenUrls.has(photos[activePhoto].url) ? (
              <img
                src={photos[activePhoto].url}
                alt={photos[activePhoto].alt_text || product.name}
                onError={() => markUrlBroken(photos[activePhoto].url)}
                className="w-full h-full object-cover transition-opacity duration-300 boudoir-photo"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface text-primary p-6 text-center">
                <span className="font-serif text-2xl tracking-[0.25em] uppercase">БУДУАР</span>
                <span className="text-xs text-text-light mt-2 tracking-widest uppercase">Фото очікується</span>
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousPhoto}
                  aria-label="Попередня фотографія"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-surface/80 border border-border/40 text-text hover:bg-primary hover:text-on-primary transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={showNextPhoto}
                  aria-label="Наступна фотографія"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-surface/80 border border-border/40 text-text hover:bg-primary hover:text-on-primary transition-colors"
                >
                  <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
          
          {photos.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {photos.map((photo, idx) => (
                <button 
                  key={photo.id || idx}
                  onClick={() => setActivePhoto(idx)}
                  className={`relative w-20 aspect-[3/4] border overflow-hidden flex-shrink-0 transition-all ${
                    activePhoto === idx
                      ? 'border-primary ring-1 ring-primary opacity-100'
                      : 'border-border/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  {photo.url && !brokenUrls.has(photo.url) ? (
                    <img
                      src={photo.url}
                      alt={photo.alt_text || `${product.name} — фото ${idx + 1}`}
                      onError={() => markUrlBroken(photo.url)}
                      className="w-full h-full object-cover boudoir-photo"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface text-primary text-[10px] font-serif tracking-widest">
                      БУДУАР
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="w-full md:w-2/5 flex flex-col">
          <p className="text-sm text-text-light uppercase tracking-wider mb-2">{product.category}</p>
          <h1 className="text-4xl font-serif text-text mb-4">{product.name}</h1>
          <p className="text-3xl font-serif text-primary font-medium mb-8">{formatPrice(displayPrice)}</p>
          
          <hr className="border-border/30 mb-8" />

          {/* Color Selection */}
          {uniqueColors.length > 0 && (
            <div className="mb-8">
              <h3 className="font-medium text-text mb-3">Колір: <span className="font-normal text-text-light">{selectedColor}</span></h3>
              <div className="flex flex-wrap gap-3">
                {uniqueColors.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedSize(null);
                    }}
                    className={`px-4 py-2 border text-sm transition-all ${
                      selectedColor === color 
                        ? 'border-primary bg-primary-light text-text font-medium' 
                        : 'border-border/30 bg-surface text-text hover:border-primary'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {availableSizes.length > 0 && (
            <div className="mb-8">
              <h3 className="font-medium text-text mb-3">Розмір: <span className="font-normal text-text-light">{selectedSize || 'Оберіть розмір'}</span></h3>
              <div className="flex flex-wrap gap-3">
                {Object.values(availableSizes.reduce((acc, variant) => {
                  const key = variant.size;
                  const views = Array.isArray(variant.product_view) ? variant.product_view : [variant.product_view];
                  const qty = views.reduce((sum, view) => sum + (parseFloat(view?.quantity) || 0), 0);
                  
                  if (!acc[key]) {
                    acc[key] = { 
                      ...variant, 
                      total_quantity: qty, 
                      locations: views.map(v => ({ shop: v?.shop_name, qty: parseFloat(v?.quantity) || 0 }))
                    };
                  } else {
                    acc[key].total_quantity += qty;
                    acc[key].locations.push(...views.map(v => ({ shop: v?.shop_name, qty: parseFloat(v?.quantity) || 0 })));
                  }
                  return acc;
                }, {})).map(variant => {
                  const isOutOfStock = variant.total_quantity === 0;

                  return (
                    <button
                      key={variant.size}
                      onClick={() => setSelectedSize(variant.size)}
                      className={`px-4 py-2 border text-sm transition-all ${
                        selectedSize === variant.size 
                          ? 'border-primary bg-primary text-on-primary' 
                          : isOutOfStock
                            ? 'border-border/20 bg-surface-muted text-text-light opacity-50'
                            : 'border-border/40 bg-surface text-text hover:border-primary'
                      }`}
                    >
                      {variant.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Availability */}
          {selectedSize && (
            <div className="mb-8 bg-surface border border-border/30 p-4 flex justify-between items-center">
              <span className="font-medium text-text text-sm uppercase tracking-wider">Наявність:</span>
              <span className={totalAvailabilityQty > 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                {totalAvailabilityQty > 0 ? 'Є в наявності ✓' : 'Немає в наявності ✗'}
              </span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mb-8 pt-6 border-t border-border/30">
              <h4 className="font-serif text-xl text-text mb-4">Опис</h4>
              <p className="text-text-light text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Add to cart */}
          <button 
            disabled={!selectedSize || !selectedVariant || totalAvailabilityQty <= 0}
            onClick={handleAddToCart}
            className={`w-full py-4 text-sm font-serif tracking-widest uppercase transition-colors ${
              totalAvailabilityQty <= 0 || !selectedSize
                ? 'bg-surface-muted text-text-light border border-border/20 cursor-not-allowed'
                : added 
                  ? 'bg-success text-on-primary' 
                  : 'bg-primary text-on-primary hover:bg-primary-hover shadow-sm'
            }`}
          >
            {totalAvailabilityQty <= 0 ? 'Немає в наявності' : added ? 'Додано в кошик ✓' : 'Додати в кошик'}
          </button>
        </div>
      </div>
    </div>
  );
}
