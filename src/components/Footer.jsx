import { Link } from 'react-router-dom';
import BoudoirOrnament from './BoudoirOrnament';

export default function Footer() {
  return (
    <footer className="bg-text text-on-primary py-12 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">

          <div>
            <h3 className="text-2xl font-serif tracking-widest uppercase text-border mb-4">БУДУАР</h3>
            <p className="text-sm opacity-85 mb-2">Бутик вишуканої білизни та домашнього одягу</p>
            <p className="text-sm opacity-80">м. Трускавець</p>
          </div>

          <div>
            <h4 className="font-serif tracking-widest uppercase text-border text-sm font-semibold mb-4">Наші локації</h4>
            <ul className="space-y-2 text-sm opacity-85">
              <li>б-р Ю. Дрогобича, 3в, Торгова Алея «ПАСАЖ» бут. №6</li>
              <li>вул. Шевченка, 28</li>
              <li>вул. Стебницька, 43а ТЦ Вектор</li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif tracking-widest uppercase text-border text-sm font-semibold mb-4">Контакти</h4>
            <ul className="space-y-2 text-sm opacity-85">
              <li>
                <Link
                  to="/contacts"
                  className="hover:text-border transition-colors underline mb-2 inline-block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Всі деталі та адреси на карті
                </Link>
              </li>
              <li>+38 095 57 31 070</li>
              <li>+38 098 26 22 460</li>
              <li className="pt-2">
                <a
                  href="https://instagram.com/buduar_truskavets"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  @buduar_truskavets
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-border/30 mt-12 pt-8 text-center text-sm opacity-75">
          <BoudoirOrnament variant="divider" className="w-40 mx-auto mb-6 text-border/60" />
          &copy; {new Date().getFullYear()} Будуар. Всі права захищені.
        </div>
      </div>
    </footer>
  );
}
