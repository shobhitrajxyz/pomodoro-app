import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['focus'],
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 120,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  completedAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true })

export default mongoose.model('Session', sessionSchema)