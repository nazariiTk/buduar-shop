import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-sm font-semibold text-gray-800 mb-3"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  );
}

export default function FilterSidebar({
  sizes, colors, brands,
  selectedSizes, selectedColors, selectedBrands,
  priceRange,
  onSizeToggle, onColorToggle, onBrandToggle,
  onPriceChange, onReset
}) {
  const hasFilters = selectedSizes.size > 0 || selectedColors.size > 0 || 
                     selectedBrands.size > 0 || priceRange.min || priceRange.max;

  // Групуємо розміри по типу
  const sizeGroups = [
    { label: 'Стандартні', type: 'standard' },
    { label: 'Комбіновані', type: 'combined' },
    { label: 'Числові', type: 'numeric' },
    { label: 'Бюстгальтерні', type: 'bra' },
    { label: 'Дитячі', type: 'kids' },
  ].map(g => ({
    ...g,
    items: sizes.filter(s => s.size_type === g.type)
  })).filter(g => g.items.length > 0);

  const [expandedSizeGroup, setExpandedSizeGroup] = useState('standard');

  return (
    <div>
      {/* Заголовок + скинути */}
      <div className="flex justify-between items-center mb-2 py-2">
        <h3 className="font-semibold text-gray-900">Фільтри</h3>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Скинути все
          </button>
        )}
      </div>

      {/* ЦІНА */}
      <FilterSection title="Ціна, грн">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="від"
            value={priceRange.min}
            onChange={e => onPriceChange({ ...priceRange, min: e.target.value })}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={e => onPriceChange({ ...priceRange, max: e.target.value })}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
      </FilterSection>

      {/* РОЗМІРИ */}
      {sizes.length > 0 && (
        <FilterSection title="Розмір">
          {/* Таби типів розмірів */}
          <div className="flex flex-wrap gap-1 mb-3">
            {sizeGroups.map(g => (
              <button
                key={g.type}
                onClick={() => setExpandedSizeGroup(g.type)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  expandedSizeGroup === g.type
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Кнопки розмірів */}
          <div className="flex flex-wrap gap-1.5">
            {sizeGroups
              .find(g => g.type === expandedSizeGroup)
              ?.items.map(size => (
                <button
                  key={size.id}
                  onClick={() => onSizeToggle(size.id)}
                  className={`px-3 py-1.5 border rounded text-xs font-medium transition-colors ${
                    selectedSizes.has(size.id)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {size.value}
                </button>
              ))}
          </div>
        </FilterSection>
      )}

      {/* КОЛЬОРИ */}
      {colors.length > 0 && (
        <FilterSection title="Колір">
          <div className="flex flex-wrap gap-2">
            {colors.map(color => (
              <button
                key={color.id}
                onClick={() => onColorToggle(color.id)}
                title={color.name_uk}
                className={`relative w-7 h-7 rounded-full border-2 transition-all ${
                  selectedColors.has(color.id)
                    ? 'border-gray-800 scale-110'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{ backgroundColor: color.hex || '#cccccc' }}
              >
                {/* Білий колір — додаємо рамку щоб було видно */}
                {color.hex === '#ffffff' && (
                  <span className="absolute inset-0 rounded-full border border-gray-200" />
                )}
                {selectedColors.has(color.id) && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${
                      ['#ffffff', '#fffff0', '#fdfdf0'].includes(color.hex) 
                        ? 'text-gray-800' : 'text-white'
                    }`}>✓</span>
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Назви обраних кольорів */}
          {selectedColors.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {colors.filter(c => selectedColors.has(c.id)).map(c => (
                <span key={c.id} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {c.name_uk}
                </span>
              ))}
            </div>
          )}
        </FilterSection>
      )}

      {/* БРЕНДИ */}
      {brands.length > 0 && (
        <FilterSection title="Бренд" defaultOpen={false}>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {brands.map(brand => (
              <label key={brand.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedBrands.has(brand.id)}
                  onChange={() => onBrandToggle(brand.id)}
                  className="rounded border-gray-300 text-gray-800 focus:ring-gray-500"
                />
                <span className={`text-sm transition-colors ${
                  selectedBrands.has(brand.id) 
                    ? 'text-gray-900 font-medium' 
                    : 'text-gray-600 group-hover:text-gray-900'
                }`}>
                  {brand.name}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}
