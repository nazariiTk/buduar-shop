import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Check, Search, X, ImagePlus } from 'lucide-react';
import { uploadProductImage } from '../../services/storage.service';
import useAiMetricsStore from '../../store/useAiMetricsStore';

export default function AdminProducts() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);

  const [selectedIds, setSelectedIds] = useState(new Set());

  // Parsing Queue State
  const [parsingQueue, setParsingQueue] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [currentParsed, setCurrentParsed] = useState(null);

  // Categories for grouped select
  const [categories, setCategories] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState([]);

  // Dictionaries
  const [brands, setBrands] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [materials, setMaterials] = useState([]);

  const reloadDicts = async () => {
    const [b, c, s, m] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('colors').select('*').order('name_uk'),
      supabase.from('sizes').select('*').order('sort_order'),
      supabase.from('materials').select('*').order('sort_order'),
    ]);
    setBrands(b.data || []);
    setColors(c.data || []);
    setSizes(s.data || []);
    setMaterials(m.data || []);
  };

  useEffect(() => {
    reloadDicts();
  }, []);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      if (data) {
        setCategories(data);
        const parents = data.filter(c => !c.parent_id);
        const grouped = parents.map(p => ({
          ...p,
          children: data.filter(c => c.parent_id === p.id)
        }));
        setGroupedCategories(grouped);
      }
    }
    loadCategories();
  }, []);

  const checkExistingGroup = async (baseCode) => {
    if (!baseCode) return null;
    const { data } = await supabase.from('product_groups').select('id, name').eq('base_article_code', baseCode).limit(1).single();
    return data || null;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, inStockOnly]);

  useEffect(() => {
    fetchArticles();
  }, [page, debouncedQuery, inStockOnly]);

  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (parsingQueue.length > 0 && !currentParsed && !isProcessingRef.current) {
      isProcessingRef.current = true;
      processQueue().finally(() => {
        isProcessingRef.current = false;
      });
    }
  }, [parsingQueue.length, currentParsed]);

  async function fetchArticles() {
    setLoading(true);
    try {
      // 1. Fetch already linked article IDs
      const { data: variants } = await supabase.from('product_variants').select('article_id');
      const linkedIds = variants?.map(v => v.article_id).filter(Boolean) || [];

      // 2. Fetch unlinked articles
      // 2. Fetch unlinked articles
      let query = supabase
        .from('product_view')
        .select('article_id, code, text_name, full_name, barcode, price, quantity, shop_name', { count: 'exact' })
        .eq('is_deleted', false)
        .range(page * 50, page * 50 + 49);

      if (inStockOnly) {
        query = query.gt('quantity', 0);
      }

      if (linkedIds.length > 0) {
        query = query.not('article_id', 'in', `(${linkedIds.join(',')})`);
      }

      if (debouncedQuery) {
        const safeQuery = debouncedQuery.replace(/[,%]/g, '');
        query = query.or(`code.ilike.%${safeQuery}%,text_name.ilike.%${safeQuery}%,barcode.ilike.%${safeQuery}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      // Group duplicates and calculate total quantity
      const groupedProducts = (data || []).reduce((acc, curr) => {
        const qty = Number(curr.quantity) || 0;
        if (!acc[curr.code]) {
          acc[curr.code] = {
            ...curr,
            id: curr.article_id, // Map article_id back to id for UI compatibility
            total_quantity: qty,
            locations: [{ shop: curr.shop_name, qty: qty }]
          };
        } else {
          acc[curr.code].total_quantity += qty;
          acc[curr.code].locations.push({ shop: curr.shop_name, qty: qty });
        }
        return acc;
      }, {});

      setArticles(Object.values(groupedProducts));
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  };

  // Start parsing selected
  const handleParseSelected = () => {
    const toParse = articles.filter(a => selectedIds.has(a.id));
    setParsingQueue(toParse);
    setSelectedIds(new Set());
  };

  const handleParseSingle = (article) => {
    setParsingQueue([article]);
  };

  const handleManualSingle = async (article) => {
    setIsParsing(true);
    try {
      const baseCode = article.code; // Use article.code directly
      const existingGroup = await checkExistingGroup(baseCode);

      setCurrentParsed({
        article,
        parsed: {
          brand: null,
          product_type: '',
          base_name: article.text_name,
          category_slug: null,
          confidence: null,
          description: '',
          keywords: '',
          base_article_code: baseCode,
          variants: []
        },
        isManual: true,
        autoGroup: existingGroup
      });
    } finally {
      setIsParsing(false);
    }
  };

  const processQueue = async () => {
    setIsParsing(true);
    const article = parsingQueue[0];
    try {
      const { data: allArticles, error: fetchErr } = await supabase
        .from('product_view')
        .select('*')
        .eq('code', article.code);
        
      if (fetchErr) throw fetchErr;

      const uniqueVariantsMap = new Map();
      (allArticles || []).forEach(a => {
        if (!uniqueVariantsMap.has(a.article_id)) {
          uniqueVariantsMap.set(a.article_id, a);
        }
      });
      const uniqueVariants = Array.from(uniqueVariantsMap.values());
      
      const variantsText = uniqueVariants.map(v => `- id: ${v.article_id}, назва: ${v.text_name}`).join('\\n');
      const availableColors = colors.map(c => c.name_uk).join(', ');
      const availableSizes = sizes.map(s => s.value).join(', ');

      const promptText = `Розбери групу товарів магазину білизни та одягу.
Код товару: ${article.code}

У нас є такі унікальні артикули (варіанти) для цього коду:
${variantsText}

Доступні кольори в базі: ${availableColors}
Доступні розміри в базі: ${availableSizes}

Зістав кожен варіант ТІЛЬКИ з доступними кольорами та розмірами з наданого списку. Якщо точного збігу немає, поверни null.

Згенеруй також привабливий SEO-опис товару на 2-3 речення, використовуючи розпізнані характеристики (бренд, тип).

Поверни ТІЛЬКИ JSON без жодного тексту навколо:
{
  "brand_name": "назва бренду як є в назві товару або null",
  "product_type": "тип товару українською (піжама/бюстгальтер/труси/купальник/халат/майка/блуза/боді/комплект/шорти/футболка тощо)",
  "base_name": "назва для покупця без розміру і кольору",
  "description": "текст SEO-опису",
  "category_slug": "обери одне: bras/panties/sets/bodysuits/pajamas/robes/nightgowns/swimsuits/bikinis/swim-tunics/towels/hats/sunglasses/flip-flops/suitcases/bags/kids-lingerie/kids-pajamas/kids-swimwear",
  "keywords": "українські ключові слова через кому (синоніми, матеріал, призначення, стать)",
  "gender": "women/men/kids/unisex — визначити з контексту",
  "materials": ["Бавовна", "Еластан"],
  "variants": [
    { "article_id": 123, "color_ua": "обраний колір або null", "size": "обраний розмір або null" }
  ],
  "confidence": 0.95
}`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      // Read headers for rate limiting
      const updateAiMetrics = useAiMetricsStore.getState().updateMetrics;
      updateAiMetrics({
        requestsLimit: response.headers.get('x-ratelimit-limit-requests'),
        requestsRemaining: response.headers.get('x-ratelimit-remaining-requests'),
        requestsReset: response.headers.get('x-ratelimit-reset-requests'),
        tokensLimit: response.headers.get('x-ratelimit-limit-tokens'),
        tokensRemaining: response.headers.get('x-ratelimit-remaining-tokens'),
        tokensReset: response.headers.get('x-ratelimit-reset-tokens'),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
          data.error ||
          data.detail ||
          `HTTP помилка: ${response.status} ${response.statusText}`
        );
      }

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Неочікувана відповідь від API: ' + JSON.stringify(data));
      }

      const text = data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(clean);

      // Знайти бренд по назві
      if (parsedData.brand_name) {
        const found = brands.find(b => 
          b.name.toLowerCase() === parsedData.brand_name.toLowerCase()
        );
        if (found) parsedData.brand_id = found.id;
      }

      // Знайти матеріали
      if (parsedData.materials) {
        parsedData.material_ids = parsedData.materials
          .map(name => materials.find(m => m.name_uk.toLowerCase() === name.toLowerCase())?.id)
          .filter(Boolean);
      }

      const baseCode = article.code; // Use article.code directly
      parsedData.base_article_code = baseCode;

      const existingGroup = await checkExistingGroup(baseCode);

      setCurrentParsed({ article, parsed: parsedData, autoGroup: existingGroup });
    } catch (err) {
      console.error('Parsing error:', err);
      alert('Помилка парсингу для артикула: ' + article.code + '. ' + err.message);
      // Stop the queue on error (especially for 429 Rate Limit)
      setParsingQueue([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveParsed = async (saveData, saveMode, selectedGroupId, selectedPhotos) => {
    try {
      const article = currentParsed.article;
      let targetGroupId = selectedGroupId;

      if (saveMode === 'new') {
        // 1. Create group
        const slug = saveData.base_name.toLowerCase()
          .replace(/[^a-zа-яіїєґ0-9\s]/gi, '')
          .trim()
          .replace(/\s+/g, '-');

        const { data: group, error: groupErr } = await supabase
          .from('product_groups')
          .insert({
            name: saveData.base_name,
            slug: slug + '-' + Date.now(),
            category_id: saveData.category_id || null,
            description: saveData.description || '',
            keywords: saveData.keywords || null,
            base_article_code: saveData.base_article_code || null,
            brand_id: saveData.brand_id || null,
            gender: saveData.gender || null
          })
          .select('id')
          .single();

        if (groupErr) throw groupErr;
        targetGroupId = group.id;

        // 2. Upload photos if any
        if (selectedPhotos && selectedPhotos.length > 0) {
          try {
            const photoPromises = selectedPhotos.map(async (file, index) => {
              const ext = file.name.split('.').pop();
              const path = `${targetGroupId}/${Date.now()}_${index}.${ext}`;
              const url = await uploadProductImage(file, path);
              return {
                group_id: targetGroupId,
                url,
                sort_order: index,
                is_main: index === 0  // ← перше фото головне
              };
            });

            const uploadedPhotos = await Promise.all(photoPromises);

            // 3. Save photos to DB
            if (uploadedPhotos.length > 0) {
              const { error: photoErr } = await supabase
                .from('product_photos')
                .insert(uploadedPhotos);

              if (photoErr) console.error('Error saving photo records:', photoErr);
            }
          } catch (photoUploadError) {
            console.error('Error uploading photos:', photoUploadError);
            alert('Групу створено, але не всі фото вдалося завантажити. Ви можете додати їх пізніше.');
          }
        }
      } else {
        // Existing group
        if (!targetGroupId) throw new Error('Оберіть групу');
      }

      // 4. Create variants
      const variantInserts = (saveData.variants || []).map(v => {
        let colorId = null;
        let sizeId = null;
        if (v.color_ua) {
          const foundColor = colors.find(c => c.name_uk.toLowerCase() === v.color_ua.toLowerCase());
          if (foundColor) colorId = foundColor.id;
        }
        if (v.size) {
          const foundSize = sizes.find(s => s.value.toLowerCase() === v.size.toLowerCase());
          if (foundSize) sizeId = foundSize.id;
        }
        
        return {
          group_id: targetGroupId,
          article_id: v.article_id,
          size: v.size || '',
          color: v.color_ua || '',
          size_id: sizeId,
          color_id: colorId,
          is_main: v.article_id === article.id
        };
      });

      if (variantInserts.length === 0) {
        variantInserts.push({
          group_id: targetGroupId,
          article_id: article.id,
          size: '',
          color: '',
          size_id: null,
          color_id: null,
          is_main: true
        });
      }

      const { error: varErr } = await supabase.from('product_variants').insert(variantInserts);
      if (varErr) throw varErr;

      if (saveData.material_ids?.length > 0) {
        await supabase.from('product_materials').insert(
          saveData.material_ids.map(material_id => ({
            group_id: targetGroupId,
            material_id
          }))
        );
      }

      // Success
      setArticles(prev => prev.filter(a => a.id !== article.id));
      setTotalCount(prev => prev - 1);

      // Next in queue
      setCurrentParsed(null);
      setParsingQueue(prev => prev.slice(1));

    } catch (err) {
      console.error('Save error:', err);
      alert('Помилка при збереженні: ' + err.message);
    }
  };

  const handleCancelParsed = () => {
    setCurrentParsed(null);
    setParsingQueue(prev => prev.slice(1));
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-800">Товари — парсинг</h1>
          <p className="text-sm text-gray-500 mt-1">Непов'язаних артикулів: {totalCount}</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 whitespace-nowrap">
            <input 
              type="checkbox" 
              checked={inStockOnly} 
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Тільки в наявності ({'>'} 0)
          </label>
          <button
            onClick={handleParseSelected}
            disabled={selectedIds.size === 0 || isParsing || parsingQueue.length > 0}
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            Розпарсити обрані ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Пошук за назвою, кодом або штрихкодом..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 sm:text-sm transition-colors"
        />
      </div>

      <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={articles.length > 0 && selectedIds.size === articles.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 font-medium">Код</th>
              <th className="px-4 py-3 font-medium">Назва</th>
              <th className="px-4 py-3 font-medium">Штрихкод</th>
              <th className="px-4 py-3 font-medium">Ціна</th>
              <th className="px-4 py-3 font-medium text-right">Дія</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Завантаження...</td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Немає непов'язаних артикулів</td></tr>
            ) : (
              articles.map(article => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">{article.code}</td>
                  <td className="px-4 py-3">{article.text_name}</td>
                  <td className="px-4 py-3 text-gray-500">{article.barcode}</td>
                  <td className="px-4 py-3">{article.price} грн</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleParseSingle(article)}
                      disabled={isParsing || parsingQueue.length > 0}
                      className="text-xs border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors text-gray-700 font-medium"
                    >
                      Розпарсити
                    </button>
                    <button
                      onClick={() => handleManualSingle(article)}
                      disabled={isParsing || parsingQueue.length > 0}
                      className="text-xs border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors text-gray-700 ml-2 font-medium"
                    >
                      Вручну
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination placeholder if needed */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 bg-white"
          >
            Назад
          </button>
          <span className="text-sm text-gray-500">Сторінка {page + 1}</span>
          <button
            disabled={(page + 1) * 50 >= totalCount}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 bg-white"
          >
            Вперед
          </button>
        </div>
      </div>

      {isParsing && !currentParsed && (
        <div className="fixed inset-0 bg-black bg-opacity-10 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md shadow-lg flex items-center gap-3">
            <Loader2 className="animate-spin text-gray-600 h-6 w-6" />
            <span className="text-gray-700 font-medium">ШІ аналізує товар...</span>
          </div>
        </div>
      )}

      {currentParsed && (
        <ParsingModal
          data={currentParsed}
          groupedCategories={groupedCategories}
          categories={categories}
          brands={brands}
          colors={colors}
          sizes={sizes}
          materials={materials}
          onSave={handleSaveParsed}
          onCancel={handleCancelParsed}
          reloadDicts={reloadDicts}
        />
      )}
    </div>
  );
}

function ParsingModal({ data, groupedCategories, categories, brands, colors, sizes, materials, onSave, onCancel, reloadDicts }) {
  const isManual = data.isManual || false;

  // Try to find the category ID if AI returned a slug
  const matchedCat = categories.find(c => c.slug === data.parsed.category_slug);

  const [formData, setFormData] = useState({
    brand_id: data.parsed.brand_id || '',
    gender: data.parsed.gender || '',
    material_ids: data.parsed.material_ids || [],
    product_type: data.parsed.product_type || '',
    base_name: data.parsed.base_name || '',
    category_id: matchedCat ? matchedCat.id : '',
    category_slug: data.parsed.category_slug || '',
    description: data.parsed.description || '',
    keywords: data.parsed.keywords || '',
    base_article_code: data.parsed.base_article_code || '',
    variants: data.parsed.variants || []
  });

  const [saveMode, setSaveMode] = useState(data.autoGroup ? 'existing' : 'new'); // 'new' | 'existing'
  const [selectedGroupId, setSelectedGroupId] = useState(data.autoGroup ? data.autoGroup.id : '');

  // Quick Add states
  const [quickAddType, setQuickAddType] = useState(null); // 'brand', 'color', 'size', 'material'
  const [quickAddData, setQuickAddData] = useState({});
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const openQuickAdd = (type) => {
    setQuickAddType(type);
    if (type === 'brand') setQuickAddData({ name: '' });
    if (type === 'color') setQuickAddData({ name_uk: '', hex: '#ffffff' });
    if (type === 'size') setQuickAddData({ value: '', size_type: 'standard', sort_order: 0 });
    if (type === 'material') setQuickAddData({ name_uk: '', sort_order: 0 });
  };

  const handleQuickAddSave = async () => {
    if (quickAddType === 'brand' && !quickAddData.name?.trim()) return alert('Введіть назву бренду');
    if (quickAddType === 'color' && !quickAddData.name_uk?.trim()) return alert('Введіть назву кольору');
    if (quickAddType === 'size' && !quickAddData.value?.trim()) return alert('Введіть значення розміру');
    if (quickAddType === 'material' && !quickAddData.name_uk?.trim()) return alert('Введіть назву матеріалу');

    setIsQuickAdding(true);
    try {
      let payload = { ...quickAddData };
      if (quickAddType === 'brand') {
        payload.slug = generateSlug(payload.name);
      }
      if (quickAddType === 'color') {
        payload.slug = generateSlug(payload.name_uk);
      }

      const { data: newRow, error } = await supabase.from(quickAddType + 's').insert(payload).select('*').single();
      if (error) throw error;
      
      await reloadDicts();
      
      if (quickAddType === 'brand') setFormData(prev => ({...prev, brand_id: newRow.id}));
      if (quickAddType === 'color') setFormData(prev => ({...prev, color_id: newRow.id}));
      if (quickAddType === 'size') setFormData(prev => ({...prev, size_id: newRow.id}));
      if (quickAddType === 'material') setFormData(prev => ({...prev, material_ids: [...prev.material_ids, newRow.id]}));
      
      setQuickAddType(null);
    } catch (err) {
      alert('Помилка додавання: ' + err.message);
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Photo states
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup URLs on unmount
      photoPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  const handlePhotoSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    setSelectedPhotos(prev => [...prev, ...files]);

    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (indexToRemove) => {
    setPhotoPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[indexToRemove].url);
      newPreviews.splice(indexToRemove, 1);
      return newPreviews;
    });
    setSelectedPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(indexToRemove, 1);
      return newPhotos;
    });
  };

  const confidence = data.parsed.confidence != null
    ? Math.round(data.parsed.confidence * 100)
    : null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-serif text-gray-800">
            {isManual ? 'Заповніть дані вручну' : 'Перевірте результат ШІ'}
          </h2>
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
            <p><span className="font-medium text-gray-500">Оригінал:</span> {data.article.text_name}</p>
            <p><span className="font-medium text-gray-500">Код:</span> {data.article.code}</p>
            {data.autoGroup && (
              <p className="mt-1 text-green-600 font-medium">Знайдено існуючу групу за артикулом!</p>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500">Бренд</label>
                <button onClick={() => openQuickAdd('brand')} className="text-[10px] text-blue-600 font-medium">+ Створити</button>
              </div>
              <select name="brand_id" value={formData.brand_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="">— Оберіть або залиште порожнім —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Для кого</label>
              <select name="gender" value={formData.gender} onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="">— Оберіть —</option>
                <option value="women">Жінки</option>
                <option value="men">Чоловіки</option>
                <option value="kids">Діти</option>
                <option value="unisex">Унісекс</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип товару</label>
              <input type="text" name="product_type" value={formData.product_type} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Назва для сайту (base_name)</label>
              <input type="text" name="base_name" value={formData.base_name} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none" />
            </div>
            {formData.variants && formData.variants.length > 0 && (
              <div className="col-span-2 mt-4 mb-2">
                <label className="block text-xs font-medium text-gray-500 mb-2">Знайдені варіанти (read-only)</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">ID Артикулу</th>
                        <th className="px-3 py-2 font-medium">Колір (ШІ)</th>
                        <th className="px-3 py-2 font-medium">Розмір (ШІ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.variants.map(v => (
                        <tr key={v.article_id}>
                          <td className="px-3 py-1.5">{v.article_id}</td>
                          <td className={`px-3 py-1.5 ${!v.color_ua && 'text-gray-400 italic'}`}>{v.color_ua || 'Не визначено'}</td>
                          <td className={`px-3 py-1.5 ${!v.size && 'text-gray-400 italic'}`}>{v.size || 'Не визначено'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Категорія</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none bg-white">
                <option value="">-- Оберіть категорію --</option>
                {groupedCategories.map(group => (
                  <optgroup key={group.id} label={group.name_uk}>
                    {group.children.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name_uk}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-500">Матеріали</label>
                <button onClick={() => openQuickAdd('material')} className="text-[10px] text-blue-600 font-medium">+ Створити</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {materials.map(m => (
                  <label key={m.id} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                    formData.material_ids.includes(m.id)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.material_ids.includes(m.id)}
                      onChange={() => {
                        setFormData(prev => ({
                          ...prev,
                          material_ids: prev.material_ids.includes(m.id)
                            ? prev.material_ids.filter(id => id !== m.id)
                            : [...prev.material_ids, m.id]
                        }));
                      }}
                    />
                    {m.name_uk}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Опис товару (ШІ)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-y"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Ключові слова для пошуку
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="труси, нижня білизна, чоловічі, бавовна..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-2">Фотографії</label>
              <div className="flex flex-wrap gap-4">
                {photoPreviews.map((p, idx) => (
                  <div key={idx} className="relative w-20 h-20 border rounded overflow-hidden">
                    <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl">×</button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-gray-400"
                >+</button>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoSelect} />
              </div>
            </div>
          </div>

          {confidence != null && (
            <div className="mb-8">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Впевненість ШІ</span>
                <span>{confidence}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${confidence > 80 ? 'bg-green-500' : confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${confidence}%` }}></div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6">
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" name="saveMode" value="new" checked={saveMode === 'new'} onChange={() => setSaveMode('new')} className="text-gray-800 focus:ring-gray-800" />
                Створити нову групу
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" name="saveMode" value="existing" checked={saveMode === 'existing'} onChange={() => setSaveMode('existing')} className="text-gray-800 focus:ring-gray-800" />
                Додати до існуючої групи
              </label>
            </div>

            {saveMode === 'existing' && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <label className="block text-xs font-medium text-gray-500 mb-1">Шукати групу</label>
                <GroupCombobox
                  value={selectedGroupId}
                  initialName={data.autoGroup ? data.autoGroup.name : ''}
                  onChange={setSelectedGroupId}
                  onSelectNew={(newGroupName) => {
                    setSaveMode('new');
                    setFormData(prev => ({ ...prev, base_name: newGroupName }));
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-md flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50 transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={async () => {
              setIsSaving(true);
              await onSave(formData, saveMode, selectedGroupId, selectedPhotos);
              setIsSaving(false);
            }}
            disabled={isSaving || (saveMode === 'existing' && !selectedGroupId)}
            className="px-4 py-2 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors min-w-[180px] justify-center"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isSaving ? 'Завантаження...' : 'Підтвердити і зберегти'}
          </button>
        </div>
      </div>

      {quickAddType && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-medium mb-4">
              Додати {quickAddType === 'brand' ? 'бренд' : quickAddType === 'color' ? 'колір' : quickAddType === 'size' ? 'розмір' : 'матеріал'}
            </h3>
            
            <div className="space-y-3 mb-6">
              {(quickAddType === 'brand' || quickAddType === 'color' || quickAddType === 'material') && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Назва</label>
                  <input type="text" value={quickAddData.name || quickAddData.name_uk || ''} 
                    onChange={e => setQuickAddData({...quickAddData, [quickAddType === 'brand' ? 'name' : 'name_uk']: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none" />
                </div>
              )}
              {quickAddType === 'size' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Значення</label>
                    <input type="text" value={quickAddData.value} onChange={e => setQuickAddData({...quickAddData, value: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Тип розміру</label>
                    <select value={quickAddData.size_type} onChange={e => setQuickAddData({...quickAddData, size_type: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none">
                      <option value="standard">Стандартний</option>
                      <option value="numeric">Числовий</option>
                      <option value="bra">Бюстгальтер</option>
                      <option value="combined">Комбінований</option>
                      <option value="kids">Дитячий</option>
                    </select>
                  </div>
                </>
              )}
              {quickAddType === 'color' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">HEX-код</label>
                  <div className="flex gap-2">
                    <input type="color" value={quickAddData.hex} onChange={e => setQuickAddData({...quickAddData, hex: e.target.value})} className="h-9 w-9 p-0 border-0 rounded cursor-pointer" />
                    <input type="text" value={quickAddData.hex} onChange={e => setQuickAddData({...quickAddData, hex: e.target.value})} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              )}
              {(quickAddType === 'size' || quickAddType === 'material') && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Сортування (0=найвище)</label>
                  <input type="number" value={quickAddData.sort_order} onChange={e => setQuickAddData({...quickAddData, sort_order: parseInt(e.target.value)||0})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setQuickAddType(null)} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors">Скасувати</button>
              <button onClick={handleQuickAddSave} disabled={isQuickAdding} className="px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {isQuickAdding ? 'Збереження...' : 'Додати'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function GroupCombobox({ value, initialName, onChange, onSelectNew }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedName, setSelectedName] = useState(initialName || '');

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      const safeQuery = query.replace(/[,%]/g, '');
      const { data } = await supabase
        .from('product_groups')
        .select('id, name, base_article_code')
        .or(`name.ilike.%${safeQuery}%,base_article_code.ilike.%${safeQuery}%`)
        .limit(10);

      setResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Пошук за назвою або базовим артикулом..."
        value={isOpen ? query : selectedName}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          onChange(''); // Reset selected id when typing
        }}
        onFocus={() => {
          setIsOpen(true);
          setQuery('');
        }}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none bg-white"
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" /> Пошук...
            </div>
          ) : (
            <>
              {results.map(g => (
                <div
                  key={g.id}
                  onClick={() => {
                    onChange(g.id);
                    setSelectedName(g.name);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium">{g.name}</div>
                  {g.base_article_code && <div className="text-xs text-gray-500">Код: {g.base_article_code}</div>}
                </div>
              ))}

              <div
                onClick={() => {
                  setIsOpen(false);
                  onSelectNew(query);
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-blue-600 font-medium"
              >
                + Створити нову групу: "{query || 'Без назви'}"
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function generateSlug(text) {
  if (!text) return '';
  const ukr = {
    'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch',
    'ш':'sh','щ':'shch','ю':'yu','я':'ya','ь':''
  };
  return text
    .toLowerCase()
    .split('')
    .map(char => ukr[char] || char)
    .join('')
    .replace(/[^a-z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
