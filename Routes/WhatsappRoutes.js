const express = require('express');
const router = express.Router();
const {
  createWhatsAppProvider,
  sendWhatsAppToCustomers,
  sendWhatsAppToGroup,sendWhatsAppToCustomersFromExcel
} = require('../Controller/WhatsappProviderController');
const excelUpload = require('../Middleware/excelupload'); // new middleware
const verifyAuth = require('../Security/Middleware'); // Auth middleware

// 🔐 Routes - Protected by verifyAuth middleware
router.post('/provider/create', verifyAuth, createWhatsAppProvider);

// Send message to all customers of a user
router.post('/send/all', verifyAuth, sendWhatsAppToCustomers);

// Send message to all customers in a specific group
router.post('/send/group', verifyAuth, sendWhatsAppToGroup);

router.post('/send-whatsapp-from-excel', verifyAuth, excelUpload.single('file'), sendWhatsAppToCustomersFromExcel);
module.exports = router;





