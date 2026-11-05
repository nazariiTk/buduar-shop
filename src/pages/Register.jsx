import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BoudoirOrnament from '../components/BoudoirOrnament';

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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name: form.name, phone: form.phone, address: form.address }
      }
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate('/account');
    } else {
      setMessage('Лист для підтвердження надіслано на вашу пошту. Будь ласка, перевірте email і після активації увійдіть.');
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-surface border border-border/40 p-8 sm:p-10 relative">
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 left-2 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute bottom-2 left-2 -scale-y-100 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute bottom-2 right-2 -scale-x-100 -scale-y-100 pointer-events-none" />

        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-text-light font-serif mb-2">
            Клуб привілеїв «Будуар»
          </p>
          <h1 className="text-3xl font-serif text-text mb-3">Реєстрація</h1>
          <BoudoirOrnament variant="divider" className="w-24 mx-auto text-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            ['name', 'Ім’я та прізвище', 'text', 'Олена Коваль'],
            ['phone', 'Телефон', 'tel', '+380...'],
            ['address', 'Адреса доставки (необов’язково)', 'text', 'м. Львів, вул. ...'],
            ['email', 'Email', 'email', 'name@example.com'],
            ['password', 'Пароль', 'password', '••••••••']
          ].map(([name, label, type, placeholder]) => (
            <div key={name}>
              <label className="block text-xs uppercase tracking-wider text-text-light mb-1.5">
                {label} {name !== 'address' && '*'}
              </label>
              <input
                name={name}
                type={type}
                required={name !== 'address'}
                value={form[name]}
                onChange={update}
                placeholder={placeholder}
                className="w-full bg-background border border-border/40 text-text placeholder:text-text-light/40 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary"
              />
            </div>
          ))}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-success/10 border border-success/30 text-success text-sm leading-relaxed">
              {message}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary hover:bg-primary-hover border border-border/40 py-3.5 text-xs font-serif uppercase tracking-widest transition-colors duration-300 disabled:opacity-50 focus-visible:outline-primary shadow-sm"
            >
              {loading ? 'Реєстрація...' : 'Зареєструватися'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-text-light">
          Вже маєте акаунт?{' '}
          <Link
            to="/login"
            className="text-primary hover:underline underline-offset-4 font-medium"
          >
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
