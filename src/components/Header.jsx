import { Link } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useState, useEffect } from 'react';

export default function Header() {
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const [animateCart, setAnimateCart] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (itemCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  return (
    <header className="bg-[var(--color-surface)] shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-3xl font-serif text-[var(--color-text)] tracking-widest font-bold">
              БУДУАР
            </Link>
          </div>

          <div className="flex items-center space-x-4">
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
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${menuOpen ? 'max-h-64 opacity-100 border-t border-[var(--color-primary)] border-opacity-20' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pt-2 pb-6 space-y-1 bg-[var(--color-surface)]">
          <Link to="/catalog" onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-base font-medium border-b border-[var(--color-primary)] border-opacity-20">Каталог</Link>
          <Link to="/catalog?category=pajamas" onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-base font-medium border-b border-[var(--color-primary)] border-opacity-20 text-[var(--color-text-light)]">Піжами</Link>
          <Link to="/catalog?category=lingerie" onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-base font-medium border-b border-[var(--color-primary)] border-opacity-20 text-[var(--color-text-light)]">Білизна</Link>
          <Link to="/catalog?category=swimwear" onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-base font-medium border-b border-[var(--color-primary)] border-opacity-20 text-[var(--color-text-light)]">Купальники</Link>
          <Link to="/catalog?category=kids" onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-[var(--color-text-light)]">Дитячі</Link>
        </div>
      </div>
    </header>
  );
}
