import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DURATIONS, formatTime, getNextMode, isValidDurations, normalizeDurations } from './timer.js'

test('formats timer values as minutes and seconds', () => {
  assert.equal(formatTime(1500), '25:00')
  assert.equal(formatTime(65), '01:05')
  assert.equal(formatTime(0), '00:00')
})

test('returns a long break after every fourth focus session', () => {
  assert.equal(getNextMode('focus', 1), 'shortBreak')
  assert.equal(getNextMode('focus', 3), 'shortBreak')
  assert.equal(getNextMode('focus', 4), 'longBreak')
  assert.equal(getNextMode('shortBreak', 4), 'focus')
  assert.equal(getNextMode('longBreak', 4), 'focus')
})

test('validates editable timer durations from 1 through 120 minutes', () => {
  assert.equal(isValidDurations(DEFAULT_DURATIONS), true)
  assert.equal(isValidDurations({ ...DEFAULT_DURATIONS, focus: 120 }), true)
  assert.equal(isValidDurations({ ...DEFAULT_DURATIONS, shortBreak: 0 }), false)
  assert.equal(isValidDurations({ ...DEFAULT_DURATIONS, longBreak: 1.5 }), false)
})

test('fills missing duration preferences with defaults and rejects invalid settings', () => {
  assert.deepEqual(normalizeDurations({ focus: 30 }), {
    focus: 30,
    shortBreak: 5,
    longBreak: 15,
  })
  assert.deepEqual(normalizeDurations({ focus: 0 }), DEFAULT_DURATIONS)
})