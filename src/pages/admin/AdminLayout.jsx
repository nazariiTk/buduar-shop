import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, LayoutDashboard, Cpu, LogOut, BookOpen, Users } from 'lucide-react';
import useAiMetricsStore from '../../store/useAiMetricsStore';
import { supabase } from '../../lib/supabase';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Замовлення', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Товари', path: '/admin/products', icon: Package },
    { name: 'Каталог', path: '/admin/catalog', icon: LayoutDashboard },
    { name: 'Довідники', path: '/admin/dictionaries', icon: BookOpen },
    { name: 'Клієнти', path: '/admin/customers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background text-text flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border/30 hidden md:flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-border/30">
          <Link to="/admin" className="text-xl font-serif font-bold tracking-widest text-primary">
            БУДУАР ADMIN
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary text-on-primary font-medium shadow-sm' 
                    : 'text-text-light hover:bg-surface-muted hover:text-text'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* AI Metrics Widget */}
        <AiMetricsWidget />

        <div className="p-4 border-t border-border/30 bg-surface">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-sm font-medium text-text-light hover:text-primary transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Вийти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-surface border-b border-border/30 flex items-center px-4 justify-between">
          <Link to="/admin" className="text-lg font-serif font-bold tracking-widest text-primary">
            БУДУАР ADMIN
          </Link>
          <button onClick={handleLogout} className="p-2 text-text-light hover:text-primary">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-8 flex-1 overflow-auto bg-background">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AiMetricsWidget() {
  const metrics = useAiMetricsStore(state => state.metrics);
  
  // Calculate percentages (if limits are known)
  const reqPercent = metrics.requestsLimit && metrics.requestsRemaining
    ? (Number(metrics.requestsRemaining) / Number(metrics.requestsLimit)) * 100
    : 100;
    
  const tokPercent = metrics.tokensLimit && metrics.tokensRemaining
    ? (Number(metrics.tokensRemaining) / Number(metrics.tokensLimit)) * 100
    : 100;

  const hasMetrics = metrics.requestsRemaining || metrics.tokensRemaining;

  return (
    <div className="p-4 border-t border-border/30 bg-surface-muted/40 mt-auto">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-text-light uppercase tracking-wider">
        <Cpu size={14} className="text-primary" />
        Ліміти Groq AI
      </div>
      
      {!hasMetrics ? (
        <div className="text-[11px] text-text-light leading-tight">
          Відсутні дані про ліміти. Зробіть перший запит.
          <br/>
          (Або браузер блокує CORS заголовки Groq)
        </div>
      ) : (
        <div className="space-y-3">
          {/* RPM - Requests */}
          {metrics.requestsRemaining && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-light">Запити (день)</span>
                <span className="font-medium text-text">{metrics.requestsRemaining} / {metrics.requestsLimit || '?'}</span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${reqPercent < 10 ? 'bg-danger' : reqPercent < 30 ? 'bg-border' : 'bg-success'}`} 
                  style={{ width: `${Math.max(reqPercent, 0)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* TPM - Tokens */}
          {metrics.tokensRemaining && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-light">Токени (хвилина)</span>
                <span className="font-medium text-text">{metrics.tokensRemaining} / {metrics.tokensLimit || '?'}</span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${tokPercent < 10 ? 'bg-danger' : tokPercent < 30 ? 'bg-border' : 'bg-success'}`} 
                  style={{ width: `${Math.max(tokPercent, 0)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
