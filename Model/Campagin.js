const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignName: {
    type: String,
    required: true,
    trim: true
  },
  campaignType: {
    type: String,
    enum: ['email', 'sms', 'push', 'whatsapp'], // Added 'whatsapp'
    default: 'email'
  },
  templateName: {
    type: String,
    default: null
  },
  audienceType: {
    type: String,
    enum: ['all', 'group', 'import'],
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  importedCustomers: {
    type: Array,
    default: []
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  results: {
    totalProcessed: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    }
  },
  error: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
module.exports = mongoose.model('Campaign', campaignSchema);