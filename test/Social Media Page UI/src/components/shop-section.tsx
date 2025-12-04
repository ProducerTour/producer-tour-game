import { useState } from 'react';
import { Product } from '../App';
import { ProductCard } from './product-card';
import { ShoppingBag, Filter } from 'lucide-react';

interface ShopSectionProps {
  products: Product[];
  isDemoMode: boolean;
}

export function ShopSection({ products, isDemoMode }: ShopSectionProps) {
  const [filter, setFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');

  const filteredProducts = products.filter((product) => {
    if (filter === 'inStock') return product.inStock;
    if (filter === 'outOfStock') return !product.inStock;
    return true;
  });

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingBag className="w-8 h-8" />
          <h2 className="text-3xl">My Shop</h2>
        </div>
        <p className="text-blue-100 text-lg">
          Handpicked products that I love and use every day. Get yours today!
        </p>
        {isDemoMode && (
          <div className="mt-4 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg inline-block text-sm">
            ✨ Demo: Add products to cart to see interactions
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-5 h-5 text-gray-500" />
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setFilter('inStock')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'inStock'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setFilter('outOfStock')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'outOfStock'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} isDemoMode={isDemoMode} />
        ))}
      </div>
    </div>
  );
}