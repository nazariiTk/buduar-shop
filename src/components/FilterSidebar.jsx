import { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function FilterSidebar({
  categories, selectedCategory, onSelectCategory,
  searchQuery, onSearchChange
}) {
  const level1 = categories.filter(c => !c.parent_id);
  const level2 = categories.filter(c => 
    level1.some(l => l.id === c.parent_id)
  );
  const level3 = categories.filter(c => 
    level2.some(l => l.id === c.parent_id)
  );

  // Визначаємо активний таб по обраній категорії
  const getActiveTab = () => {
    if (!selectedCategory) return null;
    const cat = categories.find(c => c.slug === selectedCategory);
    if (!cat) return null;
    if (!cat.parent_id) return cat.slug; // це сам таб
    const parent = categories.find(c => c.id === cat.parent_id);
    if (!parent?.parent_id) return parent?.slug; // рівень 2 → таб
    const grandparent = categories.find(c => c.id === parent?.parent_id);
    return grandparent?.slug; // рівень 3 → таб
  };

  const [activeTab, setActiveTab] = useState(getActiveTab() || level1[0]?.slug);

  const activeTabObj = level1.find(c => c.slug === activeTab);
  const typesForTab = level2.filter(c => c.parent_id === activeTabObj?.id);

  // Який тип розгорнутий
  const getExpandedType = () => {
    if (!selectedCategory) return null;
    const cat = categories.find(c => c.slug === selectedCategory);
    if (!cat) return null;
    if (level3.some(l => l.id === cat.id)) {
      return categories.find(c => c.id === cat.parent_id)?.slug;
    }
    if (level2.some(l => l.id === cat.id)) return cat.slug;
    return null;
  };

  const [expandedType, setExpandedType] = useState(getExpandedType());

  return (
    <div className="space-y-5">
      {/* Пошук */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Пошук товарів..."
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Таби статі */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {level1.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.slug);
              setExpandedType(null);
              onSelectCategory(tab.slug);
            }}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.slug
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.name_uk}
          </button>
        ))}
      </div>

      {/* Кнопка "Всі" для поточного табу */}
      <button
        onClick={() => {
          setExpandedType(null);
          onSelectCategory(activeTab);
        }}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
          selectedCategory === activeTab
            ? 'bg-gray-100 font-medium text-gray-900'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Всі {activeTabObj?.name_uk.toLowerCase()}
      </button>

      {/* Типи і підтипи */}
      <div className="space-y-0.5">
        {typesForTab.map(type => {
          const subtypes = level3.filter(c => c.parent_id === type.id);
          const isExpanded = expandedType === type.slug;
          const isTypeSelected = selectedCategory === type.slug;

          return (
            <div key={type.id}>
              <button
                onClick={() => {
                  if (isExpanded) {
                    setExpandedType(null);
                  } else {
                    setExpandedType(type.slug);
                  }
                  onSelectCategory(type.slug);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${
                  isTypeSelected || isExpanded
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type.name_uk}
                {subtypes.length > 0 && (
                  <span className={`text-gray-400 text-xs transition-transform duration-200 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}>›</span>
                )}
              </button>

              {/* Підтипи */}
              {isExpanded && subtypes.length > 0 && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  <button
                    onClick={() => onSelectCategory(type.slug)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      selectedCategory === type.slug
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Всі {type.name_uk.toLowerCase()}
                  </button>
                  {subtypes.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => onSelectCategory(sub.slug)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        selectedCategory === sub.slug
                          ? 'bg-[var(--color-primary-light)] text-[var(--color-text)] font-medium px-2'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {sub.name_uk}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
