import autoTable from 'jspdf-autotable'
import { jsPDF } from 'jspdf'

// Importing TFunction at runtime breaks the Vite bundle because it is a type-only export.
type TFunction = (key: string, options?: Record<string, any>) => string

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
  formatDateLabel: (value?: string) => string
  t: TFunction
}

const addPaginationFooter = (doc: jsPDF, t: TFunction) => {
  const pageCount = doc.getNumberOfPages()
  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    doc.setPage(pageIndex)
    doc.setFontSize(9)
    doc.text(
      t('closeTimesheetPage.export.pageCounter', { current: pageIndex, total: pageCount }),
      doc.internal.pageSize.getWidth() - 18,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' },
    )
  }
}

export function generateSimpleTimesheetPdf({
  days,
  employeeLabel,
  periodLabel,
  locale,
  companyLabel,
  shiftLabel,
  formatClock,
  formatDateLabel,
  t,
}: GeneratePdfOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(t('closeTimesheetPage.export.title'), 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let infoY = 24
  if (companyLabel) {
    doc.text(`${t('closeTimesheetPage.export.company')}: ${companyLabel}`, 14, infoY)
    infoY += 6
  }
  if (shiftLabel) {
    doc.text(`${t('closeTimesheetPage.export.shift')}: ${shiftLabel}`, 14, infoY)
    infoY += 6
  }
  doc.text(`${t('closeTimesheetPage.export.employee')}: ${employeeLabel}`, 14, infoY)
  infoY += 6
  doc.text(`${t('closeTimesheetPage.export.period')}: ${periodLabel}`, 14, infoY)
  infoY += 6
  doc.text(`${t('closeTimesheetPage.export.issuedAt')}: ${new Date().toLocaleString(locale)}`, 14, infoY)

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
    const sorted = [...day.items].sort((a, b) => {
      const left = a.clockedAt ? new Date(a.clockedAt).getTime() : 0
      const right = b.clockedAt ? new Date(b.clockedAt).getTime() : 0
      return left - right
    })

    const slots = sorted.slice(0, 4).map((entry) => formatClock(entry.clockedAt))
    while (slots.length < 4) slots.push(t('closeTimesheetPage.export.emptySlot'))

    return [formatDateLabel(day.dateKey), ...slots]
  })

  autoTable(doc, {
    startY: infoY + 8,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: '#e5e7eb',
      textColor: '#0f172a',
    },
    alternateRowStyles: {
      fillColor: '#f8fafc',
    },
    margin: { left: 12, right: 12 },
  })

  addPaginationFooter(doc, t)

  return doc.output('blob')
}
