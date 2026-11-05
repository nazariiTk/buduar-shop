import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/format';

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

  if (loading) return <div className="text-text-light animate-pulse">Завантаження клієнтів...</div>;
  return (
    <div>
      <h1 className="text-3xl font-serif text-text mb-8">Клієнти</h1>
      {error && <p className="text-danger mb-4">{error}</p>}
      <div className="bg-surface rounded-lg shadow-sm border border-border/30 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted/60 border-b border-border/30 text-text-light">
            <tr>{['ID', 'Код', 'Ім’я', 'Email', 'Телефон', 'Адреса', 'Знижка', 'Витрачено', 'Бонус', 'Telegram', 'Статус'].map(label => <th key={label} className="px-5 py-4 font-medium">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-text">
            {customers.map(customer => (
              <tr key={customer.id} className="hover:bg-surface-muted/30 transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-text-light">{customer.source_id || '-'}</td>
                <td className="px-5 py-4 font-mono text-xs text-text-light">{customer.customer_code || '-'}</td>
                <td className="px-5 py-4 font-medium text-text">{customer.name}</td>
                <td className="px-5 py-4 text-text-light">{customer.email || '-'}</td>
                <td className="px-5 py-4 text-text-light">{customer.phone || '-'}</td>
                <td className="px-5 py-4 text-text-light">{customer.address || '-'}</td>
                <td className="px-5 py-4 font-medium">{customer.discount_percent ?? 0}%</td>
                <td className="px-5 py-4 font-medium whitespace-nowrap">{formatPrice(customer.total_spent)}</td>
                <td className="px-5 py-4 font-mono">{customer.bonus ?? 0}</td>
                <td className="px-5 py-4 text-text-light">{customer.telegram_id || '-'}</td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    customer.is_active ? 'bg-success/15 text-success' : 'bg-surface-muted text-text-light'
                  }`}>
                    {customer.is_active ? 'Активний' : 'Неактивний'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
