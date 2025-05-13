const express = require('express');
const router = express.Router();
const campaignController = require('../Controller/CampaignController');
const authMiddleware = require('../Security/Middleware'); // to get req.user

router.post('/campaigns', authMiddleware, campaignController.createCampaign);
router.get('/customers', authMiddleware, campaignController.getAllCustomers);
router.get('/groups', authMiddleware, campaignController.getAllGroups);
router.get('/groups/:groupId/customers', authMiddleware, campaignController.getCustomersByGroup);

module.exports = router;
