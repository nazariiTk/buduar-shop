export default function Footer() {
  return (
    <footer className="bg-[var(--color-text)] text-[var(--color-background)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">

          <div>
            <h3 className="text-2xl font-serif tracking-widest mb-4">БУДУАР</h3>
            <p className="text-sm opacity-80 mb-4">Бутик розкішної білизни</p>
            <p className="text-sm opacity-80">м. Трускавець</p>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">Наші локації</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>6-р Ю. Дрогобича, 3в, Торгова Алея «ПАСАЖ» бут. №6</li>
              <li>вул. Шевченка, 28</li>
              <li>вул. Стебницька, 43а ТЦ Вектор</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">Контакти</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>+38 095 57 31 070</li>
              <li>+38 098 26 22 460</li>
              <li className="pt-2">
                <a href="https://instagram.com/buduar_truskavets" target="_blank" rel="noreferrer" className="hover:text-[var(--color-primary)] transition-colors">
                  @buduar_truskavets
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-opacity-20 border-white mt-12 pt-8 text-center text-sm opacity-60">
          &copy; {new Date().getFullYear()} Будуар. Всі права захищені.
        </div>
      </div>
    </footer>
  );
}
