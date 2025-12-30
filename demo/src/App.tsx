import { useState, useCallback } from 'react'
import { ProductList } from './components/ProductList'
import { SearchInput } from './components/SearchInput'
import { Header } from './components/Header'
import { Cart } from './components/Cart'
import { Footer } from './components/Footer'
import './App.css'

// Sample products
const products = [
  { id: 1, name: 'Laptop', price: 999, category: 'Electronics' },
  { id: 2, name: 'Phone', price: 699, category: 'Electronics' },
  { id: 3, name: 'Headphones', price: 199, category: 'Electronics' },
  { id: 4, name: 'Keyboard', price: 149, category: 'Electronics' },
  { id: 5, name: 'Mouse', price: 49, category: 'Electronics' },
  { id: 6, name: 'T-Shirt', price: 29, category: 'Clothing' },
  { id: 7, name: 'Jeans', price: 59, category: 'Clothing' },
  { id: 8, name: 'Sneakers', price: 89, category: 'Clothing' },
  { id: 9, name: 'Book', price: 19, category: 'Books' },
  { id: 10, name: 'Notebook', price: 9, category: 'Books' },
]

export interface Product {
  id: number
  name: string
  price: number
  category: string
}

export interface CartItem extends Product {
  quantity: number
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [counter, setCounter] = useState(0)

  // BUG: This filter runs on every render, even when counter changes
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // BUG: New function reference on every render - causes child re-renders
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  // BUG: New function reference on every render
  const handleRemoveFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  // Properly memoized callback for comparison
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  return (
    <div className="app">
      {/* BUG: Header re-renders on every state change even though it doesn't use any props */}
      <Header />

      <main className="main">
        <div className="controls">
          {/* Counter to trigger unnecessary re-renders */}
          <div className="counter">
            <span>Counter: {counter}</span>
            <button onClick={() => setCounter(c => c + 1)}>
              Increment (triggers re-renders)
            </button>
          </div>

          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="content">
          {/* BUG: ProductList re-renders when counter changes */}
          <ProductList
            products={filteredProducts}
            onAddToCart={handleAddToCart}
          />

          {/* BUG: Cart re-renders when counter or search changes */}
          <Cart
            items={cart}
            onRemove={handleRemoveFromCart}
          />
        </div>
      </main>

      {/* BUG: Footer re-renders on every state change */}
      <Footer />
    </div>
  )
}

export default App
