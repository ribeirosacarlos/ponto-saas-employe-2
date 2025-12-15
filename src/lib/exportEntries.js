import { format } from 'date-fns'

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value).replace(/"/g, '""')
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue}"`
  }
  return stringValue
}

export function exportEntriesToCSV(entries = [], filename = 'historial_marcaciones.csv') {
  const headers = ['date', 'time', 'type', 'status', 'notes', 'source']

  const rows = entries.map((entry) => {
    const clock = entry.clockedAt || entry.clocked_at || entry.date || entry.timestamp
    const dateValue = clock ? format(new Date(clock), 'yyyy-MM-dd') : ''
    const timeValue = clock ? format(new Date(clock), 'HH:mm') : ''

    return {
      date: dateValue,
      time: timeValue,
      type: entry.type || entry.kind || '',
      status: entry.status || entry.state || '',
      notes: entry.notes || entry.observations || entry.reason || '',
      source: entry.source || entry.origin || entry.channel || '',
    }
  })

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
