import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Product } from '../App';
import { ShoppingCart, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  isDemoMode: boolean;
}

export function ProductCard({ product, isDemoMode }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    if (product.inStock) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="aspect-square bg-gray-100 relative group">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <span className="bg-white px-6 py-3 rounded-full shadow-lg">Out of Stock</span>
          </div>
        )}
        {isDemoMode && product.inStock && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            In Stock
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-xl mb-2">{product.name}</h3>
        <p className="text-gray-600 mb-4">{product.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ${product.price}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
              product.inStock
                ? isAdded
                  ? 'bg-green-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-5 h-5" />
                Added!
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}