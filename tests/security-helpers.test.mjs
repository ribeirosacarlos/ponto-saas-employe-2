import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAllowedIds, sanitizeScopedId, sanitizeSingleScopedId } from '../src/lib/security/idGuards.js'
import { normalizeApiError } from '../src/lib/security/httpErrors.js'
import { isSensitiveRoute } from '../src/lib/security/frameGuard.js'

test('normalizeApiError maps 429 to friendly message', () => {
  const result = normalizeApiError(
    { response: { status: 429 } },
    { rateLimitMessage: 'Friendly 429 message' },
  )

  assert.equal(result.status, 429)
  assert.equal(result.message, 'Friendly 429 message')
  assert.equal(result.shouldClearSession, false)
})

test('normalizeApiError marks 401 as session-clearing by default', () => {
  const result = normalizeApiError({ response: { status: 401 } })

  assert.equal(result.status, 401)
  assert.equal(result.shouldClearSession, true)
})

test('ID guards drop malformed and out-of-scope ids', () => {
  assert.equal(sanitizeScopedId('../bad'), '')
  assert.deepEqual(filterAllowedIds(['abc-123', '../bad', 'zzz'], ['abc-123']), ['abc-123'])
  assert.equal(sanitizeSingleScopedId('zzz', ['abc-123']), '')
})

test('frame guard marks protected paths as sensitive', () => {
  assert.equal(isSensitiveRoute('/dashboard'), true)
  assert.equal(isSensitiveRoute('/super-admin/companies/123'), true)
  assert.equal(isSensitiveRoute('/'), false)
})
