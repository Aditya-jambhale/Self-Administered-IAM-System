import { useMemo, useState } from 'react'

const SearchSelect = ({ id, label, options, value, onChange, placeholder = 'Search', disabled = false }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options.slice(0, 8)
    return options
      .filter((option) => `${option.label} ${option.description || ''}`.toLowerCase().includes(normalized))
      .slice(0, 8)
  }, [options, query])

  return (
    <div className="search-select">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        value={query || selected?.label || ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value)
          if (value) onChange('')
        }}
        onFocus={() => {
          setQuery('')
          setIsOpen(true)
        }}
        onBlur={() => setIsOpen(false)}
      />
      {isOpen && !disabled && (
        <div className="search-options">
          {filtered.length === 0 ? (
            <span className="search-empty">No matches</span>
          ) : (
            filtered.map((option) => (
              <button
                type="button"
                className={option.value === value ? 'search-option active' : 'search-option'}
                key={option.value}
                onMouseDown={(e) => {
                  e.preventDefault() // Prevents input blur race condition
                  onChange(option.value)
                  setQuery('')
                  setIsOpen(false)
                }}
              >
                <span>{option.label}</span>
                {option.description && <small>{option.description}</small>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default SearchSelect
