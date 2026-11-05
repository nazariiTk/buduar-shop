import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import BoudoirOrnament from '../components/BoudoirOrnament';
import { formatPrice } from '../utils/format';

export default function Cart() {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="bg-surface border border-border/40 p-8 sm:p-12 max-w-lg w-full relative">
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute top-3 left-3 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute top-3 right-3 -scale-x-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute bottom-3 left-3 -scale-y-100 pointer-events-none" />
          <BoudoirOrnament variant="corner" className="w-10 h-10 text-border/70 absolute bottom-3 right-3 -scale-x-100 -scale-y-100 pointer-events-none" />

          <h1 className="text-3xl sm:text-4xl font-serif text-text mb-4">Ваш кошик порожній</h1>
          <BoudoirOrnament variant="divider" className="w-32 mx-auto mb-6 text-border" />
          <p className="text-text-light mb-8 font-body text-base">
            Схоже, ви ще не додали жодного виробу до свого замовлення. Завітайте до каталогу нашого бутика.
          </p>
          <Link
            to="/catalog"
            className="inline-block bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-8 py-3.5 font-serif uppercase tracking-widest text-xs transition-colors duration-300 focus-visible:outline-primary"
          >
            Перейти до покупок
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-8 border-b border-border/30 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-text">Ваш кошик</h1>
          <p className="text-text-light text-sm mt-1">
            Обрані вироби у вашому персональному списку
          </p>
        </div>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-serif uppercase tracking-widest text-text-light hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Продовжити покупки
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        {/* Список товарів */}
        <div className="lg:col-span-8">
          <ul className="divide-y divide-border/30 border-b border-border/30 lg:border-b-0">
            {items.map((item) => (
              <li key={item.id} className="py-6 flex gap-4 sm:gap-6 items-start">
                <div className="w-20 sm:w-24 flex-shrink-0">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    className="w-full aspect-[3/4] border border-border/40"
                  />
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                      <h3 className="font-serif text-lg text-text leading-snug">
                        {item.name}
                      </h3>
                      {item.category && (
                        <p className="text-xs uppercase tracking-wider text-text-light mt-0.5">
                          {item.category}
                        </p>
                      )}
                      {(item.color || item.size) && (
                        <p className="mt-1 text-xs text-text-light">
                          {item.color && <span>Колір: {item.color}</span>}
                          {item.color && item.size && <span className="mx-1.5">•</span>}
                          {item.size && <span>Розмір: {item.size}</span>}
                        </p>
                      )}
                    </div>
                    <p className="font-serif text-lg text-primary font-medium mt-1 sm:mt-0 whitespace-nowrap">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-between">
                    {/* Кількість */}
                    <div className="inline-flex items-center border border-border/50 bg-surface">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        aria-label="Зменшити кількість"
                        className="p-1.5 text-text hover:bg-surface-muted transition-colors focus-visible:outline-primary"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-3 text-sm font-medium text-text min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Збільшити кількість"
                        className="p-1.5 text-text hover:bg-surface-muted transition-colors focus-visible:outline-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Видалити */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-text-light hover:text-danger transition-colors p-1 focus-visible:outline-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Видалити</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Підсумок */}
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="bg-surface border border-border/40 p-6 sm:p-8 relative">
            <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 left-2 pointer-events-none" />
            <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

            <h2 className="text-2xl font-serif text-text mb-4 text-center">Разом</h2>
            <BoudoirOrnament variant="divider" className="w-24 mx-auto mb-6 text-border" />

            <div className="flow-root">
              <dl className="text-sm divide-y divide-border/30">
                <div className="py-3 flex items-center justify-between">
                  <dt className="text-text-light">Вартість товарів</dt>
                  <dd className="font-serif text-base text-text">{formatPrice(subtotal)}</dd>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <dt className="text-text-light">Доставка</dt>
                  <dd className="text-xs text-text-light">За тарифами перевізника</dd>
                </div>
                <div className="py-4 flex items-center justify-between border-t border-border/50 text-lg font-serif">
                  <dt className="text-text">До сплати</dt>
                  <dd className="text-xl text-primary font-semibold">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6">
              <Link
                to="/checkout"
                className="block text-center w-full bg-primary text-on-primary hover:bg-primary-hover border border-border/40 px-4 py-4 text-xs font-serif uppercase tracking-widest transition-colors duration-300 focus-visible:outline-primary"
              >
                Оформити замовлення
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-text-light leading-relaxed">
              Оплата при отриманні у відділенні або передоплата на карту.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
