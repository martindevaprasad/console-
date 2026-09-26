import React from 'react';
import { Product } from '@/store/productSlice';
import { IconSearch, IconTag, IconBox, IconGlass } from '@tabler/icons-react';

interface ProductGridProps {
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  onAddToCart: (product: Product) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  activeCategory,
  setActiveCategory,
  onAddToCart,
  searchQuery,
  setSearchQuery,
}) => {
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === 'ALL' || product.categoryId === activeCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search catalog item by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="pos-category-tabs">
        <button
          className={`pos-category-tab ${activeCategory === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveCategory('ALL')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <IconTag size={14} /> All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`pos-category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="pos-products" style={{ padding: 0 }}>
        {filteredProducts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconBox size={40} />
            </div>
            <div className="empty-state-title">No products found</div>
            <p className="text-xs text-muted">Try switching categories or adjust the search query.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => onAddToCart(product)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ color: 'var(--color-primary-light)', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <IconGlass size={30} />
                </div>
                <div className="product-card-name">{product.name}</div>
                <div className="product-card-price">${product.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;
