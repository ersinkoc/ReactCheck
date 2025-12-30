/**
 * Header component - BUG: Not memoized, re-renders on every parent state change
 */

export function Header() {
  // Log to see unnecessary re-renders
  console.log('[Header] Rendering')

  return (
    <header className="header">
      <h1>ReactCheck Demo Store</h1>
      <p>A demo app with intentional performance issues</p>
    </header>
  )
}
