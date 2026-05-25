import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadProductImage, deleteProductImage } from '../../services/storage.service';
import { Loader2, Edit, Image as ImageIcon, Check, X, Plus, Trash2, Star, Layers } from 'lucide-react';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Categories
  const [categories, setCategories] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState([]);

  // Modals state
  const [editGroup, setEditGroup] = useState(null); // { id, name, description, category_id, is_active }
  const [photoGroup, setPhotoGroup] = useState(null); // The whole group object
  const [variantsGroup, setVariantsGroup] = useState(null);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Dictionaries
  const [brands, setBrands] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetchData();
    fetchCategories();
    loadDicts();
  }, []);

  async function loadDicts() {
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
  }

  async function fetchCategories() {
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

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_groups')
      .select(`
        *,
        product_photos(id, url, is_main, sort_order),
        product_variants(id, size, color, article_id, is_main)
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setGroups(data);
    }
    setLoading(false);
  }

  const toggleActive = async (group) => {
    const { error } = await supabase
      .from('product_groups')
      .update({ is_active: !group.is_active })
      .eq('id', group.id);
      
    if (!error) {
      setGroups(groups.map(g => g.id === group.id ? { ...g, is_active: !group.is_active } : g));
    }
  };

  const getMainPhoto = (photos) => {
    if (!photos || photos.length === 0) return null;
    const main = photos.find(p => p.is_main);
    return main ? main.url : photos[0].url;
  };

  const handleEditChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditGroup(prev => ({ ...prev, [e.target.name]: value }));
  };

  const saveEditGroup = async () => {
    setSaving(true);
    
    // Знаходимо slug категорії, якщо вона вибрана (для зворотної сумісності)
    const selectedCat = categories.find(c => c.id === Number(editGroup.category_id));
    
    const { error } = await supabase
      .from('product_groups')
      .update({
        name: editGroup.name,
        description: editGroup.description,
        category_id: editGroup.category_id || null,
        category: selectedCat ? selectedCat.slug : null,
        keywords: editGroup.keywords || null,
        is_active: editGroup.is_active,
        brand_id: editGroup.brand_id || null,
        gender: editGroup.gender || null,
        care_instructions: editGroup.care_instructions || null
      })
      .eq('id', editGroup.id);

    if (!error) {
      setGroups(groups.map(g => g.id === editGroup.id ? { ...g, ...editGroup } : g));
      setEditGroup(null);
    } else {
      alert("Помилка збереження: " + error.message);
    }
    setSaving(false);
  };

  // PHOTOS LOGIC
  const handleUploadPhotos = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSaving(true);
    const files = Array.from(e.target.files);
    
    let hasMain = photoGroup.product_photos.some(p => p.is_main);
    const newPhotos = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isFirstNew = i === 0 && !hasMain && photoGroup.product_photos.length === 0;
      
      const url = await uploadProductImage(file);
      if (url) {
        const { data } = await supabase
          .from('product_photos')
          .insert({
            group_id: photoGroup.id,
            url: url,
            is_main: isFirstNew,
            sort_order: photoGroup.product_photos.length + i
          })
          .select()
          .single();
          
        if (data) newPhotos.push(data);
      }
    }
    
    const updatedGroup = {
      ...photoGroup,
      product_photos: [...photoGroup.product_photos, ...newPhotos]
    };
    setPhotoGroup(updatedGroup);
    setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    setSaving(false);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSetMainPhoto = async (photoId) => {
    setSaving(true);
    // 1. Reset all
    await supabase
      .from('product_photos')
      .update({ is_main: false })
      .eq('group_id', photoGroup.id);
      
    // 2. Set new main
    await supabase
      .from('product_photos')
      .update({ is_main: true })
      .eq('id', photoId);
      
    const updatedPhotos = photoGroup.product_photos.map(p => ({
      ...p,
      is_main: p.id === photoId
    }));
    
    const updatedGroup = { ...photoGroup, product_photos: updatedPhotos };
    setPhotoGroup(updatedGroup);
    setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    setSaving(false);
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('Видалити це фото?')) return;
    setSaving(true);
    
    try {
      const path = photo.url.split('/products/')[1];
      if (path) {
        await deleteProductImage(path);
      }
      
      await supabase.from('product_photos').delete().eq('id', photo.id);
      
      const updatedPhotos = photoGroup.product_photos.filter(p => p.id !== photo.id);
      const updatedGroup = { ...photoGroup, product_photos: updatedPhotos };
      setPhotoGroup(updatedGroup);
      setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    } catch (err) {
      alert("Помилка видалення: " + err.message);
    }
    
    setSaving(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-serif text-gray-800">Групи товарів</h1>
      </div>

      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Фото</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Назва</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категорія</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Варіанти</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Дії</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-medium">
                    Груп не знайдено
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const mainPhoto = getMainPhoto(group.product_photos);
                  const catName = categories.find(c => c.id === group.category_id)?.name_uk 
                    || categories.find(c => c.slug === group.category)?.name_uk 
                    || 'Не вказано';

                  return (
                    <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                          {mainPhoto ? (
                            <img src={mainPhoto} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        <div className="text-xs text-gray-500">Код: {group.base_article_code || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {catName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {group.product_variants ? group.product_variants.length : 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleActive(group)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            group.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {group.is_active ? 'Активний' : 'Прихований'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditGroup({ ...group })}
                            className="text-gray-600 hover:text-[var(--color-primary)] p-1 border border-gray-200 rounded bg-white"
                            title="Редагувати"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPhotoGroup(group)}
                            className="text-gray-600 hover:text-blue-600 p-1 border border-gray-200 rounded bg-white relative"
                            title="Фото"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                              {group.product_photos?.length || 0}
                            </span>
                          </button>
                          <button
                            onClick={() => setVariantsGroup(group)}
                            className="text-gray-600 hover:text-purple-600 p-1 border border-gray-200 rounded bg-white relative"
                            title="Варіанти"
                          >
                            <Layers className="h-4 w-4" />
                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                              {group.product_variants?.length || 0}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Редагувати групу</h3>
              <button onClick={() => setEditGroup(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва групи</label>
                <input
                  type="text"
                  name="name"
                  value={editGroup.name || ''}
                  onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категорія</label>
                <select
                  name="category_id"
                  value={editGroup.category_id || ''}
                  onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                >
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                <select
                  name="brand_id"
                  value={editGroup.brand_id || ''}
                  onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                >
                  <option value="">— Оберіть або залиште порожнім —</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Для кого (Стать)</label>
                <select
                  name="gender"
                  value={editGroup.gender || ''}
                  onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                >
                  <option value="">— Оберіть —</option>
                  <option value="women">Жінки</option>
                  <option value="men">Чоловіки</option>
                  <option value="kids">Діти</option>
                  <option value="unisex">Унісекс</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
                <textarea
                  name="description"
                  value={editGroup.description || ''}
                  onChange={handleEditChange}
                  rows="4"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ключові слова (через кому)</label>
                <input
                  type="text"
                  name="keywords"
                  value={editGroup.keywords || ''}
                  onChange={handleEditChange}
                  placeholder="труси, нижня білизна, чоловічі, бавовна..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Інструкція з догляду</label>
                <textarea
                  name="care_instructions"
                  value={editGroup.care_instructions || ''}
                  onChange={handleEditChange}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                ></textarea>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={editGroup.is_active || false}
                  onChange={handleEditChange}
                  className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Активний товар (відображається в каталозі)
                </label>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t flex justify-end gap-3 rounded-b-md">
              <button
                onClick={() => setEditGroup(null)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Скасувати
              </button>
              <button
                onClick={saveEditGroup}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none"
              >
                {saving && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTOS MODAL */}
      {photoGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Фотографії групи</h3>
                <p className="text-sm text-gray-500">{photoGroup.name}</p>
              </div>
              <button onClick={() => setPhotoGroup(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-700">Завантажені фотографії ({photoGroup.product_photos?.length || 0})</h4>
                <div>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleUploadPhotos}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Додати фото
                  </button>
                </div>
              </div>
              
              {photoGroup.product_photos?.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Немає фотографій</h3>
                  <p className="mt-1 text-sm text-gray-500">Завантажте фотографії для цієї групи товарів.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photoGroup.product_photos
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map((photo) => (
                    <div key={photo.id} className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      photo.is_main ? 'border-green-400' : 'border-gray-200'
                    }`}>
                      <div className="aspect-[3/4]">
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      
                      {photo.is_main && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-sm flex items-center">
                          <Star className="h-3 w-3 mr-1 fill-white" />
                          Головне
                        </div>
                      )}
                      
                      <div className="flex gap-1 p-2 bg-gray-50 border-t border-gray-200">
                        {!photo.is_main && (
                          <button
                            onClick={() => handleSetMainPhoto(photo.id)}
                            disabled={saving}
                            className="flex-1 text-xs py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                          >
                            Зробити головним
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={saving}
                          className={`px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 text-xs ${photo.is_main ? 'w-full' : ''}`}
                          title="Видалити"
                        >
                          <Trash2 className="h-3 w-3 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VARIANTS MODAL */}
      {variantsGroup && (
        <VariantsModal
          group={variantsGroup}
          onClose={() => setVariantsGroup(null)}
          onUpdate={(updatedGroup) => {
            setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
            setVariantsGroup(updatedGroup);
          }}
        />
      )}
    </div>
  );
}

function VariantsModal({ group, onClose, onUpdate }) {
  const [variants, setVariants] = useState(group.product_variants || []);
  const [articles, setArticles] = useState({});
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(null); // variant id який переміщуємо
  const [groupSearch, setGroupSearch] = useState('');
  const [groupResults, setGroupResults] = useState([]);

  // Завантажуємо деталі артикулів (ціна, назва з облікової)
  useEffect(() => {
    async function loadArticles() {
      const ids = variants.map(v => v.article_id).filter(Boolean);
      if (ids.length === 0) { setLoading(false); return; }
      
      const { data } = await supabase
        .from('product_view')
        .select('article_id, text_name, price, quantity, shop_name')
        .in('article_id', ids);
      
      // Групуємо по article_id
      const map = {};
      data?.forEach(row => {
        if (!map[row.article_id]) {
          map[row.article_id] = { ...row, shops: [] };
        }
        map[row.article_id].shops.push({
          shop_name: row.shop_name,
          quantity: row.quantity
        });
      });
      
      setArticles(map);
      setLoading(false);
    }
    loadArticles();
  }, [variants]);

  // Пошук груп для переміщення
  useEffect(() => {
    if (!groupSearch.trim()) { setGroupResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('product_groups')
        .select('id, name')
        .ilike('name', `%${groupSearch}%`)
        .neq('id', group.id)
        .limit(8);
      setGroupResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [groupSearch, group.id]);

  const handleDelete = async (variant) => {
    if (!window.confirm(`Видалити варіант ${variant.size || ''} ${variant.color || ''}?`)) return;
    
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variant.id);
    
    if (!error) {
      const updated = variants.filter(v => v.id !== variant.id);
      setVariants(updated);
      onUpdate({ ...group, product_variants: updated });
    }
  };

  const handleSetMain = async (variant) => {
    // Скидаємо всі is_main для групи
    await supabase
      .from('product_variants')
      .update({ is_main: false })
      .eq('group_id', group.id);
    
    // Встановлюємо новий main
    await supabase
      .from('product_variants')
      .update({ is_main: true })
      .eq('id', variant.id);
    
    const updated = variants.map(v => ({ ...v, is_main: v.id === variant.id }));
    setVariants(updated);
    onUpdate({ ...group, product_variants: updated });
  };

  const handleMove = async (variant, targetGroupId) => {
    const { error } = await supabase
      .from('product_variants')
      .update({ group_id: targetGroupId, is_main: false })
      .eq('id', variant.id);
    
    if (!error) {
      const updated = variants.filter(v => v.id !== variant.id);
      setVariants(updated);
      onUpdate({ ...group, product_variants: updated });
      setMoving(null);
      setGroupSearch('');
      setGroupResults([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Варіанти групи</h3>
            <p className="text-sm text-gray-500">{group.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Завантаження...</div>
          ) : variants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Варіантів немає</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Артикул / Назва</th>
                  <th className="px-3 py-2 text-left">Розмір</th>
                  <th className="px-3 py-2 text-left">Колір</th>
                  <th className="px-3 py-2 text-right">Ціна</th>
                  <th className="px-3 py-2 text-center">Наявність</th>
                  <th className="px-3 py-2 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map(variant => {
                  const art = articles[variant.article_id];
                  const totalQty = art?.shops?.reduce((s, sh) => s + (sh.quantity || 0), 0) || 0;
                  
                  return (
                    <React.Fragment key={variant.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">
                            {variant.article_id}
                            {variant.is_main && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Головний
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]" title={art?.text_name}>
                            {art?.text_name || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-3">{variant.size || '—'}</td>
                        <td className="px-3 py-3">{variant.color || '—'}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">{art?.price || '—'} грн</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            totalQty > 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {totalQty > 0 ? `${totalQty} шт` : 'Немає'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            {!variant.is_main && (
                              <button
                                onClick={() => handleSetMain(variant)}
                                className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                                title="Зробити головним"
                              >
                                ★
                              </button>
                            )}
                            <button
                              onClick={() => setMoving(moving === variant.id ? null : variant.id)}
                              className="text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 text-blue-600"
                              title="Перемістити в іншу групу"
                            >
                              →
                            </button>
                            <button
                              onClick={() => handleDelete(variant)}
                              className="text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600"
                              title="Видалити варіант"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Рядок переміщення */}
                      {moving === variant.id && (
                        <tr className="bg-blue-50">
                          <td colSpan="6" className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-700 font-medium whitespace-nowrap">
                                Перемістити до:
                              </span>
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={groupSearch}
                                  onChange={e => setGroupSearch(e.target.value)}
                                  placeholder="Пошук групи..."
                                  className="w-full border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none"
                                  autoFocus
                                />
                                {groupResults.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                                    {groupResults.map(g => (
                                      <div
                                        key={g.id}
                                        onClick={() => handleMove(variant, g.id)}
                                        className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-50"
                                      >
                                        {g.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => { setMoving(null); setGroupSearch(''); }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Скасувати
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
