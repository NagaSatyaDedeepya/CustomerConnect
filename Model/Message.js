const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  content: { type: String, required: true },
  attachmentUrl: { type: String },  // Optional
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
