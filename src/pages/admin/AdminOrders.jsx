import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const STATUS_COLORS = {
  new: 'bg-primary/10 text-primary border-primary/30',
  confirmed: 'bg-border/20 text-text border-border/40',
  processing: 'bg-secondary/40 text-text border-secondary',
  shipped: 'bg-surface-muted text-text-light border-border/30',
  delivered: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-danger/15 text-danger border-danger/30'
};

const STATUS_LABELS = {
  new: 'Нове',
  confirmed: 'Підтверджено',
  processing: 'В обробці',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано'
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Помилка при оновленні статусу');
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (loading) {
    return <div className="animate-pulse text-text-light">Завантаження замовлень...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-serif text-text mb-8">Замовлення</h1>
      
      <div className="bg-surface rounded-lg shadow-sm border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted/60 border-b border-border/30 text-text-light">
              <tr>
                <th className="px-6 py-4 font-medium w-8"></th>
                <th className="px-6 py-4 font-medium">№</th>
                <th className="px-6 py-4 font-medium">Дата</th>
                <th className="px-6 py-4 font-medium">Клієнт</th>
                <th className="px-6 py-4 font-medium">Доставка</th>
                <th className="px-6 py-4 font-medium">Сума</th>
                <th className="px-6 py-4 font-medium text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-text">
              {orders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className={`hover:bg-surface-muted/30 transition-colors ${expandedOrderId === order.id ? 'bg-surface-muted/30' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleExpand(order.id)} className="text-text-light hover:text-text transition-colors">
                        {expandedOrderId === order.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium">#{order.order_number}</td>
                    <td className="px-6 py-4 text-text-light whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('uk-UA')} <br/>
                      <span className="text-xs">{new Date(order.created_at).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{order.first_name} {order.last_name}</p>
                      <p className="text-text-light text-xs mt-1">{order.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      {order.delivery_type === 'np_branch' && `НП: ${order.city || ''}, ${order.branch || ''}`}
                      {order.delivery_type === 'np_courier' && `Кур'єр НП: ${order.city || ''}, ${order.courier_address || ''}`}
                      {order.delivery_type === 'pickup' && `Самовивіз: ${order.pickup_shop_name || ''}`}
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <select 
                        value={order.status || 'new'}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-border ${STATUS_COLORS[order.status || 'new']}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  
                  {/* Expanded Items */}
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan="7" className="px-0 py-0 bg-surface-muted/20">
                        <div className="px-6 md:px-14 py-6 border-l-4 border-primary">
                          <h4 className="text-sm font-semibold mb-4 text-text">Товари в замовленні:</h4>
                          <div className="space-y-3">
                            {order.order_items?.map(item => (
                              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface p-3 border border-border/20 rounded-md gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-16 bg-surface-muted rounded overflow-hidden flex-shrink-0 border border-border/20">
                                    {item.image_url && <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover"/>}
                                  </div>
                                  <div>
                                    <p className="font-medium text-text">{item.product_name}</p>
                                    <p className="text-xs text-text-light mt-1">Колір: {item.color || '-'} | Розмір: {item.size || '-'}</p>
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  <p className="font-medium text-text">{item.quantity} x {formatPrice(item.price)}</p>
                                  <p className="text-sm font-bold mt-1 text-primary">{formatPrice(item.total)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {order.comment && (
                            <div className="mt-6 pt-4 border-t border-border/30">
                              <p className="text-xs font-semibold text-text-light mb-1">Коментар клієнта:</p>
                              <p className="text-sm text-text">{order.comment}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-text-light">
                    Замовлень ще немає
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
