import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-orange-100 text-orange-800 border-orange-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
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
    fetchOrders();
  }, []);

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
    return <div className="animate-pulse">Завантаження замовлень...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-serif mb-8">Замовлення</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
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
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${expandedOrderId === order.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleExpand(order.id)} className="text-gray-400 hover:text-gray-600">
                        {expandedOrderId === order.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium">#{order.order_number}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('uk-UA')} <br/>
                      <span className="text-xs">{new Date(order.created_at).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{order.first_name} {order.last_name}</p>
                      <p className="text-gray-500 text-xs mt-1">{order.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      {order.delivery_type === 'np_branch' && `НП: ${order.city || ''}, ${order.branch || ''}`}
                      {order.delivery_type === 'np_courier' && `Кур'єр НП: ${order.city || ''}, ${order.courier_address || ''}`}
                      {order.delivery_type === 'pickup' && `Самовивіз: ${order.pickup_shop_name || ''}`}
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{order.total} грн</td>
                    <td className="px-6 py-4 text-right">
                      <select 
                        value={order.status || 'new'}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 ${STATUS_COLORS[order.status || 'new']}`}
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
                      <td colSpan="7" className="px-0 py-0 bg-gray-50">
                        <div className="px-6 md:px-14 py-6 border-l-4 border-[var(--color-primary)]">
                          <h4 className="text-sm font-semibold mb-4 text-gray-700">Товари в замовленні:</h4>
                          <div className="space-y-3">
                            {order.order_items?.map(item => (
                              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 border border-gray-100 rounded-md gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                    {item.image_url && <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover"/>}
                                  </div>
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-xs text-gray-500 mt-1">Колір: {item.color || '-'} | Розмір: {item.size || '-'}</p>
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  <p className="font-medium">{item.quantity} x {item.price} грн</p>
                                  <p className="text-sm font-bold mt-1">{item.total} грн</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {order.comment && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Коментар клієнта:</p>
                              <p className="text-sm">{order.comment}</p>
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
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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
