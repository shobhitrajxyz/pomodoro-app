import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: false,
    index: true,
  },
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

sessionSchema.index({ deviceId: 1, completedAt: -1 })

export default mongoose.model('Session', sessionSchema)