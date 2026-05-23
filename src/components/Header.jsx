import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Header() {
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const [animateCart, setAnimateCart] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, []);

  const topLevel = categories.filter(c => !c.parent_id);
  const subLevel = categories.filter(c => c.parent_id);

  useEffect(() => {
    if (itemCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header className="bg-[var(--color-surface)] shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-3xl font-serif text-[var(--color-text)] tracking-widest font-bold z-50 relative">
              БУДУАР
            </Link>
          </div>

          <div className="flex items-center space-x-4 z-50 relative">
            <Link to="/contacts" className="text-sm font-serif font-medium uppercase tracking-widest hover:text-[var(--color-primary)] transition-colors mt-0.5">
              Про нас
            </Link>

            <Link to="/cart" className="relative p-2 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
              <ShoppingBag className={`h-6 w-6 transition-transform duration-300 ${animateCart ? 'animate-bounce' : ''}`} />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-[var(--color-text)] rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            <button 
              className="md:hidden p-2 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-background)] flex flex-col pt-24 px-6 pb-6 overflow-y-auto">
          <nav className="flex flex-col">
            <Link to="/catalog" onClick={() => setMenuOpen(false)}
              className="py-4 text-lg font-medium border-b border-gray-100">
              Всі товари
            </Link>
            
            {topLevel.map(cat => {
              const subs = subLevel.filter(s => s.parent_id === cat.id);
              const isExpanded = expandedCategory === cat.slug;
              
              return (
                <div key={cat.id} className="border-b border-gray-100">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.slug)}
                    className="w-full flex justify-between items-center py-4 text-base font-medium"
                  >
                    {cat.name_uk}
                    <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  
                  {isExpanded && subs.length > 0 && (
                    <div className="pb-3 pl-4 flex flex-col gap-1">
                      <Link
                        to={`/catalog?category=${cat.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="py-2 text-sm text-gray-500"
                      >
                        Всі {cat.name_uk.toLowerCase()}
                      </Link>
                      {subs.map(sub => (
                        <Link
                          key={sub.id}
                          to={`/catalog?category=${sub.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="py-2 text-sm text-gray-600"
                        >
                          {sub.name_uk}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <Link to="/contacts" onClick={() => setMenuOpen(false)}
              className="py-4 text-lg font-medium border-b border-gray-100">
              Контакти
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
