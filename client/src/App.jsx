import { useEffect, useState } from 'react'
import { Activity, Check, Clock3, Pause, Play, RotateCcw, Settings2, Timer, Volume2, VolumeX, X } from 'lucide-react'
import './App.css'
import { useTimer } from './hooks/useTimer.js'
import { formatTime, isValidDurations, MODES } from './lib/timer.js'
import { playChime, requestNotificationPermission, sendNotification } from './lib/audio.js'
import { createSession, getSessions } from './services/api.js'

const today = new Date().toDateString()
const headerDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
const sessionTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function formatSessionTime(value) {
  return sessionTimeFormatter.format(new Date(value))
}

function App() {
  const [sessions, setSessions] = useState([])
  const [historyState, setHistoryState] = useState('loading')
  const [historyError, setHistoryError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [draftDurations, setDraftDurations] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [confirmModal, setConfirmModal] = useState(null)

  const timer = useTimer(handleComplete)

  useEffect(() => {
    let isMounted = true
    getSessions()
      .then((savedSessions) => {
        if (!isMounted) return
        setSessions(savedSessions)
        setHistoryState('ready')
      })
      .catch((error) => {
        if (!isMounted) return
        setHistoryError(error.message)
        setHistoryState('error')
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (timer.isRunning) {
      const modeLabel = MODES[timer.mode]?.label || 'Timer'
      document.title = `(${formatTime(timer.timeRemaining)}) ${modeLabel} | Pomodoro`
    } else {
      document.title = 'Pomodoro'
    }
  }, [timer.isRunning, timer.timeRemaining, timer.mode])

  useEffect(() => {
    function handleKeyDown(event) {
      const targetTag = event.target?.tagName?.toLowerCase()
      if (isSettingsOpen || confirmModal || targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        if (event.code === 'Escape') {
          setConfirmModal(null)
          setIsSettingsOpen(false)
        }
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        if (timer.isRunning) {
          timer.pause()
        } else {
          timer.start()
        }
      } else if (event.code === 'KeyR') {
        event.preventDefault()
        handleReset()
      } else if (event.code === 'Escape') {
        setConfirmModal(null)
        setIsSettingsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, confirmModal, timer])

  function handleSelectMode(targetMode) {
    const res = timer.selectMode(targetMode)
    if (res?.requiresConfirmation) {
      const currentLabel = MODES[timer.mode]?.label.toLowerCase()
      const targetLabel = MODES[targetMode]?.label.toLowerCase()
      setConfirmModal({
        title: 'Switch timer mode?',
        message: `Abandon current ${currentLabel} session to switch to ${targetLabel}?`,
        actionLabel: 'Switch mode',
        onConfirm: () => {
          timer.selectMode(targetMode, true)
          setConfirmModal(null)
        },
      })
    }
  }

  function handleReset() {
    const res = timer.reset()
    if (res?.requiresConfirmation) {
      const currentLabel = MODES[timer.mode]?.label.toLowerCase()
      setConfirmModal({
        title: 'Reset active session?',
        message: `Abandon active ${currentLabel} session and reset the timer to its full duration?`,
        actionLabel: 'Reset session',
        onConfirm: () => {
          timer.reset(true)
          setConfirmModal(null)
        },
      })
    }
  }

  async function handleComplete(completedSession) {
    if (soundEnabled) playChime()
    const modeLabel = MODES[completedSession.mode]?.label || completedSession.mode
    sendNotification('Timer Finished!', `${modeLabel} timer session completed.`)

    if (completedSession.mode !== 'focus') return
    setSaveError('')

    try {
      const savedSession = await createSession({
        type: 'focus',
        duration: completedSession.duration,
        startedAt: completedSession.startedAt,
        completedAt: completedSession.completedAt,
      })
      setSessions((currentSessions) => [savedSession, ...currentSessions].slice(0, 50))
      setHistoryState('ready')
    } catch (error) {
      setSaveError(error.message)
    }
  }

  const todaySessions = sessions.filter((session) => new Date(session.completedAt).toDateString() === today)
  const activeMode = { ...MODES[timer.mode], seconds: timer.durations[timer.mode] * 60 }
  const sessionNumber = timer.completedFocusSessions + 1

  function openSettings() {
    setDraftDurations({ ...timer.durations })
    setIsSettingsOpen(true)
  }

  function saveSettings(event) {
    event.preventDefault()
    if (timer.updateDurations(draftDurations)) setIsSettingsOpen(false)
  }

  return (
    <div className={`app-shell mode-${activeMode.color}`}>
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Pomodoro home">
          <span className="brand-mark"><Timer size={19} strokeWidth={2.2} /></span>
          <span>pomo<span className="wordmark-light">doro</span></span>
        </a>
        <div className="topbar-date">
          <button
            className="sound-toggle"
            onClick={() => {
              setSoundEnabled((prev) => !prev)
              requestNotificationPermission()
            }}
            type="button"
            aria-label={soundEnabled ? 'Mute audio' : 'Enable audio'}
            title={soundEnabled ? 'Audio enabled (click to mute)' : 'Audio muted (click to enable)'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span className="status-dot" />
          <span>{headerDate}</span>
        </div>
      </header>

      <main className="workspace">
        <section className="timer-section" aria-labelledby="page-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR DAILY RHYTHM</p>
              <h1 id="page-title">Focus, then breathe.</h1>
            </div>
            <div className="heading-tools">
              <span className="session-index">SESSION <strong>{String(sessionNumber).padStart(2, '0')}</strong></span>
              <button className="settings-trigger" onClick={openSettings} type="button" aria-label="Timer settings" title="Timer settings">
                <Settings2 size={18} />
              </button>
            </div>
          </div>

          <div className="mode-selector" role="group" aria-label="Timer mode">
            {Object.entries(MODES).map(([mode, details]) => (
              <button
                className={`mode-option ${timer.mode === mode ? 'is-selected' : ''}`}
                key={mode}
                onClick={() => handleSelectMode(mode)}
                type="button"
                aria-pressed={timer.mode === mode}
              >
                <span className="mode-indicator" />
                {details.label}
              </button>
            ))}
          </div>

          <div className="timer-display" aria-live="off">
            <div className="timer-ring" style={{ '--progress': `${Math.round(timer.progress * 100)}%` }}>
              <div className="timer-ring-inner">
                <span className="timer-mode-label">{activeMode.label}</span>
                <span className="time-value" aria-label={`${Math.floor(timer.timeRemaining / 60)} minutes ${timer.timeRemaining % 60} seconds remaining`}>
                  {formatTime(timer.timeRemaining)}
                </span>
                <span className="timer-caption">{timer.isRunning ? 'IN THE MOMENT' : 'READY WHEN YOU ARE'}</span>
              </div>
            </div>
          </div>

          <div className="timer-actions">
            <button
              className="primary-action"
              onClick={timer.isRunning ? timer.pause : timer.start}
              type="button"
            >
              {timer.isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              <span>{timer.isRunning ? 'Pause' : timer.timeRemaining === activeMode.seconds ? `Start ${activeMode.label.toLowerCase()}` : 'Resume'}</span>
            </button>
            <button className="reset-action" onClick={handleReset} type="button" aria-label="Reset timer" title="Reset timer">
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="timer-footnote">
            <span className="footnote-mark"><Clock3 size={15} /></span>
            <span>{timer.isRunning ? `${activeMode.label} session in progress` : `Next up · ${activeMode.label}`}</span>
            <span className="footnote-rule" />
            <span>{Math.round(activeMode.seconds / 60)} MIN</span>
          </div>

          {saveError && (
            <p className="inline-error" role="status">
              <Activity size={15} /> Session finished, but it could not be saved. {saveError}
            </p>
          )}
        </section>

        <aside className="history-section" aria-labelledby="history-title">
          <div className="history-heading">
            <div>
              <p className="eyebrow">A LITTLE PROGRESS ADDS UP</p>
              <h2 id="history-title">Today</h2>
            </div>
            <span className="daily-total" aria-label={`${todaySessions.length} completed focus sessions today`}>
              <strong>{historyState === 'ready' ? String(todaySessions.length).padStart(2, '0') : '--'}</strong>
              <span>FOCUS</span>
            </span>
          </div>

          <div className="history-list">
            {historyState === 'loading' && <p className="history-message">Loading sessions...</p>}
            {historyState === 'error' && <p className="history-message">{historyError}</p>}
            {historyState === 'ready' && todaySessions.length === 0 && (
              <div className="empty-history">
                <span className="empty-icon"><Check size={18} /></span>
                <p>No focus sessions yet today.</p>
              </div>
            )}
            {historyState === 'ready' && todaySessions.map((session, index) => (
              <div className="session-row" key={session.id || session._id || `${session.completedAt}-${index}`}>
                <span className="session-check"><Check size={14} /></span>
                <span className="session-row-title">Focus session</span>
                <span className="session-row-duration">{session.duration} min</span>
                <time className="session-row-time" dateTime={session.completedAt}>
                  {formatSessionTime(session.completedAt)}
                </time>
              </div>
            ))}
          </div>

          <div className="history-footer">
            <span className="footer-rule" />
            <span><strong>{timer.completedFocusSessions % 4}</strong> of 4 toward a long break</span>
          </div>
        </aside>
      </main>

      {isSettingsOpen && (
        <div
          className="settings-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSettingsOpen(false)
          }}
        >
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="settings-heading">
              <div>
                <p className="eyebrow">YOUR DAILY RHYTHM</p>
                <h2 id="settings-title">Timer lengths</h2>
              </div>
              <button className="dialog-close" onClick={() => setIsSettingsOpen(false)} type="button" aria-label="Close timer settings">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveSettings}>
              <div className="duration-fields">
                {Object.entries(MODES).map(([mode, details]) => (
                  <label className="duration-field" htmlFor={`duration-${mode}`} key={mode}>
                    <span>{details.label}</span>
                    <span className="duration-input-wrap">
                      <input
                        id={`duration-${mode}`}
                        type="number"
                        min="1"
                        max="120"
                        step="1"
                        required
                        value={draftDurations[mode]}
                        onChange={(event) => setDraftDurations((current) => ({
                          ...current,
                          [mode]: event.target.value === '' ? '' : Number(event.target.value),
                        }))}
                      />
                      <span>min</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="settings-actions">
                <button className="settings-cancel" onClick={() => setIsSettingsOpen(false)} type="button">Cancel</button>
                <button className="settings-save" disabled={!isValidDurations(draftDurations)} type="submit">Save durations</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {confirmModal && (
        <div
          className="settings-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmModal(null)
          }}
        >
          <section className="settings-dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <div className="settings-heading">
              <div>
                <p className="eyebrow">ACTIVE SESSION</p>
                <h2 id="confirm-dialog-title">{confirmModal.title}</h2>
              </div>
              <button className="dialog-close" onClick={() => setConfirmModal(null)} type="button" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <p className="confirm-dialog-message">{confirmModal.message}</p>

            <div className="settings-actions">
              <button className="settings-cancel" onClick={() => setConfirmModal(null)} type="button">
                Cancel
              </button>
              <button className="confirm-dialog-proceed" onClick={confirmModal.onConfirm} type="button">
                {confirmModal.actionLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      <footer className="page-footer">
        <span>ONE THING AT A TIME</span>
        <span>made possible by N♥️</span>
      </footer>
    </div>
  )
}

export default App
