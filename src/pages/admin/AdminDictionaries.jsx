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
    if (tab === 'colors') query = query.order('name');
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
    if (activeTab === 'colors') setEditForm({ name: '', hex: '#ffffff' });
    if (activeTab === 'sizes') setEditForm({ value: '', size_type: 'standard', sort_order: 0 });
    if (activeTab === 'materials') setEditForm({ name: '', sort_order: 0 });
  };

  const handleSave = async () => {
    if (activeTab === 'brands' && !editForm.name?.trim()) return alert('Введіть назву бренду');
    if (activeTab === 'colors' && !editForm.name?.trim()) return alert('Введіть назву кольору');
    if (activeTab === 'sizes' && !editForm.name?.trim()) return alert('Введіть значення розміру');
    if (activeTab === 'materials' && !editForm.name?.trim()) return alert('Введіть назву матеріалу');

    setIsSaving(true);
    try {
      let payload = { ...editForm };
      
      if (activeTab === 'brands' && editingId === 'new') {
        payload.slug = generateSlug(payload.name);
      }
      
      if (activeTab === 'colors' && editingId === 'new') {
        payload.slug = generateSlug(payload.name);
      }

      if (activeTab === 'sizes' && editingId === 'new') {
        payload.slug = generateSlug(payload.name);
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
    if (activeTab === 'brands') return <th className="p-4">Назва</th>;
    if (activeTab === 'colors') return <><th className="p-4">Назва</th><th className="p-4">HEX-код</th></>;
    if (activeTab === 'sizes') return <><th className="p-4">Значення</th><th className="p-4">Тип</th><th className="p-4">Сортування</th></>;
    if (activeTab === 'materials') return <><th className="p-4">Назва</th><th className="p-4">Сортування</th></>;
  };

  const renderEditRow = () => {
    return (
      <tr className="bg-surface-muted/40 border-b border-border/30">
        <td colSpan="5" className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {activeTab === 'brands' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-text-light mb-1">Назва бренду</label>
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
              </div>
            )}

            {activeTab === 'colors' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-text-light mb-1">Назва кольору</label>
                  <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
                </div>
                <div className="w-36">
                  <label className="block text-xs font-medium text-text-light mb-1">HEX колір</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editForm.hex || '#ffffff'} onChange={e => setEditForm({...editForm, hex: e.target.value})} className="h-9 w-9 p-0 border border-border/30 rounded cursor-pointer" />
                    <input type="text" value={editForm.hex || ''} onChange={e => setEditForm({...editForm, hex: e.target.value})} className="w-full border border-border/40 rounded px-2 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'sizes' && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-text-light mb-1">Значення</label>
                  <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-text-light mb-1">Тип</label>
                  <select value={editForm.size_type || 'standard'} onChange={e => setEditForm({...editForm, size_type: e.target.value})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary">
                    <option value="standard">Стандартні (XS, S...)</option>
                    <option value="numeric">Числові (36, 38...)</option>
                    <option value="bra">Бюстгальтери (75B...)</option>
                    <option value="combined">Комбіновані (S/M...)</option>
                    <option value="kids">Дитячі (5/6...)</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-text-light mb-1">Сорт.</label>
                  <input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: parseInt(e.target.value) || 0})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
                </div>
              </>
            )}

            {activeTab === 'materials' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-text-light mb-1">Назва матеріалу</label>
                  <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-text-light mb-1">Сорт.</label>
                  <input type="number" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: parseInt(e.target.value) || 0})} className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary" />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isSaving} className="bg-primary text-on-primary p-2 rounded hover:bg-primary-hover transition-colors shadow-sm" title="Зберегти">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button onClick={handleCancel} className="border border-border/40 bg-surface text-text p-2 rounded hover:bg-surface-muted transition-colors" title="Скасувати">
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
      <tr key={item.id} className="border-b border-border/20 hover:bg-surface-muted/30 transition-colors">
        {activeTab === 'brands' && <td className="p-4 font-medium text-text">{item.name}</td>}
        
        {activeTab === 'colors' && (
          <>
            <td className="p-4 font-medium text-text">{item.name}</td>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-border/30 shadow-xs" style={{ backgroundColor: item.hex || '#fff' }}></div>
                <span className="text-sm text-text-light font-mono">{item.hex}</span>
              </div>
            </td>
          </>
        )}

        {activeTab === 'sizes' && (
          <>
            <td className="p-4 font-medium text-text">{item.name}</td>
            <td className="p-4 text-sm text-text-light">{item.size_type}</td>
            <td className="p-4 text-sm text-text-light font-mono">{item.sort_order}</td>
          </>
        )}

        {activeTab === 'materials' && (
          <>
            <td className="p-4 font-medium text-text">{item.name}</td>
            <td className="p-4 text-sm text-text-light font-mono">{item.sort_order}</td>
          </>
        )}

        <td className="p-4 text-right whitespace-nowrap">
          <button onClick={() => handleEdit(item)} className="p-1.5 text-text-light hover:text-primary hover:bg-surface-muted rounded mr-1 transition-colors" title="Редагувати">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-danger/80 hover:text-danger hover:bg-danger/10 rounded transition-colors" title="Видалити">
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
        <h1 className="text-3xl font-serif text-text">Довідники</h1>
        <button
          onClick={handleCreateNew}
          disabled={editingId === 'new'}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Додати запис
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-border/30 overflow-hidden">
        <div className="flex border-b border-border/30 bg-surface-muted/30">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEditingId(null); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-primary text-primary bg-surface font-semibold' 
                  : 'border-transparent text-text-light hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted/60 text-xs text-text-light uppercase border-b border-border/30">
                {renderTableHeaders()}
                <th className="p-4 w-24 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-text">
              {editingId === 'new' && renderEditRow()}
              
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-text-light">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : items.length === 0 && editingId !== 'new' ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-text-light">
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
