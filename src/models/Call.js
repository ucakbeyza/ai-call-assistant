const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a call title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  duration: {
    type: Number, 
    default: 0
  },
  participants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    role: {
      type: String,
      enum: ['host', 'participant'],
      default: 'participant'
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  transcriptionText: {
    type: String,
    default: ''
  },
  transcriptionStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  transcriptionRetryCount: {
    type: Number,
    default: 0
  },
  transcriptionError: {
    type: String,
    default: ''
  },
  audioFileUrl: {
    type: String,
    default: ''
  },
  scheduledAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

callSchema.pre('save', function(next) {
  if (this.startedAt && this.endedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  next();
});

callSchema.index({ createdBy: 1, status: 1 });
callSchema.index({ scheduledAt: 1 });
callSchema.index({ transcriptionStatus: 1 });
callSchema.index({ title: 'text', notes: 'text' }); // Text search

module.exports = mongoose.model('Call', callSchema);
