import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/useCartStore';

export default function ProductPage() {
  const { slug } = useParams();
  const addItem = useCartStore(state => state.addItem);
  
  const [product, setProduct] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [variants, setVariants] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        // 1. Load group
        const { data: groupData, error: groupErr } = await supabase
          .from('product_groups')
          .select('*')
          .eq('slug', slug)
          .single();
          
        if (groupErr) throw groupErr;
        setProduct(groupData);

        // 2. Load photos
        const { data: photosData } = await supabase
          .from('product_photos')
          .select('*')
          .eq('group_id', groupData.id)
          .order('sort_order');
        setPhotos(photosData || []);

        // 3. Load variants
        const { data: variantsData } = await supabase
          .from('product_variants')
          .select('*')
          .eq('group_id', groupData.id);
        
        if (variantsData && variantsData.length > 0) {
          const articleIds = variantsData.map(v => v.article_id);
          const { data: pricesData } = await supabase
            .from('product_view')
            .select('article_id, price, quantity, shop_name, office_id')
            .in('article_id', articleIds);

          const enrichedVariants = variantsData.map(v => ({
            ...v,
            product_view: pricesData?.filter(p => p.article_id === v.article_id) || []
          }));
          setVariants(enrichedVariants);
          
          const colors = [...new Set(variantsData.map(v => v.color).filter(Boolean))];
          if (colors.length > 0) {
            setSelectedColor(colors[0]);
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

  // Handle color change
  useEffect(() => {
    setSelectedSize(null);
  }, [selectedColor]);

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
          <div className="w-full md:w-3/5 bg-gray-200 aspect-[3/4] rounded-lg"></div>
          <div className="w-full md:w-2/5 space-y-6">
            <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 text-2xl font-serif">Товар не знайдено</div>;
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
        </Helmet>
      )}
      <div className="flex flex-col md:flex-row gap-12">
        {/* Left Column - Photos */}
        <div className="w-full md:w-3/5">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[var(--color-primary-light)] mb-4">
            {photos.length > 0 ? (
              <img 
                src={photos[activePhoto].url} 
                alt={photos[activePhoto].alt_text || product.name} 
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]">БУДУАР</div>
            )}
          </div>
          
          {photos.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {photos.map((photo, idx) => (
                <button 
                  key={photo.id || idx}
                  onClick={() => setActivePhoto(idx)}
                  className={`relative w-20 aspect-[3/4] rounded-md overflow-hidden flex-shrink-0 transition-all ${activePhoto === idx ? 'ring-2 ring-[var(--color-text)]' : 'opacity-70 hover:opacity-100'}`}
                >
                  <img src={photo.url} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="w-full md:w-2/5 flex flex-col">
          <p className="text-sm text-[var(--color-text-light)] uppercase tracking-wider mb-2">{product.category}</p>
          <h1 className="text-4xl font-serif text-[var(--color-text)] mb-4">{product.name}</h1>
          <p className="text-3xl font-medium mb-8">{displayPrice} грн</p>
          
          <hr className="border-[var(--color-primary)] border-opacity-30 mb-8" />

          {/* Color Selection */}
          {uniqueColors.length > 0 && (
            <div className="mb-8">
              <h3 className="font-medium mb-3">Колір: <span className="font-normal text-[var(--color-text-light)]">{selectedColor}</span></h3>
              <div className="flex gap-3">
                {uniqueColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 border rounded-md text-sm transition-all ${
                      selectedColor === color 
                        ? 'border-[var(--color-text)] bg-[var(--color-primary-light)]' 
                        : 'border-transparent bg-gray-100 hover:bg-gray-200'
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
              <h3 className="font-medium mb-3">Розмір: <span className="font-normal text-[var(--color-text-light)]">{selectedSize || 'Оберіть розмір'}</span></h3>
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
                          ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-background)]' 
                          : isOutOfStock
                            ? 'border-gray-200 text-gray-400 opacity-50'
                            : 'border-[var(--color-primary)] hover:border-[var(--color-text)]'
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
            <div className="mb-8 bg-[var(--color-primary-light)] bg-opacity-30 p-4 rounded-md flex justify-between items-center">
              <span className="font-medium text-sm uppercase tracking-wider">Наявність:</span>
              <span className={totalAvailabilityQty > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                {totalAvailabilityQty > 0 ? 'Є в наявності ✓' : 'Немає в наявності ✗'}
              </span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mb-8 pt-6 border-t border-[var(--color-primary)] border-opacity-30">
              <h4 className="font-serif text-xl mb-4">Опис</h4>
              <p className="text-[var(--color-text-light)] text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Add to cart */}
          <button 
            disabled={!selectedSize || !selectedVariant}
            onClick={handleAddToCart}
            className={`w-full py-4 text-sm font-medium tracking-widest uppercase transition-colors ${
              !selectedSize 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : added 
                  ? 'bg-green-600 text-white' 
                  : 'bg-[var(--color-text)] text-[var(--color-background)] hover:bg-opacity-90 shadow-sm'
            }`}
          >
            {added ? '✓ Додано' : 'Додати в кошик'}
          </button>
        </div>
      </div>
    </div>
  );
}
