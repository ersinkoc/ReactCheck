import { memo } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

/**
 * SearchInput component - Properly memoized for comparison
 */
export const SearchInput = memo(function SearchInput({ value, onChange }: SearchInputProps) {
  console.log('[SearchInput] Rendering')

  return (
    <div className="search-input">
      <input
        type="text"
        placeholder="Search products..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
})
