import autoTable from 'jspdf-autotable'
import { jsPDF } from 'jspdf'

// Importing TFunction at runtime breaks the Vite bundle because it is a type-only export.
type TFunction = (key: string, options?: Record<string, any>) => string

type AutoTableResult = {
  finalY?: number
}

type TimesheetEntry = {
  clockedAt?: string | null
}

type DayGroup = {
  dateKey: string
  items: TimesheetEntry[]
}

type GeneratePdfOptions = {
  days: DayGroup[]
  employeeLabel: string
  companyLabel?: string
  shiftLabel?: string
  periodLabel: string
  locale: string
  formatClock: (value?: string) => string
  t: TFunction
}

const PAGE_MARGIN_X = 8
const PAGE_MARGIN_TOP = 8
const PAGE_MARGIN_BOTTOM = 8
const EMPTY_SLOT = '—'
const BORDER_COLOR: [number, number, number] = [203, 213, 225]
const HEADER_FILL: [number, number, number] = [241, 245, 249]
const ALT_FILL: [number, number, number] = [248, 250, 252]
const TEXT_MUTED: [number, number, number] = [71, 85, 105]
const TEXT_PRIMARY: [number, number, number] = [15, 23, 42]

const addPaginationFooter = (doc: jsPDF, t: TFunction) => {
  const pageCount = doc.getNumberOfPages()
  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    doc.setPage(pageIndex)
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(
      t('closeTimesheetPage.export.pageCounter', { current: pageIndex, total: pageCount }),
      doc.internal.pageSize.getWidth() - PAGE_MARGIN_X,
      doc.internal.pageSize.getHeight() - 4,
      { align: 'right' },
    )
  }
}

const firstNonEmpty = (...values: Array<string | null | undefined>) =>
  values.find((value) => {
    if (value === undefined || value === null) return false
    return String(value).trim().length > 0
  }) || ''

const formatShortDate = (value: string, locale: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .trim()

  const capitalizedWeekday = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : ''
  const dayMonth = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
  }).format(date)

  return capitalizedWeekday ? `${capitalizedWeekday} ${dayMonth}` : dayMonth
}

const formatIssuedAt = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

const normalizeClockValue = (value: string | null | undefined) => firstNonEmpty(value, EMPTY_SLOT)

const extractSlots = (items: TimesheetEntry[] = [], formatClock: (value?: string) => string) => {
  const sorted = [...items].sort((a, b) => {
    const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
    const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
    return left - right
  })

  const slots = sorted.slice(0, 4).map((entry) => normalizeClockValue(formatClock(entry.clockedAt)))
  while (slots.length < 4) slots.push(EMPTY_SLOT)
  return slots
}

const buildCompactSummary = (days: DayGroup[]) => {
  const totalEntries = days.reduce((sum, day) => sum + day.items.length, 0)
  const daysWithRecords = days.filter((day) => day.items.length > 0).length

  return {
    totalEntries,
    daysWithRecords,
  }
}

const drawMetaCell = (
  doc: jsPDF,
  {
    x,
    y,
    width,
    label,
    value,
  }: { x: number; y: number; width: number; label: string; value: string },
) => {
  doc.setDrawColor(...BORDER_COLOR)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, width, 8, 1, 1, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(label.toUpperCase(), x + 2, y + 2.8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_PRIMARY)
  doc.text(firstNonEmpty(value, EMPTY_SLOT), x + 2, y + 6.2, {
    maxWidth: width - 4,
  })
}

export function generateSimpleTimesheetPdf({
  days,
  employeeLabel,
  companyLabel,
  periodLabel,
  locale,
  shiftLabel,
  formatClock,
  t,
}: GeneratePdfOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...TEXT_PRIMARY)
  doc.text(t('closeTimesheetPage.export.title'), PAGE_MARGIN_X, PAGE_MARGIN_TOP)

  const metaItems = [
    { label: t('closeTimesheetPage.export.company'), value: companyLabel || EMPTY_SLOT },
    { label: t('closeTimesheetPage.export.employee'), value: employeeLabel },
    { label: t('closeTimesheetPage.export.period'), value: periodLabel },
    { label: t('closeTimesheetPage.export.issuedAt'), value: formatIssuedAt(locale) },
  ]

  if (shiftLabel) {
    metaItems.splice(2, 0, {
      label: t('closeTimesheetPage.export.shift'),
      value: shiftLabel,
    })
  }

  const columnGap = 3
  const metaColumns = 2
  const metaWidth = (contentWidth - columnGap * (metaColumns - 1)) / metaColumns
  const metaStartY = PAGE_MARGIN_TOP + 4

  metaItems.forEach((item, index) => {
    const row = Math.floor(index / metaColumns)
    const col = index % metaColumns
    drawMetaCell(doc, {
      x: PAGE_MARGIN_X + col * (metaWidth + columnGap),
      y: metaStartY + row * 9.5,
      width: metaWidth,
      label: item.label,
      value: item.value,
    })
  })

  const metaRows = Math.ceil(metaItems.length / metaColumns)
  const tableStartY = metaStartY + metaRows * 9.5 + 3

  const head = [
    [
      t('closeTimesheetPage.export.columns.date'),
      t('closeTimesheetPage.export.columns.start'),
      t('closeTimesheetPage.export.columns.breakStart'),
      t('closeTimesheetPage.export.columns.breakEnd'),
      t('closeTimesheetPage.export.columns.end'),
    ],
  ]

  const body = days.map((day) => {
    const slots = extractSlots(day.items, formatClock)
    return [formatShortDate(day.dateKey, locale), ...slots]
  })

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: 'grid',
    rowPageBreak: 'avoid',
    margin: {
      top: PAGE_MARGIN_TOP,
      left: PAGE_MARGIN_X,
      right: PAGE_MARGIN_X,
      bottom: PAGE_MARGIN_BOTTOM + 10,
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: TEXT_PRIMARY,
      cellPadding: { top: 1.4, right: 1.8, bottom: 1.4, left: 1.8 },
      lineColor: BORDER_COLOR,
      lineWidth: 0.1,
      minCellHeight: 5.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: TEXT_PRIMARY,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 1.6, right: 1.8, bottom: 1.6, left: 1.8 },
    },
    alternateRowStyles: {
      fillColor: ALT_FILL,
    },
    bodyStyles: {
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 41, halign: 'center' },
      2: { cellWidth: 41, halign: 'center' },
      3: { cellWidth: 41, halign: 'center' },
      4: { cellWidth: 41, halign: 'center' },
    },
  })

  const summary = buildCompactSummary(days)
  const tableEndY = ((doc as jsPDF & { lastAutoTable?: AutoTableResult }).lastAutoTable?.finalY || tableStartY) + 3
  const summaryHeight = 10
  let summaryY = tableEndY

  if (summaryY + summaryHeight > pageHeight - PAGE_MARGIN_BOTTOM - 4) {
    doc.addPage()
    summaryY = PAGE_MARGIN_TOP
  }

  doc.setDrawColor(...BORDER_COLOR)
  doc.setFillColor(...HEADER_FILL)
  doc.roundedRect(PAGE_MARGIN_X, summaryY, contentWidth, summaryHeight, 1, 1, 'FD')

  const summaryItems = [
    t('closeTimesheetPage.export.summary.daysWithRecords', { count: summary.daysWithRecords }),
    t('closeTimesheetPage.export.summary.totalEntries', { count: summary.totalEntries }),
    `${periodLabel}`,
  ]

  const summaryText = summaryItems.join('   •   ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_PRIMARY)
  doc.text(summaryText, PAGE_MARGIN_X + 2, summaryY + 6)

  addPaginationFooter(doc, t)

  return doc.output('blob')
}
