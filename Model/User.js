const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  businessName: {
    type: String,
    required: true,
  },
  website: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  city: String,
  state: String,
  zipcode: String,
  logoImageUrl: {
    type: String, 
  },
}, {
  timestamps: true, 
});


module.exports = mongoose.model('User', userSchema);
