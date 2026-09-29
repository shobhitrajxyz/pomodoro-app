import { useEffect, useRef, useState } from 'react'
import { DEFAULT_DURATIONS, getNextMode, isValidDurations, MODES, normalizeDurations } from '../lib/timer.js'

const durationStorageKey = 'pomodoro.timer-durations'
const activeStateStorageKey = 'pomodoro.active-timer-state'

function loadDurations() {
  try {
    const storedDurations = window.localStorage.getItem(durationStorageKey)
    return normalizeDurations(storedDurations ? JSON.parse(storedDurations) : null)
  } catch {
    return { ...DEFAULT_DURATIONS }
  }
}

function loadActiveState(defaultDurations) {
  try {
    const saved = window.sessionStorage.getItem(activeStateStorageKey)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (!MODES[parsed.mode]) return null

    const now = Date.now()
    if (parsed.isRunning && parsed.endTime) {
      const remaining = Math.max(0, Math.round((parsed.endTime - now) / 1000))
      return {
        mode: parsed.mode,
        timeRemaining: remaining,
        isRunning: remaining > 0,
        endTime: remaining > 0 ? parsed.endTime : null,
        startedAt: parsed.startedAt,
        completedFocusSessions: parsed.completedFocusSessions || 0,
      }
    }

    return {
      mode: parsed.mode,
      timeRemaining: parsed.timeRemaining ?? defaultDurations[parsed.mode] * 60,
      isRunning: false,
      endTime: null,
      startedAt: null,
      completedFocusSessions: parsed.completedFocusSessions || 0,
    }
  } catch {
    return null
  }
}

export function useTimer(onComplete) {
  const [durations, setDurations] = useState(loadDurations)
  const initialActiveState = loadActiveState(durations)

  const [mode, setMode] = useState(() => initialActiveState?.mode ?? 'focus')
  const [timeRemaining, setTimeRemaining] = useState(() => initialActiveState?.timeRemaining ?? (durations.focus * 60))
  const [isRunning, setIsRunning] = useState(() => initialActiveState?.isRunning ?? false)
  const [completedFocusSessions, setCompletedFocusSessions] = useState(() => initialActiveState?.completedFocusSessions ?? 0)
  const [startedAt, setStartedAt] = useState(() => initialActiveState?.startedAt ?? null)

  const onCompleteRef = useRef(onComplete)
  const completedCycleRef = useRef(false)
  const timeRemainingRef = useRef(timeRemaining)
  const endTimeRef = useRef(initialActiveState?.endTime ?? null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    timeRemainingRef.current = timeRemaining
  }, [timeRemaining])

  useEffect(() => {
    try {
      window.localStorage.setItem(durationStorageKey, JSON.stringify(durations))
    } catch {
      return
    }
  }, [durations])

  // Save active timer state to sessionStorage so page refresh never loses timer progress
  useEffect(() => {
    try {
      window.sessionStorage.setItem(activeStateStorageKey, JSON.stringify({
        mode,
        timeRemaining,
        isRunning,
        endTime: endTimeRef.current,
        startedAt,
        completedFocusSessions,
      }))
    } catch {
      return
    }
  }, [mode, timeRemaining, isRunning, startedAt, completedFocusSessions])

  useEffect(() => {
    if (!isRunning) return undefined

    function tick() {
      if (!endTimeRef.current) return
      const now = Date.now()
      const secondsLeft = Math.max(0, Math.round((endTimeRef.current - now) / 1000))
      timeRemainingRef.current = secondsLeft

      if (secondsLeft > 0) {
        setTimeRemaining(secondsLeft)
        return
      }

      if (completedCycleRef.current) return
      completedCycleRef.current = true
      setTimeRemaining(0)
      setIsRunning(false)
      endTimeRef.current = null

      const nextFocusCount = mode === 'focus' ? completedFocusSessions + 1 : completedFocusSessions

      if (mode === 'focus') setCompletedFocusSessions(nextFocusCount)
      onCompleteRef.current({
        mode,
        duration: durations[mode],
        startedAt,
        completedAt: new Date().toISOString(),
      })

      const nextMode = getNextMode(mode, nextFocusCount)
      const transitionTimeout = window.setTimeout(() => {
        setMode(nextMode)
        timeRemainingRef.current = durations[nextMode] * 60
        setTimeRemaining(durations[nextMode] * 60)
        setStartedAt(null)
      }, 1000)

      return () => window.clearTimeout(transitionTimeout)
    }

    tick()
    const intervalId = window.setInterval(tick, 250)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        tick()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [completedFocusSessions, durations, isRunning, mode, startedAt])

  function start() {
    if (isRunning) return
    completedCycleRef.current = false
    const now = Date.now()
    setStartedAt((currentStart) => currentStart ?? new Date(now).toISOString())
    endTimeRef.current = now + timeRemainingRef.current * 1000
    setIsRunning(true)
  }

  function pause() {
    if (isRunning && endTimeRef.current) {
      const secondsLeft = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
      setTimeRemaining(secondsLeft)
      timeRemainingRef.current = secondsLeft
    }
    endTimeRef.current = null
    setIsRunning(false)
  }

  function reset(force = false) {
    if (isRunning && !force) {
      return { requiresConfirmation: true }
    }
    setIsRunning(false)
    endTimeRef.current = null
    setTimeRemaining(durations[mode] * 60)
    timeRemainingRef.current = durations[mode] * 60
    setStartedAt(null)
    completedCycleRef.current = false
    return { success: true }
  }

  function selectMode(nextMode, force = false) {
    if (!MODES[nextMode]) return { success: false }
    if (nextMode === mode) return { success: true, isSameMode: true }

    if (isRunning && !force) {
      return { requiresConfirmation: true, targetMode: nextMode }
    }

    setIsRunning(false)
    endTimeRef.current = null
    setMode(nextMode)
    setTimeRemaining(durations[nextMode] * 60)
    timeRemainingRef.current = durations[nextMode] * 60
    setStartedAt(null)
    completedCycleRef.current = false
    return { success: true }
  }

  function updateDurations(nextDurations) {
    if (!isValidDurations(nextDurations)) return false

    const updatedDurations = { ...nextDurations }
    if (updatedDurations[mode] !== durations[mode]) {
      setIsRunning(false)
      endTimeRef.current = null
      setTimeRemaining(updatedDurations[mode] * 60)
      timeRemainingRef.current = updatedDurations[mode] * 60
      setStartedAt(null)
      completedCycleRef.current = false
    }
    setDurations(updatedDurations)
    return true
  }

  return {
    mode,
    timeRemaining,
    isRunning,
    completedFocusSessions,
    durations,
    progress: 1 - timeRemaining / (durations[mode] * 60),
    start,
    pause,
    reset,
    selectMode,
    updateDurations,
  }
}