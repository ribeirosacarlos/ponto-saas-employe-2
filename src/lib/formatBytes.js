export function formatBytes(bytes) {
  const value = Number(bytes)
  if (!value || Number.isNaN(value) || value <= 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const formatted = size >= 10 || size % 1 === 0 ? size.toFixed(0) : size.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}
