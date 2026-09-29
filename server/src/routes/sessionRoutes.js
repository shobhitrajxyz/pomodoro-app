import { Router } from 'express'
import Session from '../models/Session.js'
import { validateSessionPayload } from '../validation/session.js'

const router = Router()

// GET /api/sessions?deviceId=...
router.get('/', async (request, response, next) => {
  try {
    if (Session.db.readyState !== 1) {
      return response.status(503).json({ success: false, message: 'Session history is unavailable until MongoDB connects.' })
    }

    const { deviceId } = request.query
    const filter = deviceId ? { deviceId: String(deviceId) } : {}

    const sessions = await Session.find(filter).sort({ completedAt: -1 }).limit(50).lean()
    return response.json({ success: true, sessions })
  } catch (error) {
    return next(error)
  }
})

// POST /api/sessions
router.post('/', async (request, response, next) => {
  try {
    const { type, duration, startedAt, completedAt, deviceId } = request.body ?? {}
    const errors = validateSessionPayload({ type, duration, startedAt, completedAt, deviceId })

    if (errors.length) {
      return response.status(400).json({ success: false, message: 'Invalid session data.', errors })
    }
    if (Session.db.readyState !== 1) {
      return response.status(503).json({ success: false, message: 'Session history is unavailable until MongoDB connects.' })
    }

    const session = await Session.create({ deviceId, type, duration, startedAt, completedAt })
    return response.status(201).json({
      success: true,
      session: {
        id: session.id,
        deviceId: session.deviceId,
        type: session.type,
        duration: session.duration,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

// DELETE /api/sessions/:id?deviceId=... (Delete single session)
router.delete('/:id', async (request, response, next) => {
  try {
    if (Session.db.readyState !== 1) {
      return response.status(503).json({ success: false, message: 'Session history is unavailable until MongoDB connects.' })
    }

    const { id } = request.params
    const { deviceId } = request.query

    const filter = { _id: id }
    if (deviceId) filter.deviceId = String(deviceId)

    const deleted = await Session.findOneAndDelete(filter)
    if (!deleted) {
      return response.status(404).json({ success: false, message: 'Session not found.' })
    }

    return response.json({ success: true, message: 'Session deleted successfully.', id })
  } catch (error) {
    return next(error)
  }
})

// DELETE /api/sessions?deviceId=... (Clear all sessions for a device)
router.delete('/', async (request, response, next) => {
  try {
    if (Session.db.readyState !== 1) {
      return response.status(503).json({ success: false, message: 'Session history is unavailable until MongoDB connects.' })
    }

    const { deviceId } = request.query
    if (!deviceId) {
      return response.status(400).json({ success: false, message: 'deviceId parameter is required to clear history.' })
    }

    const result = await Session.deleteMany({ deviceId: String(deviceId) })
    return response.json({
      success: true,
      message: `Cleared ${result.deletedCount} session(s).`,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    return next(error)
  }
})

export default router