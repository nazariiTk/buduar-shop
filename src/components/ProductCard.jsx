import { Link, useNavigate } from 'react-router-dom';
import ProductImage from './ProductImage';
import { formatPrice } from '../utils/format';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <div className="group bg-surface rounded-sm overflow-hidden border border-border/30 hover:border-border/60 transition-all duration-500 flex flex-col">
      <Link
        to={productUrl}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ProductImage
          src={product.main_photo_url || product.image}
          alt={product.name}
          className="border-0 border-b border-border/30"
          imgClassName="group-hover:scale-105"
        />
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <Link
          to={productUrl}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <h3 className="text-lg font-serif text-text mb-1 hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        {product.category && (
          <p className="text-sm text-text-light mb-4 flex-grow">{product.category}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <span className="font-serif text-lg font-semibold text-text">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => navigate(productUrl)}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-hover font-serif tracking-wider text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Обрати розмір →
          </button>
        </div>
      </div>
    </div>
  );
}
