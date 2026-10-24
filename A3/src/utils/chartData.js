// Groups items into months, quarters or years and adds up a value for each period.
// Every period between the first and last item is included (with 0 if empty),
// so the chart's x-axis has no gaps.
export const groupByPeriod = (items, getDate, getValue, granularity) => {
  if (items.length === 0) return { labels: [], values: [] }

  // Turns a date into a single number per period, so periods can be counted through in order
  const periodIndex = (date) => {
    const year = date.getFullYear()
    if (granularity === 'year') return year
    if (granularity === 'quarter') return year * 4 + Math.floor(date.getMonth() / 3)
    return year * 12 + date.getMonth()
  }

  const periodLabel = (index) => {
    if (granularity === 'year') return String(index)
    if (granularity === 'quarter') return `Q${(index % 4) + 1} ${Math.floor(index / 4)}`
    const date = new Date(Math.floor(index / 12), index % 12, 1)
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
  }

  const totals = {}
  items.forEach((item) => {
    const index = periodIndex(getDate(item))
    totals[index] = (totals[index] || 0) + getValue(item)
  })

  const indexes = Object.keys(totals).map(Number)
  const first = Math.min(...indexes)
  const last = Math.max(...indexes)
  const labels = []
  const values = []
  for (let index = first; index <= last; index++) {
    labels.push(periodLabel(index))
    values.push(totals[index] || 0)
  }
  return { labels, values }
}

// [5, 10, 3] -> [5, 15, 18]
export const runningTotal = (values) => {
  let total = 0
  return values.map((value) => (total += value))
}
