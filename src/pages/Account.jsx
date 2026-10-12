import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

  if (!user) return <div className="max-w-5xl mx-auto px-4 py-12">Завантаження...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
        <h1 className="text-4xl font-serif">Особистий кабінет</h1>
        <button onClick={logout} className="text-sm underline">Вийти</button>
      </div>
      {error && <p className="mb-5 text-red-600 text-sm">{error}</p>}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-serif mb-5">Мої дані</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <p><span className="text-gray-500">Ім’я:</span> {customer?.name || '-'}</p>
          <p><span className="text-gray-500">Код клієнта:</span> {customer?.customer_code || customer?.source_id || '-'}</p>
          <p><span className="text-gray-500">Email:</span> {customer?.email || user.email}</p>
          <p><span className="text-gray-500">Телефон:</span> {customer?.phone || '-'}</p>
          <p><span className="text-gray-500">Адреса:</span> {customer?.address || '-'}</p>
          <p><span className="text-gray-500">Знижка:</span> {customer?.discount_percent ?? 0}%</p>
          <p><span className="text-gray-500">Всього покупок:</span> {customer?.total_spent ?? 0} грн</p>
          <p><span className="text-gray-500">Бонус:</span> {customer?.bonus ?? 0}</p>
          <p><span className="text-gray-500">Telegram ID:</span> {customer?.telegram_id || '-'}</p>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-serif mb-5">Мої покупки</h2>
        {orders.length === 0 && sales.length === 0 ? <p className="text-gray-500">Історія покупок порожня.</p> : (
          <div className="space-y-4">
            {orders.map(order => (
              <article key={order.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex justify-between gap-4 mb-3">
                  <strong>Замовлення #{order.order_number}</strong>
                  <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('uk-UA')}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">Статус: {order.status || 'нове'} · Сума: {order.total} грн</p>
                <div className="space-y-2 text-sm">
                  {order.order_items?.map(item => <p key={item.id}>{item.product_name} — {item.quantity} × {item.price} грн</p>)}
                </div>
              </article>
            ))}
            {sales.map(sale => (
              <article key={`legacy-${sale.id}`} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex justify-between gap-4 mb-3">
                  <strong>Покупка #{sale.document_number || sale.source_id}</strong>
                  <span className="text-sm text-gray-500">{sale.document_date || '-'}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">Імпортована покупка · Сума: {sale.total_amount ?? 0} грн</p>
                <div className="space-y-2 text-sm">
                  {sale.customer_sale_items?.map(item => (
                    <p key={item.id}>Товар #{item.article_id} — {item.quantity} × {item.unit_price} грн</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Link to="/catalog" className="inline-block mt-8 underline">Повернутися до каталогу</Link>
    </div>
  );
}
