import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function Cart() {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-serif mb-6">Ваш кошик порожній</h1>
        <p className="text-[var(--color-text-light)] mb-8 text-center">Схоже, ви ще не додали жодного товару до кошика.</p>
        <Link 
          to="/catalog" 
          className="bg-[var(--color-text)] text-[var(--color-background)] px-8 py-3 font-medium tracking-widest uppercase hover:bg-opacity-90 transition-all"
        >
          Перейти до покупок
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-serif mb-10">Кошик</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <ul className="divide-y divide-[var(--color-primary)] divide-opacity-30">
            {items.map((item) => (
              <li key={item.id} className="py-6 flex">
                <div className="flex-shrink-0 w-24 h-32 bg-[var(--color-primary-light)] overflow-hidden rounded-md">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="ml-4 flex-1 flex flex-col">
                  <div>
                    <div className="flex justify-between text-base font-medium">
                      <h3 className="font-serif text-lg">{item.name}</h3>
                      <p className="ml-4">{item.price * item.quantity} грн</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-light)]">{item.category}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-light)]">
                      {item.color && item.size ? `${item.color} / ${item.size}` : ''}
                      {item.color && !item.size ? item.color : ''}
                      {!item.color && item.size ? item.size : ''}
                    </p>
                  </div>
                  <div className="flex-1 flex items-end justify-between text-sm">
                    <div className="flex items-center border border-[var(--color-primary)] rounded-md">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="p-1 hover:bg-[var(--color-primary-light)] transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-[var(--color-primary-light)] transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="font-medium text-red-600 hover:text-red-500 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        <span className="sr-only">Видалити</span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-4 mt-10 lg:mt-0">
          <div className="bg-[var(--color-surface)] shadow-sm rounded-lg px-6 py-8 border border-[var(--color-primary-light)] border-opacity-50">
            <h2 className="text-xl font-serif mb-6">Замовлення</h2>
            
            <div className="flow-root">
              <dl className="-my-4 text-sm divide-y divide-[var(--color-primary)] divide-opacity-30">
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-[var(--color-text-light)]">Вартість товарів</dt>
                  <dd className="font-medium">{subtotal} грн</dd>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-[var(--color-text-light)]">Доставка</dt>
                  <dd className="font-medium">За тарифами перевізника</dd>
                </div>
                <div className="py-4 flex items-center justify-between text-lg font-bold">
                  <dt>Разом</dt>
                  <dd>{subtotal} грн</dd>
                </div>
              </dl>
            </div>

            <div className="mt-8">
              <Link 
                to="/checkout" 
                className="block text-center w-full bg-[var(--color-text)] text-[var(--color-background)] px-4 py-4 text-sm font-medium tracking-widest uppercase hover:bg-opacity-90 transition-all shadow-sm"
              >
                Оформити замовлення
              </Link>
            </div>
            
            <div className="mt-6 text-center text-xs text-[var(--color-text-light)]">
              Оплата здійснюється при отриманні або переказом на карту.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
