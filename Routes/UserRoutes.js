const express = require('express');
const router = express.Router();
const upload = require('../Middleware/uploads');
const {
  customerRegister,
  customerLogin,
  updateCustomerDetails,
  getAllUsers,
  getUserByEmail
} = require('../Controller/UserController');

// Use inline wrapper to catch multer errors
router.post('/register', (req, res, next) => {
  console.log("==> Route: /register");
  upload.single('logoImage')(req, res, function (err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }
    customerRegister(req, res);
  });
});

router.post('/login', customerLogin);
router.put('/update/:userId', updateCustomerDetails);
router.get('/all', getAllUsers);
router.get('/:email', getUserByEmail);

module.exports = router;
