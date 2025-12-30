import type { Product } from '../App'

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
}

/**
 * ProductCard component - BUG: Not memoized, re-renders when parent re-renders
 * even if props haven't changed
 */
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  console.log(`[ProductCard] Rendering: ${product.name}`)

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p className="category">{product.category}</p>
      <p className="price">${product.price}</p>
      <button onClick={() => onAddToCart(product)}>Add to Cart</button>
    </div>
  )
}
