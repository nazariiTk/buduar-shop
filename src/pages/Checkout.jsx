import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { supabase } from '../lib/supabase';
import ProductImage from '../components/ProductImage';
import BoudoirOrnament from '../components/BoudoirOrnament';
import { formatPrice } from '../utils/format';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Checkout() {
  const { items, clearCart } = useCartStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    delivery: 'np_branch',
    address: '',
    comment: '',
    payment: 'upon_receipt'
  });

  // Shops State
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);

  // Nova Poshta State
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [branchQuery, setBranchQuery] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    supabase
      .from('site_shops')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setShops(data || []));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'delivery') {
      setSelectedCity(null);
      setSelectedBranch(null);
      setCityQuery('');
      setBranchQuery('');
      setBranches([]);
      setCities([]);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  async function searchCities(query) {
    if (query.length < 2) { setCities([]); return; }
    setCityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nova-poshta', {
        body: {
          modelName: 'Address',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: query,
            Limit: 7,
            Language: 'UA'
          }
        }
      });
      if (error) throw error;
      const addresses = data?.data?.[0]?.Addresses || [];
      setCities(addresses);
    } catch (err) {
      console.error(err);
    } finally {
      setCityLoading(false);
    }
  }

  async function loadBranches(cityRef, branchFilter = '') {
    setBranchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nova-poshta', {
        body: {
          modelName: 'AddressGeneral',
          calledMethod: 'getWarehouses',
          methodProperties: {
            SettlementRef: cityRef,
            FindByString: branchFilter,
            Limit: 20,
            Language: 'UA'
          }
        }
      });
      if (error) throw error;
      setBranches(data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setBranchLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
      alert('Будь ласка, заповніть всі обов\'язкові поля');
      return;
    }

    if (formData.phone.replace(/\D/g, '').length < 10) {
      alert('Номер телефону має містити мінімум 10 цифр');
      return;
    }

    if (formData.delivery === 'pickup' && !selectedShop) {
      alert('Оберіть магазин для самовивозу');
      return;
    }

    if (formData.delivery === 'np_branch' && (!selectedCity || !selectedBranch)) {
      alert('Оберіть місто та відділення Нової Пошти');
      return;
    }

    if (formData.delivery === 'np_courier' && (!selectedCity || !formData.address)) {
      alert('Оберіть місто та вкажіть адресу доставки');
      return;
    }

    const { data, error } = await supabase.functions.invoke('create-order', {
      body: {
        first_name:       formData.firstName,
        last_name:        formData.lastName,
        phone:            formData.phone,
        email:            formData.email,
        delivery_type:    formData.delivery,
        payment_type:     formData.payment,
        comment:          formData.comment || null,
        city:             selectedCity?.Present || null,
        city_ref:         selectedCity?.Ref || null,
        branch:           selectedBranch?.Description || null,
        branch_ref:       selectedBranch?.Ref || null,
        courier_address:  formData.delivery === 'np_courier' ? formData.address : null,
        pickup_shop_id:   selectedShop?.id || null,
        pickup_shop_name: selectedShop?.name || null,
        user_agent:       navigator.userAgent,
        referrer:         document.referrer || null,
        items:            items,
      }
    });

    if (error || data?.error) {
      alert(data?.error || 'Помилка при збереженні замовлення');
      return;
    }

    setOrderNumber(data.order_number);
    clearCart();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="bg-surface border border-border/40 p-8 sm:p-12 max-w-lg w-full relative">
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute top-3 left-3 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute top-3 right-3 -scale-x-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute bottom-3 left-3 -scale-y-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute bottom-3 right-3 -scale-x-100 -scale-y-100 pointer-events-none" />

          <div className="w-16 h-16 rounded-full bg-primary-light/60 border border-border/50 text-primary flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <p className="text-sm font-serif uppercase tracking-widest text-primary mb-2">
            Замовлення №{orderNumber}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif text-text mb-4">
            Дякуємо за вибір «Будуар»
          </h1>
          <BoudoirOrnament variant="divider" className="w-32 mx-auto mb-6 text-border" />
          <p className="text-text-light mb-8 font-body text-base leading-relaxed">
            Ваше замовлення успішно прийнято. Наш консультант зв’яжеться з вами найближчим часом для підтвердження деталей.
          </p>
          <Link
            to="/catalog"
            className="inline-block bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-8 py-3.5 font-serif uppercase tracking-widest text-xs transition-colors duration-300 focus-visible:outline-primary"
          >
            Повернутися до каталогу
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="bg-surface border border-border/40 p-8 sm:p-12 max-w-lg w-full relative">
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute top-3 left-3 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute top-3 right-3 -scale-x-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute bottom-3 left-3 -scale-y-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute bottom-3 right-3 -scale-x-100 -scale-y-100 pointer-events-none" />

          <h1 className="text-3xl font-serif text-text mb-4">Ваш кошик порожній</h1>
          <BoudoirOrnament variant="divider" className="w-32 mx-auto mb-6 text-border" />
          <p className="text-text-light mb-8 text-base">
            Для оформлення замовлення спершу оберіть вироби у каталозі.
          </p>
          <Link
            to="/catalog"
            className="inline-block bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-8 py-3.5 font-serif uppercase tracking-widest text-xs transition-colors duration-300 focus-visible:outline-primary"
          >
            Перейти до каталогу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-8 border-b border-border/30 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-text">Оформлення замовлення</h1>
          <p className="text-text-light text-sm mt-1">
            Заповніть контактні дані та оберіть зручний спосіб доставки
          </p>
        </div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-serif uppercase tracking-widest text-text-light hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Повернутися до кошика
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12 flex flex-col-reverse">
        {/* Форма замовлення */}
        <div className="lg:col-span-7 xl:col-span-8 mt-10 lg:mt-0">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Контактні дані */}
            <div className="bg-surface p-6 sm:p-8 border border-border/40 relative">
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 left-2 pointer-events-none" />
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

              <h2 className="text-xl font-serif text-text mb-6">Контактні дані</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Ім'я *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Прізвище *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+380"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Доставка */}
            <div className="bg-surface p-6 sm:p-8 border border-border/40 relative">
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 left-2 pointer-events-none" />
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

              <h2 className="text-xl font-serif text-text mb-6">Спосіб доставки</h2>
              <div className="space-y-3 mb-6">
                <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${formData.delivery === 'np_branch' ? 'border-primary bg-primary-light/30' : 'border-border/30 bg-background hover:border-border/60'}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="np_branch"
                    checked={formData.delivery === 'np_branch'}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-primary focus-visible:outline-primary"
                  />
                  <span className="text-sm font-medium text-text">Нова Пошта — до відділення</span>
                </label>
                <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${formData.delivery === 'np_courier' ? 'border-primary bg-primary-light/30' : 'border-border/30 bg-background hover:border-border/60'}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="np_courier"
                    checked={formData.delivery === 'np_courier'}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-primary focus-visible:outline-primary"
                  />
                  <span className="text-sm font-medium text-text">Нова Пошта — кур'єрська доставка</span>
                </label>
                <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${formData.delivery === 'pickup' ? 'border-primary bg-primary-light/30' : 'border-border/30 bg-background hover:border-border/60'}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="pickup"
                    checked={formData.delivery === 'pickup'}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-primary focus-visible:outline-primary"
                  />
                  <span className="text-sm font-medium text-text">Самовивіз із бутика у Трускавці</span>
                </label>
              </div>

              {formData.delivery === 'pickup' && (
                <div className="space-y-3 mt-4 pt-4 border-t border-border/30">
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Оберіть магазин *
                  </label>
                  {shops.map(shop => (
                    <label
                      key={shop.id}
                      className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                        selectedShop?.id === shop.id
                          ? 'border-primary bg-primary-light/40'
                          : 'border-border/30 bg-background hover:border-border/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shop"
                        value={shop.id}
                        checked={selectedShop?.id === shop.id}
                        onChange={() => setSelectedShop(shop)}
                        className="mt-1 h-4 w-4 accent-primary focus-visible:outline-primary"
                      />
                      <div>
                        <p className="font-serif text-base text-text font-medium">{shop.name}</p>
                        <p className="text-xs text-text-light mt-0.5">{shop.address}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {(formData.delivery === 'np_branch' || formData.delivery === 'np_courier') && (
                <div className="relative mt-4 pt-4 border-t border-border/30">
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Місто *
                  </label>
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); searchCities(e.target.value); }}
                    placeholder="Почніть вводити назву міста..."
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                  {cityLoading && <p className="text-xs text-text-light mt-1">Пошук населених пунктів...</p>}
                  {cities.length > 0 && !selectedCity && (
                    <ul className="absolute z-20 w-full bg-surface border border-border/40 shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-border/20">
                      {cities.map(city => (
                        <li
                          key={city.Ref}
                          onClick={() => {
                            setSelectedCity(city);
                            setCityQuery(city.Present);
                            setCities([]);
                            if (formData.delivery === 'np_branch') loadBranches(city.Ref);
                          }}
                          className="px-4 py-3 hover:bg-surface-muted cursor-pointer text-sm text-text transition-colors"
                        >
                          {city.Present}
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedCity && (
                    <button
                      type="button"
                      onClick={() => { setSelectedCity(null); setCityQuery(''); setBranches([]); setSelectedBranch(null); }}
                      className="text-xs text-primary hover:underline mt-1.5 inline-block focus-visible:outline-primary"
                    >
                      Змінити місто
                    </button>
                  )}
                </div>
              )}

              {formData.delivery === 'np_branch' && selectedCity && (
                <div className="relative mt-4">
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Відділення або поштомат *
                  </label>
                  <input
                    type="text"
                    value={branchQuery}
                    onChange={e => { setBranchQuery(e.target.value); loadBranches(selectedCity.Ref, e.target.value); }}
                    placeholder="Номер або адреса відділення..."
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                  {branchLoading && <p className="text-xs text-text-light mt-1">Завантаження списку відділень...</p>}
                  {branches.length > 0 && !selectedBranch && (
                    <ul className="absolute z-20 w-full bg-surface border border-border/40 shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-border/20">
                      {branches.map(branch => (
                        <li
                          key={branch.Ref}
                          onClick={() => { setSelectedBranch(branch); setBranchQuery(branch.Description); setBranches([]); }}
                          className="px-4 py-3 hover:bg-surface-muted cursor-pointer text-sm text-text transition-colors"
                        >
                          {branch.Description}
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedBranch && (
                    <button
                      type="button"
                      onClick={() => { setSelectedBranch(null); setBranchQuery(''); }}
                      className="text-xs text-primary hover:underline mt-1.5 inline-block focus-visible:outline-primary"
                    >
                      Змінити відділення
                    </button>
                  )}
                </div>
              )}

              {formData.delivery === 'np_courier' && selectedCity && (
                <div className="mt-4">
                  <label className="block text-xs uppercase tracking-wider text-text-light mb-2">
                    Адреса доставки кур'єром *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="вул. Шевченка, 28, кв. 5"
                    className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                  />
                </div>
              )}
            </div>

            {/* Оплата */}
            <div className="bg-surface p-6 sm:p-8 border border-border/40 relative">
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 left-2 pointer-events-none" />
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

              <h2 className="text-xl font-serif text-text mb-6">Спосіб оплати</h2>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${formData.payment === 'upon_receipt' ? 'border-primary bg-primary-light/30' : 'border-border/30 bg-background hover:border-border/60'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="upon_receipt"
                    checked={formData.payment === 'upon_receipt'}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-primary focus-visible:outline-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text block">Оплата при отриманні</span>
                    <span className="text-xs text-text-light">У відділенні Нової Пошти або в бутику</span>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3.5 border cursor-pointer transition-colors ${formData.payment === 'card' ? 'border-primary bg-primary-light/30' : 'border-border/30 bg-background hover:border-border/60'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={formData.payment === 'card'}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-primary focus-visible:outline-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text block">Передоплата на розрахунковий рахунок</span>
                    <span className="text-xs text-text-light">Реквізити надішле менеджер після підтвердження</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Коментар */}
            <div className="bg-surface p-6 sm:p-8 border border-border/40 relative">
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 left-2 pointer-events-none" />
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

              <h2 className="text-xl font-serif text-text mb-4">Коментар до замовлення</h2>
              <textarea
                name="comment"
                rows="3"
                value={formData.comment}
                onChange={handleInputChange}
                className="w-full bg-background px-4 py-3 border border-border/40 text-text placeholder:text-text-light/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-primary text-sm"
                placeholder="Особливі побажання щодо пакування, розміру чи часу дзвінка..."
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-4 py-4 text-xs font-serif uppercase tracking-widest transition-colors duration-300 focus-visible:outline-primary shadow-sm"
            >
              Підтвердити замовлення
            </button>
          </form>
        </div>

        {/* Склад замовлення (Sidebar) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-surface border border-border/40 p-6 sm:p-8 sticky top-24 relative">
            <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 left-2 pointer-events-none" />
            <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

            <h2 className="text-2xl font-serif text-text mb-4 text-center">Ваше замовлення</h2>
            <BoudoirOrnament variant="divider" className="w-24 mx-auto mb-6 text-border" />

            <ul className="divide-y divide-border/30 mb-6 max-h-[42vh] overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.id} className="py-3.5 flex gap-3 items-start">
                  <div className="w-14 flex-shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      className="w-full aspect-[3/4] border border-border/30"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-serif text-sm text-text leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="font-serif text-sm text-primary font-medium whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    {(item.color || item.size) && (
                      <p className="text-xs text-text-light mt-1">
                        {item.color} {item.color && item.size && '/'} {item.size}
                      </p>
                    )}
                    <p className="text-xs text-text-light mt-0.5">
                      Кількість: {item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border/40 pt-4">
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-text-light">Вартість товарів</dt>
                  <dd className="font-serif text-text">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-light">Доставка</dt>
                  <dd className="text-xs text-text-light">За тарифами перевізника</dd>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-base font-serif">
                  <dt className="text-text">До сплати</dt>
                  <dd className="text-lg text-primary font-semibold">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
