import { Router } from 'express'
import Session from '../models/Session.js'
import { validateSessionPayload } from '../validation/session.js'

const router = Router()

router.get('/', async (_request, response, next) => {
  try {
    if (Session.db.readyState !== 1) {
      return response.status(503).json({ success: false, message: 'Session history is unavailable until MongoDB connects.' })
    }

    const sessions = await Session.find().sort({ completedAt: -1 }).limit(50).lean()
    return response.json({ success: true, sessions })
  } catch (error) {
    return next(error)
  }
})

router.post('/', async (request, response, next) => {
  try {
    const { type, duration, startedAt, completedAt } = request.body ?? {}
    const errors = validateSessionPayload({ type, duration, startedAt, completedAt })

    if (errors.length) {
      return response.status(400).json({ success: false, message: 'Invalid session data.', errors })
    }
    if (Session.db.readyState !== 1) {
      return response.status(503).json({ success: false, message: 'Session history is unavailable until MongoDB connects.' })
    }

    const session = await Session.create({ type, duration, startedAt, completedAt })
    return response.status(201).json({
      success: true,
      session: {
        id: session.id,
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

export default router