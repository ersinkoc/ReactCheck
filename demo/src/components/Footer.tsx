/**
 * Footer component - BUG: Not memoized, re-renders on every parent state change
 */

export function Footer() {
  // Log to see unnecessary re-renders
  console.log('[Footer] Rendering')

  return (
    <footer className="footer">
      <p>&copy; 2024 ReactCheck Demo Store</p>
      <p>Built to demonstrate unnecessary re-renders</p>
    </footer>
  )
}
