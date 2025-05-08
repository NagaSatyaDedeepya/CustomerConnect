const mongoose = require('mongoose');

const whatsappProviderSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  apiKey: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  apiSecretKey: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const WhatsAppProvider = mongoose.model('WhatsAppProvider', whatsappProviderSchema);
module.exports = WhatsAppProvider;
