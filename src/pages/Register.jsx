import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (event) => setForm(prev => ({ ...prev, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, phone: form.phone, address: form.address } }
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate('/account');
    } else {
      setMessage('Перевірте email і підтвердьте реєстрацію, після цього увійдіть.');
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-serif mb-8">Реєстрація</h1>
      <form onSubmit={submit} className="space-y-5 bg-white border border-gray-200 rounded-lg p-6">
        {[
          ['name', 'Ім’я та прізвище', 'text'],
          ['phone', 'Телефон', 'tel'],
          ['address', 'Адреса', 'text'],
          ['email', 'Email', 'email'],
          ['password', 'Пароль', 'password']
        ].map(([name, label, type]) => (
          <label key={name} className="block text-sm font-medium">
            {label}
            <input name={name} type={type} required={name !== 'address'} value={form[name]} onChange={update}
              className="mt-2 w-full border border-gray-300 rounded-md px-4 py-3" />
          </label>
        ))}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-700 text-sm">{message}</p>}
        <button disabled={loading} className="w-full bg-[var(--color-text)] text-white py-3 rounded-md disabled:opacity-50">
          {loading ? 'Реєстрація...' : 'Зареєструватися'}
        </button>
      </form>
      <p className="mt-5 text-sm text-gray-600">Вже маєте акаунт? <Link className="underline" to="/login">Увійти</Link></p>
    </div>
  );
}
