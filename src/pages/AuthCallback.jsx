import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError || !data.session) {
        setError(sessionError?.message || 'Не вдалося підтвердити email.');
        return;
      }

      navigate('/account', { replace: true });
    }

    completeAuth();
    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-serif mb-4">Помилка підтвердження</h1>
          <p className="text-red-600">{error}</p>
        </>
      ) : (
        <p className="text-lg">Підтверджуємо email...</p>
      )}
    </div>
  );
}
