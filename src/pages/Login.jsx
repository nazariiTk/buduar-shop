import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (loginError) setError('Невірний email або пароль');
    else navigate('/account');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-4xl font-serif mb-8">Вхід</h1>
      <form onSubmit={submit} className="space-y-5 bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-medium">Email
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded-md px-4 py-3" />
        </label>
        <label className="block text-sm font-medium">Пароль
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded-md px-4 py-3" />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-[var(--color-text)] text-white py-3 rounded-md disabled:opacity-50">
          {loading ? 'Вхід...' : 'Увійти'}
        </button>
      </form>
      <p className="mt-5 text-sm text-gray-600">Немає акаунта? <Link className="underline" to="/register">Зареєструватися</Link></p>
    </div>
  );
}
