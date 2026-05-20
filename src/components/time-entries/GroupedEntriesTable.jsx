import { CalendarRange } from 'lucide-react'
import { cn } from '../../lib/utils'

export function GroupedEntriesTable({
  groups = [],
  columns = [],
  getGroupKey = (group) => group.dateKey,
  getGroupLabel,
  getGroupCountLabel,
  getGroupMeta,
  getGroupRows = (group) => group.items || [],
  getRowKey = (row, _group, index) => row?.id ?? `${index}`,
  getRowClassName,
  minWidthClassName = 'min-w-[860px]',
  tableClassName,
  containerClassName,
}) {
  const columnCount = columns.length

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/60 bg-card/70', containerClassName)}>
      <div className="overflow-x-auto">
        <table className={cn('w-full table-fixed', minWidthClassName, tableClassName)}>
          <thead>
            <tr className="border-b border-border/70 text-left text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn('px-3 py-3', column.headerClassName)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) => {
              const groupKey = getGroupKey(group)
              const groupRows = getGroupRows(group)
              const groupMeta = getGroupMeta?.(group)
              const groupCountLabel = getGroupCountLabel?.(group, groupRows.length)

              return [
                <tr key={`${groupKey}-separator`} className="border-b border-border/50">
                  <td
                    colSpan={columnCount}
                    className="bg-background/70 px-3 py-2 text-[12px] font-medium text-muted-foreground"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <span className="capitalize">{getGroupLabel(group)}</span>
                        {groupRows.length > 0 && groupCountLabel ? (
                          <span className="text-[11px] text-muted-foreground/60">
                            · {groupCountLabel}
                          </span>
                        ) : null}
                      </div>
                      {groupMeta ? <div>{groupMeta}</div> : null}
                    </div>
                  </td>
                </tr>,
                ...groupRows.map((row, index) => (
                  <tr
                    key={getRowKey(row, group, index)}
                    className={cn(
                      'border-b border-border/40 text-[13px] transition-colors hover:bg-muted/45 last:border-b-0',
                      getRowClassName?.(row, group, index),
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn('px-3 py-2.5 align-middle', column.cellClassName)}
                      >
                        {column.renderCell(row, group, index)}
                      </td>
                    ))}
                  </tr>
                )),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
