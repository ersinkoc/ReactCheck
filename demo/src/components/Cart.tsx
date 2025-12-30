import type { CartItem } from '../App'

interface CartProps {
  items: CartItem[]
  onRemove: (productId: number) => void
}

/**
 * Cart component - BUG: Not memoized, re-renders when counter or search changes
 */
export function Cart({ items, onRemove }: CartProps) {
  console.log('[Cart] Rendering')

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="cart">
      <h2>Shopping Cart ({items.length})</h2>
      {items.length === 0 ? (
        <p className="empty-cart">Your cart is empty</p>
      ) : (
        <>
          <ul className="cart-items">
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <span className="item-name">{item.name}</span>
                <span className="item-quantity">x{item.quantity}</span>
                <span className="item-price">${item.price * item.quantity}</span>
                <button onClick={() => onRemove(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <strong>Total: ${total}</strong>
          </div>
        </>
      )}
    </div>
  )
}
