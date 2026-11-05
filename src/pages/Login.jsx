import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BoudoirOrnament from '../components/BoudoirOrnament';

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
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-surface border border-border/40 p-8 sm:p-10 relative">
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 left-2 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute bottom-2 left-2 -scale-y-100 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute bottom-2 right-2 -scale-x-100 -scale-y-100 pointer-events-none" />

        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-text-light font-serif mb-2">
            Бутик «Будуар»
          </p>
          <h1 className="text-3xl font-serif text-text mb-3">Вхід до кабінету</h1>
          <BoudoirOrnament variant="divider" className="w-24 mx-auto text-border" />
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-background border border-border/40 text-text px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
              Пароль
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background border border-border/40 text-text px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary hover:bg-primary-hover border border-border/40 py-3.5 text-xs font-serif uppercase tracking-widest transition-colors duration-300 disabled:opacity-50 focus-visible:outline-primary shadow-sm"
          >
            {loading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-light">
          Ще не маєте акаунта?{' '}
          <Link
            to="/register"
            className="text-primary hover:underline underline-offset-4 font-medium"
          >
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}
