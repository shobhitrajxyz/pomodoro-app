export const MODES = {
  focus: { label: 'Focus', seconds: 25 * 60, color: 'focus' },
  shortBreak: { label: 'Short break', seconds: 5 * 60, color: 'short-break' },
  longBreak: { label: 'Long break', seconds: 15 * 60, color: 'long-break' },
}

export const DEFAULT_DURATIONS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
}

export function isValidDurations(durations) {
  return Boolean(durations)
    && Object.keys(DEFAULT_DURATIONS).every((mode) => (
      Number.isInteger(durations[mode]) && durations[mode] >= 1 && durations[mode] <= 120
    ))
}

export function normalizeDurations(durations) {
  const normalized = Object.fromEntries(
    Object.entries(DEFAULT_DURATIONS).map(([mode, defaultValue]) => [mode, durations?.[mode] ?? defaultValue]),
  )

  return isValidDurations(normalized) ? normalized : { ...DEFAULT_DURATIONS }
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function getNextMode(mode, completedFocusSessions) {
  if (mode !== 'focus') return 'focus'
  return completedFocusSessions % 4 === 0 ? 'longBreak' : 'shortBreak'
}