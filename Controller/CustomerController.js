const express = require('express');
const path = require('path');const Customer = require('../models/Customer');
const router = express.Router();
require('dotenv').config(); // Ensure .env is loaded
// Add single customer
const addCustomer = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, address } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Customer full name is required' });
    }

    const customer = new Customer({
      fullName,
      phoneNumber,
      email,
      address,
      createdBy: req.userId, // set in middleware
    });

    const saved = await customer.save();
    res.status(201).json({ message: 'Customer added', customer: saved });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add customer' });
  }
};

// Add bulk customers
const addBulkCustomers = async (req, res) => {
  try {
    const customers = req.body.customers;

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'Invalid customer list' });
    }

    const prepared = customers.map(c => ({
      ...c,
      createdBy: req.userId
    }));

    const saved = await Customer.insertMany(prepared);
    res.status(201).json({ message: 'Bulk customers added', customers: saved });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add bulk customers' });
  }
};

// Get all customers added by the logged-in user
const getUserCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ createdBy: req.userId });
    res.status(200).json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

module.exports = {
  addCustomer,
  addBulkCustomers,
  getUserCustomers
};
