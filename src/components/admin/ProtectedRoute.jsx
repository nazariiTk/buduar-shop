import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // loading

  if (!session) return <Navigate to="/admin/login" replace />;

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
    
  const userEmail = session.user?.email?.toLowerCase();

  // Якщо список адмінів заданий в .env, перевіряємо, чи є там поточний юзер
  if (adminEmails.length > 0 && !adminEmails.includes(userEmail)) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Доступ заборонено</h1>
        <p>Ваш email ({userEmail}) не має прав адміністратора.</p>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          Вийти
        </button>
      </div>
    );
  }

  return children;
}
