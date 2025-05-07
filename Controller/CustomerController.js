const express = require('express');
const path = require('path');
const Customer = require('../Model/Customer');
const { toNamespacedPath } = require('path/win32');
const router = express.Router();
require('dotenv').config(); // Ensure .env is loaded
const multer = require('multer');
const xlsx = require('xlsx');
const storage = multer.memoryStorage();
const upload = multer({ storage });


// Add single customer
const addCustomer = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, address } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Customer full name is required' });
    }
   console.log(fullName,phoneNumber,email,address)
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
const addBulkCustomers = [
  upload.single('file'), // form-data key: "file"
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Excel file is required' });
      }

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Excel file is empty or malformed' });
      }

      const validCustomers = [];
      const skippedRows = [];

      rows.forEach((row, index) => {
        const fullName = row.fullName || row['Full Name'];
        const phoneNumber = row.phoneNumber || row['Phone Number'];
        const email = row.email || row['Email'];
        const address = row.address || row['Address'];

        if (!fullName) {
          skippedRows.push({ row: index + 2, reason: 'Missing fullName' });
          return;
        }

        validCustomers.push({
          fullName,
          phoneNumber,
          email,
          address,
          createdBy: req.userId
        });
      });

      if (validCustomers.length === 0) {
        return res.status(400).json({ error: 'No valid customers found', skipped: skippedRows });
      }

      const saved = await Customer.insertMany(validCustomers);
      res.status(201).json({
        message: 'Customers uploaded',
        inserted: saved.length,
        skipped: skippedRows
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Bulk upload failed' });
    }
  }
];

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
