import mongoose from 'mongoose'

export async function connectDatabase(uri) {
  if (!uri) return false

  await mongoose.connect(uri, {
    dbName: 'pomodoro',
    serverSelectionTimeoutMS: 5000,
  })
  console.info('Connected to MongoDB')
  return true
}