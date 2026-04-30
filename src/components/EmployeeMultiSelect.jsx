import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ChevronDown, Search, UserRound, X } from 'lucide-react'
import { Input } from './ui/input'
import { cn } from '../lib/utils'

const getEmployeeDisplayName = (employee) =>
  employee?.name || employee?.full_name || employee?.fullName || employee?.email || 'Colaborador'

export default function EmployeeMultiSelect({
  options = [],
  value = [],
  onChange,
  multiple = true,
  loading = false,
  error = '',
  disabled = false,
  triggerPlaceholder = '',
  searchPlaceholder = '',
  emptyText = '',
  selectedCountText,
  showSelectedChips = true,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef(null)

  const selectedIds = useMemo(() => value.map(String), [value])

  const optionsById = useMemo(
    () => new Map(options.map((option) => [String(option.id), option])),
    [options],
  )

  const selectedEmployees = useMemo(
    () => selectedIds.map((id) => optionsById.get(id)).filter(Boolean),
    [optionsById, selectedIds],
  )

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return options

    return options.filter((option) => {
      const candidate = `${option?.name || ''} ${option?.email || ''}`.toLowerCase()
      return candidate.includes(query)
    })
  }, [options, search])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!open || !rootRef.current || typeof window === 'undefined') return

    const updateDirection = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const estimatedDropdownHeight = 360

      setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow)
    }

    updateDirection()
    window.addEventListener('resize', updateDirection)

    return () => window.removeEventListener('resize', updateDirection)
  }, [open])

  const clearSelection = () => {
    onChange?.([])
    setSearch('')
  }

  const toggleSelection = (employeeId) => {
    const normalizedId = String(employeeId)
    const isSelected = selectedIds.includes(normalizedId)

    if (!multiple) {
      onChange?.(isSelected ? [] : [normalizedId])
      setSearch('')
      setOpen(false)
      return
    }

    const next = isSelected
      ? selectedIds.filter((id) => id !== normalizedId)
      : [...selectedIds, normalizedId]

    onChange?.(next)
  }

  const triggerLabel =
    selectedEmployees.length === 0
      ? triggerPlaceholder
      : selectedEmployees.length === 1
        ? getEmployeeDisplayName(selectedEmployees[0])
        : selectedCountText
          ? selectedCountText(selectedEmployees.length)
          : `${selectedEmployees.length} selecionado(s)`

  return (
    <div className={cn('min-w-0', className)}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-md border border-border/80 bg-background/80 px-2.5 py-1.5 text-left text-[11px] text-foreground shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)] transition backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/70',
            open && 'border-ring',
          )}
        >
          <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 overflow-hidden">
            {selectedEmployees.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="truncate text-[11px] font-semibold text-foreground">{triggerLabel}</span>
                <span
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!disabled) clearSelection()
                  }}
                  onKeyDown={(event) => {
                    if (disabled) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      clearSelection()
                    }
                  }}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/80"
                >
                  <X className="h-3 w-3" />
                </span>
              </div>
            ) : (
              <span className="block truncate whitespace-nowrap text-muted-foreground">{triggerLabel}</span>
            )}
          </div>
          <ChevronDown
            className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>

        {open ? (
          <div
            className={cn(
              'absolute left-0 right-0 z-30 rounded-[18px] border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] backdrop-blur-xl',
              openUpward ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]',
            )}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 text-xs"
              />
            </div>

            <div className="mt-2 max-h-[min(16rem,calc(100vh-14rem))] space-y-2 overflow-auto pr-1">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-9 w-full animate-pulse rounded-lg bg-muted/70" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs">{error}</span>
                </div>
              ) : filteredOptions.length ? (
                filteredOptions.map((employee) => {
                  const employeeId = String(employee.id)
                  const isSelected = selectedIds.includes(employeeId)

                  return (
                    <button
                      key={employeeId}
                      type="button"
                      onClick={() => toggleSelection(employeeId)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition',
                        isSelected
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-border/70 bg-background/70 hover:border-primary/30 hover:bg-muted/60',
                      )}
                    >
                      <UserRound
                        className={cn(
                          'mt-0.5 h-3.5 w-3.5 shrink-0',
                          isSelected ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {getEmployeeDisplayName(employee)}
                        </div>
                        {employee?.email ? (
                          <div className="truncate text-[11px] text-muted-foreground">{employee.email}</div>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                  {emptyText}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {showSelectedChips && selectedEmployees.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selectedEmployees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => toggleSelection(String(employee.id))}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] text-primary"
            >
              <span className="truncate">{getEmployeeDisplayName(employee)}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
