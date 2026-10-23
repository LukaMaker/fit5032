// Shared CSV and PDF export used by the Resource Library, Donor Leaderboard and Admin tables.
// Each table passes a list of columns like { header: 'Title', value: (row) => row.title }
// and the rows to export, so the CSV and PDF always contain the same columns.
import { FilterMatchMode } from '@primevue/core/api'

// File name with today's local date, e.g. resources-2026-10-23.csv
export const datedFilename = (name, extension) => {
  const today = new Date()
  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-')
  return `${name}-${date}.${extension}`
}

const escapeCsvValue = (value) => {
  let text = value === null || value === undefined ? '' : String(value)
  // Stops spreadsheet apps running a cell that starts with = + - or @ as a formula (CSV injection)
  if (/^[=+\-@]/.test(text)) {
    text = "'" + text
  }
  // Values with commas, quotes or new lines are wrapped in quotes, with inner quotes doubled
  if (/[",\r\n]/.test(text)) {
    text = '"' + text.replace(/"/g, '""') + '"'
  }
  return text
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const exportToCsv = (filename, columns, rows) => {
  const lines = [columns.map((column) => escapeCsvValue(column.header)).join(',')]
  rows.forEach((row) => {
    lines.push(columns.map((column) => escapeCsvValue(column.value(row))).join(','))
  })
  // ﻿ at the start tells Excel the file is UTF-8, so characters like é display correctly
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

export const exportToPdf = async (filename, title, columns, rows, filterSummary) => {
  // jsPDF is only downloaded when someone exports, which keeps the rest of the site fast to load
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const pdf = new jsPDF({ orientation: 'landscape' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.setFontSize(16)
  pdf.text(title, 14, 16)
  pdf.setFontSize(10)
  pdf.text(`Exported ${new Date().toLocaleString('en-AU')} - ${rows.length} rows`, 14, 23)
  const filterLines = pdf.splitTextToSize(filterSummary, pageWidth - 28)
  pdf.text(filterLines, 14, 29)

  autoTable(pdf, {
    startY: 31 + filterLines.length * 5,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => String(column.value(row) ?? ''))),
    headStyles: { fillColor: [46, 125, 50] },
    styles: { fontSize: 9 }
  })

  // Page numbers are added once the table is drawn, when the total page count is known
  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page)
    pdf.setFontSize(9)
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' })
  }

  pdf.save(filename)
}

// Describes the table's active filters for the PDF, e.g. "Filters: Category is Tree planting; Search: tree"
export const describeFilters = (filters, labels) => {
  const parts = []
  for (const [field, filter] of Object.entries(filters)) {
    if (filter.value === null || filter.value === undefined || filter.value === '') continue
    if (field === 'global') {
      parts.push(`Search all columns: "${filter.value}"`)
    } else if (filter.matchMode === FilterMatchMode.GREATER_THAN_OR_EQUAL_TO) {
      parts.push(`${labels[field]} at least ${filter.value}`)
    } else if (filter.matchMode === FilterMatchMode.EQUALS) {
      parts.push(`${labels[field]} is ${filter.value}`)
    } else {
      parts.push(`${labels[field]} contains "${filter.value}"`)
    }
  }
  return parts.length ? `Filters: ${parts.join('; ')}` : 'Filters: none (all rows)'
}
