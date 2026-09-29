import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import { connectDatabase } from './config/db.js'
import errorHandler from './middleware/errorHandler.js'
import sessionRoutes from './routes/sessionRoutes.js'

dotenv.config({ path: resolve(fileURLToPath(new URL('../../.env', import.meta.url))) })

const app = express()
const port = Number(process.env.PORT) || 5001

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      callback(null, true) // Allow requests on Render preview/production deployment
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '10kb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use('/api/sessions', sessionRoutes)

// Serve production static frontend if built in client/dist
const clientDistPath = resolve(fileURLToPath(new URL('../../client/dist', import.meta.url)))
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(resolve(clientDistPath, 'index.html'))
  })
}

app.use(errorHandler)

try {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Session persistence is disabled.')
  } else {
    await connectDatabase(process.env.MONGODB_URI)
  }
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`)
}

app.listen(port, () => {
  console.info(`Pomodoro API listening on http://localhost:${port}`)
})