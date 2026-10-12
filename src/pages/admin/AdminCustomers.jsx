import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('customers').select('*').order('name').then(({ data, error: queryError }) => {
      setCustomers(data || []);
      setError(queryError?.message || '');
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Завантаження клієнтів...</div>;
  return (
    <div>
      <h1 className="text-3xl font-serif mb-8">Клієнти</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['ID', 'Код', 'Ім’я', 'Email', 'Телефон', 'Адреса', 'Знижка', 'Витрачено', 'Бонус', 'Telegram', 'Статус'].map(label => <th key={label} className="px-5 py-4 font-medium">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map(customer => (
              <tr key={customer.id}>
                <td className="px-5 py-4">{customer.source_id || '-'}</td>
                <td className="px-5 py-4">{customer.customer_code || '-'}</td>
                <td className="px-5 py-4 font-medium">{customer.name}</td>
                <td className="px-5 py-4">{customer.email || '-'}</td>
                <td className="px-5 py-4">{customer.phone || '-'}</td>
                <td className="px-5 py-4">{customer.address || '-'}</td>
                <td className="px-5 py-4">{customer.discount_percent ?? 0}%</td>
                <td className="px-5 py-4">{customer.total_spent ?? 0} грн</td>
                <td className="px-5 py-4">{customer.bonus ?? 0}</td>
                <td className="px-5 py-4">{customer.telegram_id || '-'}</td>
                <td className="px-5 py-4">{customer.is_active ? 'Активний' : 'Неактивний'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
