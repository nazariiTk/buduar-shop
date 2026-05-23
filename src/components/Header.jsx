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
        <div className="fixed inset-0 z-40 bg-[var(--color-background)] flex flex-col pt-24 px-6">
          <nav className="flex flex-col divide-y divide-gray-100">
            <Link to="/catalog" onClick={() => setMenuOpen(false)} 
              className="py-4 text-lg font-medium">Каталог</Link>
            <Link to="/catalog?category=sleepwear" onClick={() => setMenuOpen(false)}
              className="py-4 text-gray-600">Піжами та домашній одяг</Link>
            <Link to="/catalog?category=lingerie" onClick={() => setMenuOpen(false)}
              className="py-4 text-gray-600">Білизна</Link>
            <Link to="/catalog?category=swimwear" onClick={() => setMenuOpen(false)}
              className="py-4 text-gray-600">Купальники</Link>
            <Link to="/catalog?category=kids" onClick={() => setMenuOpen(false)}
              className="py-4 text-gray-600">Дитячі</Link>
            <Link to="/catalog?category=beach" onClick={() => setMenuOpen(false)}
              className="py-4 text-gray-600">Пляжні аксесуари</Link>
            <Link to="/catalog?category=travel" onClick={() => setMenuOpen(false)}
              className="py-4 text-gray-600">Дорожні аксесуари</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
