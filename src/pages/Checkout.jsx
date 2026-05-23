import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { supabase } from '../lib/supabase';

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
      const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: import.meta.env.VITE_NP_API_KEY,
          modelName: 'Address',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: query,
            Limit: 7,
            Language: 'UA'
          }
        })
      });
      const data = await res.json();
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
      const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: import.meta.env.VITE_NP_API_KEY,
          modelName: 'AddressGeneral',
          calledMethod: 'getWarehouses',
          methodProperties: {
            SettlementRef: cityRef,
            FindByString: branchFilter,
            Limit: 20,
            Language: 'UA'
          }
        })
      });
      const data = await res.json();
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
    })

    if (error || data?.error) {
      alert(data?.error || 'Помилка при збереженні замовлення')
      return
    }

    setOrderNumber(data.order_number)
    clearCart()
    setIsSubmitted(true)
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <p className="text-2xl font-serif text-[var(--color-primary)] mb-2">
          Замовлення {orderNumber}
        </p>
        <h1 className="text-4xl font-serif mb-4">Дякуємо за замовлення!</h1>
        <p className="text-lg text-[var(--color-text-light)] mb-8">
          Наш менеджер зв'яжеться з вами найближчим часом для підтвердження.
        </p>
        <Link
          to="/catalog"
          className="bg-[var(--color-text)] text-[var(--color-background)] px-8 py-4 font-medium tracking-widest uppercase hover:bg-opacity-90 transition-all"
        >
          Повернутись до магазину
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-serif mb-6">Ваш кошик порожній</h1>
        <Link to="/catalog" className="underline hover:text-[var(--color-primary)]">
          Перейти до покупок
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-serif mb-10">Оформлення замовлення</h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12 flex flex-col-reverse">
        <div className="lg:col-span-7 xl:col-span-8 mt-10 lg:mt-0">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Контактні дані */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-[var(--color-primary)] border-opacity-20">
              <h2 className="text-xl font-serif mb-6">Контактні дані</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Ім'я *</label>
                  <input
                    type="text" name="firstName" required
                    value={formData.firstName} onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Прізвище *</label>
                  <input
                    type="text" name="lastName" required
                    value={formData.lastName} onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Телефон *</label>
                  <input
                    type="tel" name="phone" required placeholder="+380"
                    value={formData.phone} onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email" name="email" required
                    value={formData.email} onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>

            {/* Доставка */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-[var(--color-primary)] border-opacity-20">
              <h2 className="text-xl font-serif mb-6">Доставка</h2>
              <div className="space-y-4 mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio" name="delivery" value="np_branch"
                    checked={formData.delivery === 'np_branch'} onChange={handleInputChange}
                    className="h-4 w-4 text-[var(--color-text)] focus:ring-[var(--color-text)]"
                  />
                  <span>Нова Пошта — відділення</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio" name="delivery" value="np_courier"
                    checked={formData.delivery === 'np_courier'} onChange={handleInputChange}
                    className="h-4 w-4 text-[var(--color-text)] focus:ring-[var(--color-text)]"
                  />
                  <span>Нова Пошта — кур'єр</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio" name="delivery" value="pickup"
                    checked={formData.delivery === 'pickup'} onChange={handleInputChange}
                    className="h-4 w-4 text-[var(--color-text)] focus:ring-[var(--color-text)]"
                  />
                  <span>Самовивіз з магазину</span>
                </label>
              </div>

              {formData.delivery === 'pickup' && (
                <div className="space-y-3 mt-4">
                  <label className="block text-sm font-medium mb-2">Оберіть магазин *</label>
                  {shops.map(shop => (
                    <label
                      key={shop.id}
                      className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-all ${selectedShop?.id === shop.id
                        ? 'border-[var(--color-text)] bg-[var(--color-primary-light)]'
                        : 'border-gray-200 hover:border-gray-400'
                        }`}
                    >
                      <input
                        type="radio"
                        name="shop"
                        value={shop.id}
                        checked={selectedShop?.id === shop.id}
                        onChange={() => setSelectedShop(shop)}
                        className="mt-1 h-4 w-4 text-[var(--color-text)] focus:ring-[var(--color-text)]"
                      />
                      <div>
                        <p className="font-medium">{shop.name}</p>
                        <p className="text-sm text-[var(--color-text-light)]">{shop.address}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {(formData.delivery === 'np_branch' || formData.delivery === 'np_courier') && (
                <div className="relative mt-4">
                  <label className="block text-sm font-medium mb-2">Місто *</label>
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); searchCities(e.target.value); }}
                    placeholder="Почніть вводити назву міста..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                  {cityLoading && <p className="text-xs text-gray-400 mt-1">Пошук...</p>}
                  {cities.length > 0 && !selectedCity && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {cities.map(city => (
                        <li
                          key={city.Ref}
                          onClick={() => {
                            setSelectedCity(city);
                            setCityQuery(city.Present);
                            setCities([]);
                            if (formData.delivery === 'np_branch') loadBranches(city.Ref);
                          }}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0"
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
                      className="text-xs text-gray-400 hover:text-[var(--color-text)] mt-1 underline"
                    >
                      Змінити місто
                    </button>
                  )}
                </div>
              )}

              {formData.delivery === 'np_branch' && selectedCity && (
                <div className="relative mt-4">
                  <label className="block text-sm font-medium mb-2">Відділення *</label>
                  <input
                    type="text"
                    value={branchQuery}
                    onChange={e => { setBranchQuery(e.target.value); loadBranches(selectedCity.Ref, e.target.value); }}
                    placeholder="Номер або адреса відділення..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                  {branchLoading && <p className="text-xs text-gray-400 mt-1">Завантаження...</p>}
                  {branches.length > 0 && !selectedBranch && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {branches.map(branch => (
                        <li
                          key={branch.Ref}
                          onClick={() => { setSelectedBranch(branch); setBranchQuery(branch.Description); setBranches([]); }}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0"
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
                      className="text-xs text-gray-400 hover:text-[var(--color-text)] mt-1 underline"
                    >
                      Змінити відділення
                    </button>
                  )}
                </div>
              )}

              {formData.delivery === 'np_courier' && selectedCity && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Адреса доставки *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="вул. Шевченка, 28, кв. 5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                  />
                </div>
              )}
            </div>

            {/* Оплата */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-[var(--color-primary)] border-opacity-20">
              <h2 className="text-xl font-serif mb-6">Оплата</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio" name="payment" value="upon_receipt"
                    checked={formData.payment === 'upon_receipt'} onChange={handleInputChange}
                    className="h-4 w-4 text-[var(--color-text)] focus:ring-[var(--color-text)]"
                  />
                  <span>Оплата при отриманні</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio" name="payment" value="card"
                    checked={formData.payment === 'card'} onChange={handleInputChange}
                    className="h-4 w-4 text-[var(--color-text)] focus:ring-[var(--color-text)]"
                  />
                  <span>Передоплата на карту</span>
                </label>
              </div>
            </div>

            {/* Коментар */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-[var(--color-primary)] border-opacity-20">
              <h2 className="text-xl font-serif mb-6">Коментар до замовлення</h2>
              <textarea
                name="comment" rows="3"
                value={formData.comment} onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]"
                placeholder="Ваші побажання..."
              ></textarea>
            </div>

            <button type="submit" className="w-full bg-[var(--color-text)] text-[var(--color-background)] px-4 py-5 text-lg font-medium tracking-widest uppercase hover:bg-opacity-90 transition-all shadow-md">
              Підтвердити замовлення
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-[var(--color-surface)] shadow-sm rounded-lg px-6 py-8 border border-[var(--color-primary-light)] border-opacity-50 sticky top-24">
            <h2 className="text-xl font-serif mb-6">Ваше замовлення</h2>

            <ul className="divide-y divide-[var(--color-primary)] divide-opacity-30 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {items.map((item) => (
                <li key={item.id} className="py-4 flex">
                  <div className="flex-shrink-0 w-16 h-20 bg-[var(--color-primary-light)] overflow-hidden rounded">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="ml-4 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between text-sm font-medium">
                      <h3>{item.name}</h3>
                      <p className="ml-2">{item.price * item.quantity} грн</p>
                    </div>
                    <p className="text-xs text-[var(--color-text-light)] mt-1">
                      {item.color} {item.color && item.size && '/'} {item.size}
                    </p>
                    <p className="text-xs text-[var(--color-text-light)] mt-1">Кількість: {item.quantity}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flow-root border-t border-[var(--color-primary)] border-opacity-30 pt-6">
              <dl className="-my-4 text-sm divide-y divide-[var(--color-primary)] divide-opacity-30">
                <div className="py-4 flex items-center justify-between text-lg font-bold">
                  <dt>До оплати</dt>
                  <dd>{subtotal} грн</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
