import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';

export default function AdminDictionaries() {
  const [activeTab, setActiveTab] = useState('brands');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Стан для редагування / створення
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  async function fetchData(tab) {
    setLoading(true);
    let query = supabase.from(tab).select('*');
    
    if (tab === 'brands') query = query.order('name');
    if (tab === 'colors') query = query.order('name_uk');
    if (tab === 'sizes' || tab === 'materials') query = query.order('sort_order');
    
    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  }

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleCreateNew = () => {
    setEditingId('new');
    if (activeTab === 'brands') setEditForm({ name: '' });
    if (activeTab === 'colors') setEditForm({ name_uk: '', hex: '#ffffff' });
    if (activeTab === 'sizes') setEditForm({ value: '', size_type: 'standard', sort_order: 0 });
    if (activeTab === 'materials') setEditForm({ name_uk: '', sort_order: 0 });
  };

  const handleSave = async () => {
    if (activeTab === 'brands' && !editForm.name?.trim()) return alert('Введіть назву бренду');
    if (activeTab === 'colors' && !editForm.name_uk?.trim()) return alert('Введіть назву кольору');
    if (activeTab === 'sizes' && !editForm.value?.trim()) return alert('Введіть значення розміру');
    if (activeTab === 'materials' && !editForm.name_uk?.trim()) return alert('Введіть назву матеріалу');

    setIsSaving(true);
    try {
      let payload = { ...editForm };
      
      if (activeTab === 'brands' && editingId === 'new') {
        payload.slug = generateSlug(payload.name);
      }
      
      if (activeTab === 'colors' && editingId === 'new') {
        payload.slug = generateSlug(payload.name_uk);
      }

      if (editingId === 'new') {
        const { error } = await supabase.from(activeTab).insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(activeTab).update(payload).eq('id', editingId);
        if (error) throw error;
      }
      await fetchData(activeTab);
      handleCancel();
    } catch (error) {
      alert('Помилка збереження: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Видалити цей запис?')) return;
    try {
      await supabase.from(activeTab).delete().eq('id', id);
      await fetchData(activeTab);
    } catch (error) {
      alert('Помилка видалення: ' + error.message);
    }
  };

  const renderTableHeaders = () => {
    if (activeTab === 'brands') return <th>Назва</th>;
    if (activeTab === 'colors') return <><th>Назва (УКР)</th><th>HEX-код</th></>;
    if (activeTab === 'sizes') return <><th>Значення</th><th>Тип</th><th>Сортування</th></>;
    if (activeTab === 'materials') return <><th>Назва (УКР)</th><th>Сортування</th></>;
  };

  const renderEditRow = () => {
    return (
      <tr className="bg-gray-50 border-b border-gray-100">
        <td colSpan="4" className="p-4">
          <div className="flex gap-4 items-end">
            {activeTab === 'brands' && (
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Назва бренду</label>
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            )}

            {activeTab === 'colors' && (
              <>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Назва (укр)</label>
                  <input type="text" value={editForm.name_uk || ''} onChange={e => setEditForm({...editForm, name_uk: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-gray-500 mb-1">HEX колір</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editForm.hex || '#ffffff'} onChange={e => setEditForm({...editForm, hex: e.target.value})} className="h-9 w-9 p-0 border-0 rounded cursor-pointer" />
                    <input type="text" value={editForm.hex || ''} onChange={e => setEditForm({...editForm, hex: e.target.value})} className="w-full border rounded px-2 py-2 text-sm" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'sizes' && (
              <>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Значення</label>
                  <input type="text" value={editForm.value || ''} onChange={e => setEditForm({...editForm, value: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Тип</label>
                  <select value={editForm.size_type || 'standard'} onChange={e => setEditForm({...editForm, size_type: e.target.value})} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="standard">Стандартні (XS, S...)</option>
                    <option value="numeric">Числові (36, 38...)</option>
                    <option value="bra">Бюстгальтери (75B...)</option>
                    <option value="combined">Комбіновані (S/M...)</option>
                    <option value="kids">Дитячі (5/6...)</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">Сорт.</label>
                  <input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: parseInt(e.target.value) || 0})} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </>
            )}

            {activeTab === 'materials' && (
              <>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Назва (укр)</label>
                  <input type="text" value={editForm.name_uk || ''} onChange={e => setEditForm({...editForm, name_uk: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">Сорт.</label>
                  <input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: parseInt(e.target.value) || 0})} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button onClick={handleCancel} className="bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderRow = (item) => {
    return (
      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {activeTab === 'brands' && <td className="p-4">{item.name}</td>}
        
        {activeTab === 'colors' && (
          <>
            <td className="p-4">{item.name_uk}</td>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: item.hex || '#fff' }}></div>
                <span className="text-sm text-gray-500 font-mono">{item.hex}</span>
              </div>
            </td>
          </>
        )}

        {activeTab === 'sizes' && (
          <>
            <td className="p-4 font-medium">{item.value}</td>
            <td className="p-4 text-sm text-gray-500">{item.size_type}</td>
            <td className="p-4 text-sm text-gray-500">{item.sort_order}</td>
          </>
        )}

        {activeTab === 'materials' && (
          <>
            <td className="p-4">{item.name_uk}</td>
            <td className="p-4 text-sm text-gray-500">{item.sort_order}</td>
          </>
        )}

        <td className="p-4 text-right">
          <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded mr-2">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  const tabs = [
    { id: 'brands', label: 'Бренди' },
    { id: 'colors', label: 'Кольори' },
    { id: 'sizes', label: 'Розміри' },
    { id: 'materials', label: 'Матеріали' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-serif text-gray-800">Довідники</h1>
        <button
          onClick={handleCreateNew}
          disabled={editingId === 'new'}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Додати запис
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEditingId(null); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-gray-900 text-gray-900 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                {renderTableHeaders()}
                <th className="p-4 w-24">Дії</th>
              </tr>
            </thead>
            <tbody>
              {editingId === 'new' && renderEditRow()}
              
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 && editingId !== 'new' ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Немає записів
                  </td>
                </tr>
              ) : (
                items.map(item => editingId === item.id ? renderEditRow() : renderRow(item))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
