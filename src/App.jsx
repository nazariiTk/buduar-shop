import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ProductPage from './pages/ProductPage';
import Contacts from './pages/Contacts';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminGroups from './pages/admin/AdminGroups';
import AdminLogin from './pages/admin/AdminLogin';
import ProtectedRoute from './components/admin/ProtectedRoute';

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <>
      <Helmet>
        <title>БУДУАР — Бутик розкішної білизни · Трускавець</title>
        <meta name="description" content="Інтернет-магазин білизни, піжам, купальників та аксесуарів у Трускавці. 4 магазини в місті. Доставка по всій Україні." />
        <meta property="og:site_name" content="БУДУАР" />
        <meta property="og:locale" content="uk_UA" />
      </Helmet>
      <Routes>
      {/* Public Routes with Header and Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/product/:slug" element={<ProductPage />} />
      </Route>
      
      {/* Admin Login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/orders" replace />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="groups" element={<AdminGroups />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
