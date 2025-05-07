// models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Owner of the customer
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },  // Link to group
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
