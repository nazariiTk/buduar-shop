import { MapPin, Phone, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import BoudoirOrnament from '../components/BoudoirOrnament';

export default function Contacts() {
  const socials = [
    {
      name: 'Instagram',
      desc: '@buduar_truskavets',
      href: 'https://www.instagram.com/buduar_truskavets?igsh=MTk3bzB3NmZjeHIxcA%3D%3D&utm_source=qr',
      color: 'bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    },
    {
      name: 'Facebook',
      desc: 'Сторінка бренду',
      href: 'https://www.facebook.com/share/1CKw2iGwRr/?mibextid=wwXIfr',
      color: 'bg-[#1877f2]',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    },
    {
      name: 'Viber',
      desc: 'Чат з консультантом',
      href: 'https://connect.viber.com/business/c83d145e-b60d-11ef-8ae7-9ec77293d17a',
      color: 'bg-[#665cac]',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M11.4 0C5.5.1 1 4.7 1 10.6c0 2.9 1.1 5.6 3 7.6v3.6c0 .4.5.6.8.3l3.1-2.3c1.1.4 2.3.6 3.5.6 5.9 0 10.6-4.6 10.6-10.4C22 4.1 17.3 0 11.4 0zm5.8 15.1c-.5.6-1.1.9-1.8.9-.3 0-.7-.1-1-.2-1.7-.7-3.3-1.6-4.7-2.8-1.3-1.2-2.4-2.6-3.1-4.2-.3-.7-.5-1.3-.5-2 0-.7.2-1.3.7-1.8.3-.4.8-.6 1.3-.6.2 0 .4 0 .5.1.4.2.8.6 1.1 1.1l1.2 2c.2.4.1.9-.2 1.2l-.4.4c-.1.1-.1.2 0 .3.5.9 1.3 1.7 2.2 2.2.1.1.2.1.3 0l.4-.4c.3-.3.8-.4 1.2-.2l2 1.2c.5.3.9.7 1.1 1.1.1.3 0 .6-.3.7z" />
        </svg>
      )
    },
    {
      name: 'Telegram',
      desc: '+380 95 573 10 70',
      href: 'https://t.me/+380955731070',
      color: 'bg-[#26a5e4]',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      )
    }
  ];

  const shops = [
    {
      name: 'ПАСАЖ',
      address: 'вул. Ю. Дрогобича, 3в, Торгова Алея «ПАСАЖ», бут. №6',
      maps: 'https://maps.app.goo.gl/FVECHYYvtLszThPg8'
    },
    {
      name: 'Центр (Platinum)',
      address: 'вул. Шевченка, 28',
      maps: 'https://maps.app.goo.gl/9atVEXwShHfxuHe88'
    },
    {
      name: 'ТЦ Вектор',
      address: 'вул. Стебницька, 43а',
      maps: 'https://maps.app.goo.gl/wrRaQcMt8LSiBrwX7'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Helmet>
        <title>Контакти — БУДУАР · Трускавець</title>
        <meta
          name="description"
          content="Адреси бутиків БУДУАР у Трускавці. Телефони, Instagram, години роботи. Доставка вишуканої білизни по всій Україні."
        />
      </Helmet>

      {/* Заголовок сторінки */}
      <div className="text-center mb-14">
        <p className="text-xs uppercase tracking-[0.3em] text-text-light font-serif mb-2">
          Мережа бутиків
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif text-text mb-4">
          Наші контакти
        </h1>
        <BoudoirOrnament variant="divider" className="w-40 mx-auto mb-4 text-border" />
        <p className="text-text-light text-base max-w-xl mx-auto">
          Завітайте до бутиків «Будуар» у Трускавці або зв’яжіться з нами для консультації та індивідуального підбору.
        </p>
      </div>

      {/* Бутики */}
      <div className="mb-16">
        <h2 className="text-2xl font-serif text-text text-center mb-8">
          Бутики у м. Трускавець
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <div
              key={shop.name}
              className="bg-surface border border-border/40 p-6 relative flex flex-col justify-between"
            >
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 left-2 pointer-events-none" />
              <BoudoirOrnament variant="corner" className="w-6 h-6 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />

              <div>
                <h3 className="font-serif text-xl text-text mb-3">
                  {shop.name}
                </h3>
                <div className="flex items-start gap-2.5 text-sm text-text-light mb-6">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-1 text-primary" />
                  <span className="leading-relaxed">{shop.address}, м. Трускавець</span>
                </div>
              </div>

              <a
                href={shop.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-serif uppercase tracking-widest text-primary hover:underline underline-offset-4 transition-colors focus-visible:outline-primary pt-3 border-t border-border/20"
              >
                Відкрити на карті →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Контактна інфо: Телефони та Години */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        <div className="bg-surface border border-border/40 p-6 text-center relative">
          <Phone className="h-6 w-6 mx-auto mb-3 text-primary" />
          <h3 className="font-serif text-lg text-text mb-3">Телефони для зв’язку</h3>
          <a
            href="tel:+380955731070"
            className="block text-sm text-text hover:text-primary transition-colors mb-1 font-body"
          >
            +38 095 573 10 70
          </a>
          <a
            href="tel:+380982622460"
            className="block text-sm text-text hover:text-primary transition-colors font-body"
          >
            +38 098 262 24 60
          </a>
        </div>

        <div className="bg-surface border border-border/40 p-6 text-center relative">
          <Clock className="h-6 w-6 mx-auto mb-3 text-primary" />
          <h3 className="font-serif text-lg text-text mb-3">Години роботи</h3>
          <p className="text-sm text-text-light mb-1">Понеділок – Субота: 10:00 – 19:00</p>
          <p className="text-sm text-text-light">Неділя: 10:00 – 17:00</p>
        </div>
      </div>

      {/* Соцмережі та месенджери */}
      <div className="max-w-xl mx-auto mb-16">
        <h3 className="font-serif text-2xl text-center text-text mb-2">
          Соцмережі та месенджери
        </h3>
        <BoudoirOrnament variant="divider" className="w-24 mx-auto mb-6 text-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 p-3.5 border border-border/40 bg-surface hover:border-primary hover:bg-surface-muted transition-colors group focus-visible:outline-primary"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-base text-text group-hover:text-primary transition-colors leading-snug">
                  {s.name}
                </div>
                <div className="text-xs text-text-light truncate">
                  {s.desc}
                </div>
              </div>
              <div className="text-border/60 group-hover:text-primary transition-colors font-serif text-lg pr-1">
                ›
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Доставка по всій Україні */}
      <div className="bg-surface border border-border/40 p-8 sm:p-10 text-center relative max-w-3xl mx-auto">
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 left-2 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute top-2 right-2 -scale-x-100 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute bottom-2 left-2 -scale-y-100 pointer-events-none" />
        <BoudoirOrnament variant="corner" className="w-8 h-8 text-border/60 absolute bottom-2 right-2 -scale-x-100 -scale-y-100 pointer-events-none" />

        <h3 className="font-serif text-2xl text-text mb-3">Доставка по всій Україні</h3>
        <BoudoirOrnament variant="divider" className="w-28 mx-auto mb-4 text-border" />
        <p className="text-text-light text-sm max-w-lg mx-auto leading-relaxed">
          Відправляємо замовлення щодня Новою Поштою (до відділення або кур'єром). Оплата при отриманні або на розрахунковий рахунок. Термін доставки: 1–2 дні.
        </p>
      </div>
    </div>
  );
}
