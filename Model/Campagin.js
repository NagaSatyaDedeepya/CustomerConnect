const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignName: { type: String, required: true },
  campaignType: { type: String, enum: ['email', 'whatsapp'], required: true },
  audienceType: { type: String, enum: ['all', 'group', 'import'], required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },  // required if audienceType is 'group'
  importedCustomers: [{  // required if audienceType is 'import'
    fullName: String,
    email: String,
    phoneNumber: String
  }],
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  scheduledAt: { type: Date }, // null if sent immediately
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
