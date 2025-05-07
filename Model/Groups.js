// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Owner of the group (user)
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],  // List of customers in the group
}, { timestamps: true });

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
