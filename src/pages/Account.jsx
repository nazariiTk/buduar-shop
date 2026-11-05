import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BoudoirOrnament from '../components/BoudoirOrnament';
import { formatPrice } from '../utils/format';
import { User, LogOut, ShoppingBag, Store, Tag, Sparkles } from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate('/login', { replace: true });
        return;
      }
      const [{ data: profile, error: profileError }, { data: orderData, error: ordersError }] = await Promise.all([
        supabase.from('customers').select('id,source_id,customer_code,name,email,phone,address,discount_percent,total_spent,bonus,telegram_id,is_active').eq('auth_user_id', auth.user.id).single(),
        supabase.from('orders').select('*, order_items(*)').eq('user_id', auth.user.id).order('created_at', { ascending: false })
      ]);
      if (active) {
        setUser(auth.user);
        setCustomer(profile);
        setOrders(orderData || []);
        setError(profileError?.message || ordersError?.message || '');
      }
      if (profile?.source_id) {
        const { data: salesData, error: salesError } = await supabase
          .from('customer_sales')
          .select('*, customer_sale_items(*)')
          .eq('customer_source_id', profile.source_id)
          .order('document_date', { ascending: false });
        if (active) {
          setSales(salesData || []);
          if (salesError) setError(salesError.message);
        }
      }
    }
    load();
    return () => { active = false; };
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-light font-serif text-lg">
        Завантаження персонального кабінету...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Шапка кабінету */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-border/30 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-text">Особистий кабінет</h1>
          <p className="text-text-light text-sm mt-1">
            Ваші персональні привілеї та історія покупок
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 self-start sm:self-auto text-xs font-serif uppercase tracking-widest text-text-light hover:text-primary transition-colors py-2 px-3 border border-border/40 bg-surface hover:bg-surface-muted focus-visible:outline-primary"
        >
          <LogOut className="w-3.5 h-3.5" />
          Вийти
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Картка знижок і бонусів */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border/40 p-5 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light/50 border border-border/40 flex items-center justify-center text-primary">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-light">Персональна знижка</p>
              <p className="text-2xl font-serif text-primary font-semibold mt-0.5">
                {customer?.discount_percent ?? 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border/40 p-5 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light/50 border border-border/40 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-light">Накопичені бонуси</p>
              <p className="text-2xl font-serif text-primary font-semibold mt-0.5">
                {customer?.bonus ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border/40 p-5 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light/50 border border-border/40 flex items-center justify-center text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-light">Сума покупок</p>
              <p className="text-2xl font-serif text-text font-semibold mt-0.5">
                {formatPrice(customer?.total_spent ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Секція: Персональні дані */}
      <section className="bg-surface border border-border/40 p-6 sm:p-8 mb-10 relative">
        <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 left-2 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-serif text-text">Персональні дані</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="block text-xs uppercase tracking-wider text-text-light mb-1">Ім’я</span>
            <p className="text-text font-medium">{customer?.name || '—'}</p>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-text-light mb-1">Код клієнта</span>
            <p className="text-text font-mono">{customer?.customer_code || customer?.source_id || '—'}</p>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-text-light mb-1">Email</span>
            <p className="text-text">{customer?.email || user.email}</p>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-text-light mb-1">Телефон</span>
            <p className="text-text">{customer?.phone || '—'}</p>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-text-light mb-1">Основна адреса</span>
            <p className="text-text">{customer?.address || '—'}</p>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-text-light mb-1">Telegram</span>
            <p className="text-text">{customer?.telegram_id ? `@${customer.telegram_id}` : '—'}</p>
          </div>
        </div>
      </section>

      {/* Секція: Історія онлайн-замовлень та покупок */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-text">Історія покупок</h2>
        </div>

        {orders.length === 0 && sales.length === 0 ? (
          <div className="bg-surface border border-border/40 p-8 text-center text-text-light">
            <BoudoirOrnament variant="divider" className="w-24 mx-auto mb-4 text-border" />
            <p className="font-serif text-lg text-text mb-2">Історія покупок поки що порожня</p>
            <p className="text-sm text-text-light mb-6">
              Ваші онлайн-замовлення та покупки в бутиках «Будуар» відображатимуться тут.
            </p>
            <Link
              to="/catalog"
              className="inline-block bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-6 py-2.5 text-xs font-serif uppercase tracking-widest transition-colors focus-visible:outline-primary"
            >
              Переглянути каталог
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Онлайн замовлення */}
            {orders.map((order) => (
              <article key={order.id} className="bg-surface border border-border/40 p-5 sm:p-6 relative">
                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3 pb-3 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg text-text font-medium">
                      Замовлення №{order.order_number}
                    </span>
                    <span className="text-xs uppercase tracking-wider px-2 py-0.5 bg-primary-light/50 border border-border/30 text-primary">
                      {order.status || 'нове'}
                    </span>
                  </div>
                  <span className="text-xs text-text-light font-body">
                    {new Date(order.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm py-1">
                      <div>
                        <span className="text-text font-medium">{item.product_name}</span>
                        {(item.color || item.size) && (
                          <span className="text-xs text-text-light ml-2">
                            ({item.color} {item.color && item.size && '/'} {item.size})
                          </span>
                        )}
                      </div>
                      <span className="font-serif text-text-light whitespace-nowrap ml-4">
                        {item.quantity} × {formatPrice(item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/20 text-sm">
                  <span className="text-text-light">Сума замовлення</span>
                  <span className="font-serif text-lg text-primary font-semibold">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </article>
            ))}

            {/* Офлайн покупки */}
            {sales.map((sale) => (
              <article key={`legacy-${sale.id}`} className="bg-surface border border-border/40 p-5 sm:p-6 relative">
                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3 pb-3 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg text-text font-medium flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-primary" />
                      Чек №{sale.document_number || sale.source_id}
                    </span>
                    <span className="text-xs uppercase tracking-wider px-2 py-0.5 bg-surface-muted border border-border/30 text-text-light">
                      Бутик
                    </span>
                  </div>
                  <span className="text-xs text-text-light">
                    {sale.document_date || '—'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {sale.customer_sale_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm py-1">
                      <span className="text-text">
                        {item.article_name || `Артикул №${item.article_id}`}
                      </span>
                      <span className="font-serif text-text-light whitespace-nowrap ml-4">
                        {item.quantity} × {formatPrice(item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/20 text-sm">
                  <span className="text-text-light">Сума чека</span>
                  <span className="font-serif text-lg text-primary font-semibold">
                    {formatPrice(sale.total_amount ?? 0)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="text-center pt-4">
        <Link
          to="/catalog"
          className="text-xs font-serif uppercase tracking-widest text-text-light hover:text-primary transition-colors underline underline-offset-4 focus-visible:outline-primary"
        >
          ← Повернутися до каталогу
        </Link>
      </div>
    </div>
  );
}
