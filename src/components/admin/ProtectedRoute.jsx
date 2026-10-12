import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: admin, error } = await supabase.rpc('is_sync_admin');
        setIsAdmin(!error && admin === true);
      } else {
        setIsAdmin(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const { data: admin, error } = await supabase.rpc('is_sync_admin');
        setIsAdmin(!error && admin === true);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined || isAdmin === undefined) return null;

  if (!session) return <Navigate to="/admin/login" replace />;

  if (!isAdmin) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Доступ заборонено</h1>
        <p>Цей обліковий запис не має прав адміністратора.</p>
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
