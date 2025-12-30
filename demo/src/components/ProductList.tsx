import type { Product } from '../App'
import { ProductCard } from './ProductCard'

interface ProductListProps {
  products: Product[]
  onAddToCart: (product: Product) => void
}

/**
 * ProductList component - BUG: Not memoized, re-renders on every parent state change
 * Also passes non-memoized callback to children
 */
export function ProductList({ products, onAddToCart }: ProductListProps) {
  console.log('[ProductList] Rendering')

  return (
    <div className="product-list">
      <h2>Products ({products.length})</h2>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  )
}
