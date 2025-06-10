import React from 'react';
import { Product } from '@/models/types';
import { FiPlus, FiStar } from 'react-icons/fi';

interface ProductWithSupplier extends Product {
  supplier_name?: string;
}

interface ProductGridProps {
  products: ProductWithSupplier[];
  onAddToCart: (product: Product, quantity: number) => void;
  selectedCategory: string;
  searchTerm: string;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  onAddToCart, 
  selectedCategory, 
  searchTerm 
}) => {
  const getStorageIcon = (temp: string) => {
    switch (temp) {
      case 'frozen': return '🧊';
      case 'refrigerated': return '❄️';
      case 'room_temp': return '🌡️';
      default: return '📦';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'bakery_products': return '🥖';
      case 'dairy': return '🥛';
      case 'produce': return '🥬';
      case 'deli': return '🥪';
      case 'specialty_breads': return '🍞';
      case 'coffee': return '☕';
      case 'beverages': return '🥤';
      case 'condiments': return '🧂';
      case 'cleaning': return '🧽';
      case 'disposables': return '📦';
      default: return '🍴';
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchTerm ? 'No products found' : 'No products available'}
        </h3>
        <p className="text-gray-500">
          {searchTerm 
            ? `Try searching for something else or browse all categories.`
            : `Check back later for new products.`
          }
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedCategory === 'all' ? 'All Products' : 
             selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace('_', ' ')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            {/* Product Image Placeholder */}
            <div className="relative h-48 bg-gradient-to-br from-amber-50 to-amber-100 rounded-t-lg flex items-center justify-center">
              <div className="text-6xl">{getCategoryEmoji(product.category)}</div>
              {product.kosher_certified && (
                <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  ✓ Kosher
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                <span className="text-lg">{getStorageIcon(product.storage_temp || 'room_temp')}</span>
                <span className="text-xs text-gray-600 bg-white bg-opacity-75 px-2 py-1 rounded">
                  {product.storage_temp?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm leading-tight">
                  {product.name}
                </h3>
                <div className="flex items-center ml-2">
                  <FiStar className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500 ml-1">4.8</span>
                </div>
              </div>
              
              {product.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-lg font-bold text-gray-900">
                    £{product.price?.toFixed(2) || 'N/A'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    per {product.unit}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Stock: {product.current_stock}
                </div>
              </div>

              {/* Supplier Info */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500">
                  by {product.supplier_name || 'Local Supplier'}
                </span>
                {product.shelf_life_days && (
                  <span className="text-xs text-gray-500">
                    📅 {product.shelf_life_days}d fresh
                  </span>
                )}
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => onAddToCart(product, 1)}
                disabled={product.current_stock <= 0}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  product.current_stock <= 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                <FiPlus className="h-4 w-4 mr-2" />
                {product.current_stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGrid;