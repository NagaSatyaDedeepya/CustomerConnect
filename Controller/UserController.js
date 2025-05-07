const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../Model/User');


require('dotenv').config(); // Ensure .env is loaded

// POST /api/users/register
const customerRegister = async (req, res) => {
  console.log("==> Controller: customerRegister hit");
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);

  try {
    const {
      fullName, phoneNumber, email, password, confirmPassword,
      businessName, website, address, city, state, zipcode
    } = req.body;

    if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const logoImageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

    const user = new User({
      fullName, phoneNumber, email, password: hashedPassword,
      businessName: businessName || null,
      website: website || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zipcode: zipcode || null,
      logoImageUrl
    });

    const savedUser = await user.save();
    res.status(201).json({ message: 'User registered', userId: savedUser._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

//User Login
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

//Get all users
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


