const inflightRequests = new Map()

export async function runWithRequestLock(key, executor) {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)
  }

  const promise = Promise.resolve()
    .then(() => executor())
    .finally(() => {
      inflightRequests.delete(key)
    })

  inflightRequests.set(key, promise)
  return promise
}
