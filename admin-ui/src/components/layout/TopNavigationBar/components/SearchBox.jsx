import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { MENU_ITEMS } from '@/assets/data/menu-items' // adjust path

// 🔥 Extract only children that have url
const extractSearchableItems = (items) => {
  let result = []

  items.forEach((item) => {
    if (item.url) {
      result.push({
        label: item.label,
        url: item.url,
      })
    }

    if (item.children) {
      result = result.concat(extractSearchableItems(item.children))
    }
  })

  return result
}

const SearchBox = () => {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Get only children with url
  const searchableItems = useMemo(() => extractSearchableItems(MENU_ITEMS), [])

  // Filter based on input
  const filteredItems = search ? searchableItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())) : []

  const handleSelect = (url) => {
    setSearch('')
    navigate(url)
  }

  return (
    <form className="app-search d-none d-md-block me-auto position-relative" onSubmit={(e) => e.preventDefault()}>
      <div className="position-relative">
        <input
          type="search"
          className="form-control"
          placeholder="Search..."
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <IconifyIcon icon="iconamoon:search-duotone" className="search-widget-icon" />
      </div>

      {/* Dropdown */}
      {search && (
        <div
          className="dropdown-menu show mt-1"
          style={{
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <button key={index} type="button" className="dropdown-item" onClick={() => handleSelect(item.url)}>
                {item.label}
              </button>
            ))
          ) : (
            <div className="dropdown-item text-muted">No results found</div>
          )}
        </div>
      )}
    </form>
  )
}

export default SearchBox
