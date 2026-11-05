import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getName } from '../utils/format';

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length !== 6 && clean.length !== 3) return false;
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.82;
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/25 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-base font-serif font-semibold text-text mb-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-text-light transition-transform ${open ? 'rotate-180' : ''}`} />
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
      <div className="flex justify-between items-center mb-2 py-2 border-b border-border/25">
        <h3 className="font-serif text-lg font-semibold text-text tracking-wide">Фільтри</h3>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-text-light hover:text-primary transition-colors underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Скинути все
          </button>
        )}
      </div>

      {/* ЦІНА */}
      <FilterSection title="Ціна, ₴">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="від"
            value={priceRange.min}
            onChange={e => onPriceChange({ ...priceRange, min: e.target.value })}
            className="w-full bg-surface text-text border border-border/40 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-text-light text-sm">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={e => onPriceChange({ ...priceRange, max: e.target.value })}
            className="w-full bg-surface text-text border border-border/40 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
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
                className={`px-2.5 py-1 rounded-sm text-xs transition-colors border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  expandedSizeGroup === g.type
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-muted text-text-light border-border/30 hover:border-primary hover:text-text'
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
                  className={`px-3 py-1.5 border rounded-sm text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selectedSizes.has(size.id)
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface text-text border-border/40 hover:border-primary'
                  }`}
                >
                  {size.name}
                </button>
              ))}
          </div>
        </FilterSection>
      )}

      {/* КОЛЬОРИ */}
      {colors.length > 0 && (
        <FilterSection title="Колір">
          <div className="flex flex-wrap gap-2">
            {colors.map(color => {
              const light = isLightColor(color.hex);
              return (
                <button
                  key={color.id}
                  onClick={() => onColorToggle(color.id)}
                  title={getName(color)}
                  className={`relative w-7 h-7 rounded-full border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selectedColors.has(color.id)
                      ? 'border-primary scale-110'
                      : 'border-transparent hover:border-border/60'
                  }`}
                  style={{ backgroundColor: color.hex || 'var(--color-secondary)' }}
                >
                  {/* Світлий колір — додаємо рамку щоб було видно */}
                  {light && (
                    <span className="absolute inset-0 rounded-full border border-border/40" />
                  )}
                  {selectedColors.has(color.id) && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${light ? 'text-text' : 'text-on-primary'}`}>
                        ✓
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Назви обраних кольорів */}
          {selectedColors.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {colors.filter(c => selectedColors.has(c.id)).map(c => (
                <span key={c.id} className="text-xs text-text bg-surface-muted border border-border/30 px-2 py-0.5 rounded-sm">
                  {getName(c)}
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
                  className="rounded-sm border-border/40 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <span className={`text-sm transition-colors ${
                  selectedBrands.has(brand.id)
                    ? 'text-primary font-medium'
                    : 'text-text-light group-hover:text-text'
                }`}>
                  {getName(brand)}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}
