const express = require('express');
const { addCustomer, addBulkCustomers, getUserCustomers } = require('../controllers/customerController');
const authenticateUser = require('../middleware/auth');

const router = express.Router();

router.post('/add', authenticateUser, addCustomer);
router.post('/bulk-add', authenticateUser, addBulkCustomers);
router.get('/my-customers', authenticateUser, getUserCustomers);

module.exports = router;
