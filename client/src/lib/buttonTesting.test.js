import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DURATIONS, formatTime, getNextMode, isValidDurations, MODES, normalizeDurations } from './timer.js'
import { playChime, requestNotificationPermission, sendNotification } from './audio.js'

test('Mode selector buttons logic: correctly sets duration and returns properties', () => {
  assert.equal(MODES.focus.label, 'Focus')
  assert.equal(MODES.shortBreak.label, 'Short break')
  assert.equal(MODES.longBreak.label, 'Long break')

  assert.equal(getNextMode('focus', 1), 'shortBreak')
  assert.equal(getNextMode('focus', 3), 'shortBreak')
  assert.equal(getNextMode('focus', 4), 'longBreak')
  assert.equal(getNextMode('shortBreak', 4), 'focus')
  assert.equal(getNextMode('longBreak', 4), 'focus')
})

test('Primary Action button logic: time formatting for Start/Pause/Resume', () => {
  assert.equal(formatTime(25 * 60), '25:00')
  assert.equal(formatTime(5 * 60), '05:00')
  assert.equal(formatTime(15 * 60), '15:00')
  assert.equal(formatTime(0), '00:00')
})

test('Settings Modal button logic: duration validation for Save Durations button', () => {
  assert.equal(isValidDurations({ focus: 25, shortBreak: 5, longBreak: 15 }), true)
  assert.equal(isValidDurations({ focus: 50, shortBreak: 10, longBreak: 20 }), true)
  assert.equal(isValidDurations({ focus: 0, shortBreak: 5, longBreak: 15 }), false)
  assert.equal(isValidDurations({ focus: 121, shortBreak: 5, longBreak: 15 }), false)
  assert.equal(isValidDurations({ focus: 25.5, shortBreak: 5, longBreak: 15 }), false)
})

test('Audio & Notification triggers execute safely without crashing environment', () => {
  assert.doesNotThrow(() => playChime())
  assert.doesNotThrow(() => requestNotificationPermission())
  assert.doesNotThrow(() => sendNotification('Test', 'Body'))
})
