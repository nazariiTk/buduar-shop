import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, ChevronDown, User } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getName } from '../utils/format';

export default function Header() {
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGender, setExpandedGender] = useState(null);
  const [expandedType, setExpandedType] = useState(null);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeGender, setActiveGender] = useState(null);
  const [categories, setCategories] = useState([]);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const level1 = categories.filter(c => !c.parent_id);
  const level2 = categories.filter(c => level1.some(l => l.id === c.parent_id));
  const level3 = categories.filter(c => level2.some(l => l.id === c.parent_id));
  const currentGender = activeGender || level1[0]?.slug || null;

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header className="bg-surface border-b border-border/30 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center">
            <Link
              to="/"
              className="text-3xl font-serif text-text hover:text-primary transition-colors tracking-widest font-bold z-50 relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              БУДУАР
            </Link>
          </div>

          <div className="flex items-center space-x-4 z-50 relative h-full">
            <nav className="hidden lg:flex items-center gap-8 mr-4 h-full">
              {/* Таб статі — при наведенні відкриває мегаменю */}
              <div
                className="relative h-full flex items-center"
                onMouseEnter={() => setMegaOpen(true)}
                onMouseLeave={() => setMegaOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-medium py-4 text-text hover:text-primary transition-colors uppercase font-serif tracking-widest mt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  Каталог
                  <ChevronDown className={`h-4 w-4 transition-transform ${megaOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Мегаменю */}
                {megaOpen && (
                  <div
                    className="fixed left-0 right-0 bg-surface border-t border-b border-border/30 shadow-lg z-50"
                    style={{ top: '80px' }}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      {/* Таби статі */}
                      <div className="flex gap-1 mb-6 border-b border-border/30">
                        {level1.map(gender => (
                          <button
                            key={gender.id}
                            onMouseEnter={() => setActiveGender(gender.slug)}
                            onClick={() => { navigate(`/catalog?category=${gender.slug}`); setMegaOpen(false); }}
                            className={`px-5 py-2.5 text-sm font-serif tracking-wider font-medium border-b-2 transition-colors -mb-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                              currentGender === gender.slug
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-light hover:text-text'
                            }`}
                          >
                            {getName(gender)}
                          </button>
                        ))}
                      </div>

                      {/* Колонки типів і підтипів */}
                      {currentGender && (() => {
                        const genderObj = level1.find(c => c.slug === currentGender);
                        const types = level2.filter(c => c.parent_id === genderObj?.id);

                        return (
                          <div
                            className="grid gap-6"
                            style={{ gridTemplateColumns: `repeat(${Math.min(types.length, 6)}, minmax(0, 1fr))` }}
                          >
                            {types.map(type => {
                              const subtypes = level3.filter(c => c.parent_id === type.id);
                              return (
                                <div key={type.id}>
                                  <button
                                    onClick={() => { navigate(`/catalog?category=${type.slug}`); setMegaOpen(false); }}
                                    className="font-serif font-semibold text-base text-text hover:text-primary transition-colors mb-3 block text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                  >
                                    {getName(type)}
                                  </button>
                                  <div className="space-y-1.5">
                                    {subtypes.map(sub => (
                                      <button
                                        key={sub.id}
                                        onClick={() => { navigate(`/catalog?category=${sub.slug}`); setMegaOpen(false); }}
                                        className="block text-sm text-text-light hover:text-primary transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                      >
                                        {getName(sub)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/contacts"
                className="text-sm font-serif font-medium uppercase tracking-widest text-text hover:text-primary transition-colors mt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Про нас
              </Link>
            </nav>

            <Link
              to="/cart"
              aria-label="Кошик"
              className="relative p-2 text-text hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ShoppingBag key={itemCount} className={`h-6 w-6 transition-transform duration-300 ${itemCount > 0 ? 'animate-[bounce_0.3s_ease-in-out_1]' : ''}`} />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-on-primary transform translate-x-1/4 -translate-y-1/4 bg-primary rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            <Link
              to={session ? '/account' : '/login'}
              aria-label="Особистий кабінет"
              className="p-2 text-text hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <User className="h-6 w-6" />
            </Link>

            <button
              aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
              className="md:hidden p-2 text-text hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col pt-24 px-6 pb-6 overflow-y-auto">
          <nav className="flex flex-col">
            <Link
              to="/catalog"
              onClick={() => setMenuOpen(false)}
              className="py-4 text-lg font-serif font-medium text-text hover:text-primary border-b border-border/30"
            >
              Всі товари
            </Link>

            {level1.map(gender => {
              const types = level2.filter(c => c.parent_id === gender.id);
              const isGenderOpen = expandedGender === gender.slug;

              return (
                <div key={gender.id} className="border-b border-border/30">
                  {/* Рівень 1 — стать */}
                  <button
                    onClick={() => setExpandedGender(isGenderOpen ? null : gender.slug)}
                    className="w-full flex justify-between items-center py-4 text-base font-serif font-semibold text-text"
                  >
                    {getName(gender)}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isGenderOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isGenderOpen && (
                    <div className="pb-3 space-y-1">
                      {/* Посилання "Всі X" */}
                      <Link
                        to={`/catalog?category=${gender.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-text-light hover:text-primary"
                      >
                        Всі {getName(gender).toLowerCase()}
                      </Link>

                      {types.map(type => {
                        const subtypes = level3.filter(c => c.parent_id === type.id);
                        const isTypeOpen = expandedType === type.slug;

                        return (
                          <div key={type.id}>
                            {/* Рівень 2 — тип одягу */}
                            <button
                              onClick={() => setExpandedType(isTypeOpen ? null : type.slug)}
                              className="w-full flex justify-between items-center px-4 py-2 text-sm font-medium text-text"
                            >
                              {getName(type)}
                              {subtypes.length > 0 && (
                                <ChevronDown className={`h-3 w-3 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
                              )}
                            </button>

                            {isTypeOpen && subtypes.length > 0 && (
                              <div className="pl-8 space-y-0.5 pb-2">
                                <Link
                                  to={`/catalog?category=${type.slug}`}
                                  onClick={() => setMenuOpen(false)}
                                  className="block py-1.5 text-xs text-text-light hover:text-primary"
                                >
                                  Всі {getName(type).toLowerCase()}
                                </Link>
                                {subtypes.map(sub => (
                                  <Link
                                    key={sub.id}
                                    to={`/catalog?category=${sub.slug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="block py-1.5 text-xs text-text-light hover:text-text"
                                  >
                                    {getName(sub)}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <Link
              to="/contacts"
              onClick={() => setMenuOpen(false)}
              className="py-4 text-lg font-serif font-medium text-text hover:text-primary border-b border-border/30"
            >
              Контакти
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
