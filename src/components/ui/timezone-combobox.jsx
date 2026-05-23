import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { formControlClass } from './form-controls'

export function TimezoneCombobox({ value, onChange, options = [], disabled, placeholder, className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState({})
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/_/g, ' ')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  }

  const filtered = query.trim()
    ? options.filter((tz) => normalize(tz).includes(normalize(query)))
    : options

  function select(tz) {
    onChange(tz)
    setQuery('')
    setOpen(false)
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const first = listRef.current?.querySelector('[role="option"]')
      first?.focus()
    } else if (e.key === 'Enter' && filtered.length === 1) {
      select(filtered[0])
    }
  }

  function handleOptionKeyDown(e, tz, index) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select(tz)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const items = listRef.current?.querySelectorAll('[role="option"]')
      items?.[index + 1]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (index === 0) {
        inputRef.current?.focus()
      } else {
        const items = listRef.current?.querySelectorAll('[role="option"]')
        items?.[index - 1]?.focus()
      }
    }
  }

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleScroll() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [open])

  useEffect(() => {
    function handleClickOutside(e) {
      const inContainer = containerRef.current?.contains(e.target)
      const inDropdown = listRef.current?.contains(e.target)
      if (!inContainer && !inDropdown) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dropdown = open ? (
    <div
      style={dropdownStyle}
      className="z-[9999] max-h-56 overflow-y-auto rounded-md border border-border/80 bg-card shadow-[0_8px_30px_-8px_rgba(92,134,255,0.35)] backdrop-blur-xl"
      role="listbox"
      ref={listRef}
    >
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-[12px] text-muted-foreground">
          Nenhum resultado encontrado
        </div>
      ) : (
        filtered.map((tz, index) => (
          <div
            key={tz}
            role="option"
            aria-selected={tz === value}
            tabIndex={0}
            className={cn(
              'cursor-pointer px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-accent/70 focus:bg-accent/70 focus:outline-none',
              tz === value && 'bg-accent/50 font-medium',
            )}
            onClick={() => select(tz)}
            onKeyDown={(e) => handleOptionKeyDown(e, tz, index)}
          >
            {tz}
          </div>
        ))
      )}
    </div>
  ) : null

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          formControlClass,
          'flex items-center gap-1.5 pr-1.5 cursor-text',
          disabled && 'pointer-events-none opacity-60',
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true)
            setTimeout(() => inputRef.current?.focus(), 0)
          }
        }}
      >
        {open ? (
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : null}

        <input
          ref={inputRef}
          type="text"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={open ? 'Buscar fuso horário...' : (value || placeholder || '')}
          value={open ? query : ''}
          readOnly={!open}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
        />

        {!open && value ? (
          <span className="truncate text-[12px] text-foreground pointer-events-none absolute left-2.5 right-8">
            {value}
          </span>
        ) : null}

        <div className="flex shrink-0 items-center gap-0.5">
          {open && query ? (
            <button
              type="button"
              tabIndex={-1}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); setQuery('') }}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </div>

      {createPortal(dropdown, document.body)}
    </div>
  )
}
