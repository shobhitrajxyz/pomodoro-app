import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSessionPayload } from '../src/validation/session.js'

function createValidSession() {
  const now = Date.now()
  return {
    type: 'focus',
    duration: 25,
    startedAt: new Date(now - 25 * 60 * 1000).toISOString(),
    completedAt: new Date(now).toISOString(),
  }
}

test('accepts a completed focus session', () => {
  assert.deepEqual(validateSessionPayload(createValidSession()), [])
})

test('rejects invalid types, durations, and timestamps', () => {
  const errors = validateSessionPayload({
    ...createValidSession(),
    type: 'break',
    duration: 0,
    startedAt: 'yesterday',
    completedAt: new Date(Date.now() - 3600000).toISOString(),
  })

  assert.equal(errors.length, 3)
})

test('rejects a completion timestamp earlier than the start', () => {
  const now = Date.now()
  const errors = validateSessionPayload({
    ...createValidSession(),
    startedAt: new Date(now).toISOString(),
    completedAt: new Date(now - 3600000).toISOString(),
  })

  assert.ok(errors.includes('completedAt must be on or after startedAt'))
})

test('rejects fractional and overlong durations', () => {
  assert.ok(validateSessionPayload({ ...createValidSession(), duration: 2.5 }).length > 0)
  assert.ok(validateSessionPayload({ ...createValidSession(), duration: 121 }).length > 0)
})

test('rejects completion timestamps in the future', () => {
  const farFuture = new Date(Date.now() + 86400000).toISOString()
  const errors = validateSessionPayload({
    ...createValidSession(),
    completedAt: farFuture,
  })
  assert.ok(errors.includes('completedAt cannot be in the future'))
})

test('validates deviceId string parameter when provided', () => {
  assert.deepEqual(validateSessionPayload({ ...createValidSession(), deviceId: 'dev_test_123' }), [])
  assert.ok(validateSessionPayload({ ...createValidSession(), deviceId: 12345 }).length > 0)
  assert.ok(validateSessionPayload({ ...createValidSession(), deviceId: '   ' }).length > 0)
})