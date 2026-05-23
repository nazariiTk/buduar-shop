import { Link, useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  return (
    <div className="group flex flex-col bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/product/${product.slug || product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-[var(--color-primary-light)]">
        {product.image || product.main_photo_url ? (
          <img 
            src={product.image || product.main_photo_url} 
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]">
            БУДУАР
          </div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/product/${product.slug || product.id}`}>
          <h3 className="text-lg font-serif mb-1 hover:text-[var(--color-primary)] transition-colors">{product.name}</h3>
        </Link>
        <p className="text-sm text-[var(--color-text-light)] mb-4 flex-grow">{product.category}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-medium">{product.price} грн</span>
          <button 
            onClick={() => navigate(`/product/${product.slug || product.id}`)}
            className="px-4 py-2 bg-[var(--color-text)] text-[var(--color-background)] text-sm font-medium hover:bg-opacity-90 transition-colors"
          >
            Обрати розмір →
          </button>
        </div>
      </div>
    </div>
  );
}
