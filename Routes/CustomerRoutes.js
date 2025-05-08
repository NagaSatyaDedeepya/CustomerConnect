const express = require('express');
const { addCustomer, addBulkCustomers, getUserCustomers ,editCustomerById,deleteCustomerById} = require('../Controller/CustomerController');
const authenticateUser = require('../Security/Middleware');

const router = express.Router();

router.post('/add', authenticateUser, addCustomer);
router.post('/bulk-add', authenticateUser, addBulkCustomers);
router.get('/my-customers', authenticateUser, getUserCustomers);
router.put('/edit/:id', editCustomerById);
router.delete('/delete/:id', deleteCustomerById);

module.exports = router;
