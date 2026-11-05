import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Невірний email або пароль');
    } else {
      navigate('/admin/orders');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface p-8 rounded-lg shadow-sm border border-border/30 w-full max-w-sm">
        <h1 className="text-2xl font-serif text-primary font-bold tracking-widest mb-6 text-center">
          БУДУАР ADMIN
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light mb-1">Email</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light mb-1">Пароль</label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-border/40 rounded px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-primary text-on-primary py-2.5 rounded text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  );
}
