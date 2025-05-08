const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  GroupName: { type: String, required: true },
  Description: { type: String },
  Tags: [{ type: String }],
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }  // Created by
}, { timestamps: true });

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
