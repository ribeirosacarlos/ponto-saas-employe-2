const DISPOSITION_FILENAME_REGEX = /filename\\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i

function extractFilename(disposition?: string) {
  if (!disposition) return ''
  const match = disposition.match(DISPOSITION_FILENAME_REGEX)
  if (!match) return ''
  const encoded = match[1] || match[2]
  try {
    return decodeURIComponent(encoded)
  } catch (error) {
    return encoded
  }
}

type DownloadOptions = {
  blob?: Blob
  response?: { data?: any; headers?: Record<string, string> }
  fallbackFilename?: string
  mimeType?: string
}

export function downloadBlob({
  blob,
  response,
  fallbackFilename = 'download.pdf',
  mimeType = 'application/pdf',
}: DownloadOptions) {
  const dataBlob =
    blob instanceof Blob
      ? blob
      : response?.data instanceof Blob
        ? response.data
        : response?.data
          ? new Blob([response.data], { type: mimeType })
          : new Blob([], { type: mimeType })

  const disposition =
    response?.headers?.['content-disposition'] ||
    response?.headers?.['Content-Disposition'] ||
    ''

  const filename = extractFilename(disposition) || fallbackFilename
  const url = window.URL.createObjectURL(dataBlob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.target = '_self'
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 1000)
}
