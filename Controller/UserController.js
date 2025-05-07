const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../models/User');

const router = express.Router();
require('dotenv').config(); // Ensure .env is loaded

// Multer config using .env upload directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads/logos');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// POST /api/users/register
const customerRegister=async(req,res)=>{
  try {
    const {
      fullName, phoneNumber, email, password, confirmPassword,
      businessName, website, address, city, state, zipcode
    } = req.body;

    // Check required fields
    if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Full Name, Phone Number, Email, Password, and Confirm Password are required' });
    }

    // Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const user = new User({
      fullName,
      phoneNumber,
      email,
      password: hashedPassword,
      businessName: businessName || null,
      website: website || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zipcode: zipcode || null,
      logoImageUrl: req.file ? req.file.path : null,
    });

    const savedUser = await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: savedUser._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const customerLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and Password are required' });
      }
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Generate JWT token (the 'userId' is embedded inside the token)
      const token = jwt.sign(
        { userId: user._id },  // Payload (user ID)
        process.env.JWT_SECRET, // Secret key from .env
        { expiresIn: '1h' }    // Token expiration time
      );
  
      res.status(200).json({
        message: 'Login successful',
        token: token,  // Send the JWT token back to the user
        userId: user._id
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  };
// Update Details
const updateCustomerDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      fullName, phoneNumber, businessName, website,
      address, city, state, zipcode
    } = req.body;

    const updates = {
      ...(fullName && { fullName }),
      ...(phoneNumber && { phoneNumber }),
      ...(businessName && { businessName }),
      ...(website && { website }),
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(zipcode && { zipcode }),
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User details updated', user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user details' });
  }
};
const getAllUsers = async (req, res) => {
    try {
      const users = await User.find().select('-password'); // exclude password
      res.status(200).json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  };
  
  // Get user by email
  const getUserByEmail = async (req, res) => {
    try {
      const { email } = req.params;
      const user = await User.findOne({ email }).select('-password');
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch user by email' });
    }
  };
module.exports = { customerRegister, customerLogin, updateCustomerDetails,getAllUsers,getUserByEmail };


