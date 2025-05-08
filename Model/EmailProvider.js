// models/GmailProvider.js
const mongoose = require('mongoose');

const gmailProviderSchema = new mongoose.Schema({
  gmailProvider: { type: String, required: true }, 
  emailAddress: { type: String, required: true }, 
  password: { type: String, required: true },     
  smtpHost: { type: String, required: true },      
  smtpPort: { type: Number, required: true },      
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  
}, { timestamps: true });

const GmailProvider = mongoose.model('GmailProvider', gmailProviderSchema);

module.exports = GmailProvider;
