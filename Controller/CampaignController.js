const Campaign = require('../Model/Campagin');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const Message = require('../Model/Message');
const sendEmail = require('../Utils/SendEmail');
const sendWhatsApp = require('../Utils/Sendwhatsapp'); // AiSensy implementation
const XLSX = require('xlsx');
const fs = require('fs');

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    let {
      campaignName, campaignType, audienceType,
      groupId, importedCustomers, scheduledAt,
      content, attachmentUrl, templateName
    } = req.body;

    const userId = req.userId;

    // 📁 Step 1: Extract from uploaded Excel if audienceType is 'import'
    let importedCustomersFromFile = [];

    if (audienceType === 'import' && req.file) {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Clean up file after reading
      fs.unlink(req.file.path, err => {
        if (err) console.error("Error deleting uploaded file:", err);
      });

      // Extract valid emails
      importedCustomersFromFile = data
        .filter(row => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
        .map(row => ({
          name: row.name || '',
          email: row.email,
          phone: row.phone || row.mobile || row.whatsapp
        }));
    }

    // ✅ Validate attachment
    if (attachmentUrl) {
      try {
        await validateAttachmentUrl(attachmentUrl);
      } catch (error) {
        return res.status(400).json({ error: `Invalid attachment URL: ${error.message}` });
      }
    }

    // 🕓 Handle scheduling
    let scheduledDateTime = null;
    let isScheduled = false;

    if (scheduledAt) {
      scheduledDateTime = new Date(scheduledAt);
      if (isNaN(scheduledDateTime)) {
        return res.status(400).json({ error: 'Invalid date format for scheduledAt' });
      }
      const now = new Date();
      isScheduled = scheduledDateTime > now;
    }

    // ✅ Validate templateName for WhatsApp
    if (campaignType === 'whatsapp' && !templateName) {
      return res.status(400).json({ error: 'templateName is required for WhatsApp campaigns' });
    }

    if (campaignType !== 'whatsapp') {
      templateName = null; // remove if not WhatsApp
    }

    // 🧾 Create campaign
    const campaign = new Campaign({
      userId,
      campaignName,
      campaignType,
      templateName,
      audienceType,
      groupId: audienceType === 'group' ? groupId : null,
      importedCustomers: audienceType === 'import'
        ? (importedCustomersFromFile.length > 0 ? importedCustomersFromFile : importedCustomers || [])
        : [],
      scheduledAt: isScheduled ? scheduledDateTime : null,
      status: isScheduled ? 'pending' : 'processing'
    });
    await campaign.save();

    const message = new Message({
      campaignId: campaign._id,
      content,
      attachmentUrl
    });
    await message.save();

    if (isScheduled) {
      return res.status(201).json({
        campaign,
        message,
        status: 'scheduled',
        scheduledAt: scheduledDateTime,
        message: 'Campaign scheduled successfully.'
      });
    }

    // 📨 Process campaign immediately
    processCampaign(campaign._id, campaign, message);

    res.status(201).json({
      campaign,
      message,
      status: 'processing',
      message: 'Campaign created and processing started.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

const processCampaign = async (campaignId, campaign, message) => {
  try {
    let recipients = [];

    if (campaign.audienceType === 'group' && campaign.groupId) {
      const group = await Group.findById(campaign.groupId);
      if (!group) throw new Error('Group not found');
      
      // Get the full customer records from the database
      const customers = await Customer.find({ _id: { $in: group.customerIds } });
      
      // Transform customer data to ensure consistent structure with imported contacts
      recipients = customers.map(customer => ({
        _id: customer._id,
        name: customer.name || customer.fullName || '',
        fullName: customer.fullName || customer.name || '',
        email: customer.email || '',
        phone: customer.phone || customer.phoneNumber || '',
        phoneNumber: customer.phoneNumber || customer.phone || ''
      }));
    } else if (campaign.audienceType === 'import') {
      recipients = campaign.importedCustomers || [];
    }

    const results = [];

    for (const cust of recipients) {
      try {
        // Normalize customer data to handle different field names
        const fullName = cust.fullName || cust.name || 'User';
        const phone = cust.phone || cust.phoneNumber || null;
        const email = cust.email || null;
        const customerId = cust._id || null;

        if (campaign.campaignType === 'email') {
          if (!email) {
            results.push({
              customerId,
              fullName,
              status: 'failed',
              error: 'Missing email address'
            });
            continue;
          }

          await sendEmail(
            campaign.userId,
            email,
            campaign.campaignName || 'Campaign',
            message.content,
            message.attachmentUrl
          );

          results.push({ 
            customerId,
            fullName,
            email,
            status: 'sent' 
          });
        }

        else if (campaign.campaignType === 'whatsapp') {
          if (!phone) {
            results.push({
              customerId,
              fullName,
              status: 'failed',
              error: 'Missing phone number'
            });
            continue;
          }

          await sendWhatsApp(
            campaign.userId,
            phone,
            fullName,
            campaign.campaignName || 'Campaign',
            campaign.templateName,
            message.attachmentUrl
          );

          results.push({
            customerId,
            fullName,
            phone,
            status: 'sent'
          });
        }

      } catch (innerErr) {
        console.error(`Error processing recipient: ${innerErr.message}`);
        results.push({
          customerId: cust._id || null,
          fullName: cust.fullName || cust.name || 'Unknown',
          email: cust.email || null,
          phone: cust.phone || cust.phoneNumber || null,
          status: 'failed',
          error: innerErr.message
        });
      }
    }

    campaign.status = 'completed';
    campaign.results = {
      totalProcessed: results.length,
      successCount: results.filter(r => r.status === 'sent').length,
      failureCount: results.filter(r => r.status === 'failed').length,
      details: results
    };
    await campaign.save();
    console.log(`✅ Campaign ${campaignId} completed.`);

  } catch (err) {
    console.error(`❌ Failed to process campaign ${campaignId}: ${err.message}`);
    await Campaign.findByIdAndUpdate(campaignId, { status: 'failed', error: err.message });
  }
};

// Manually trigger sending of a campaign
exports.sendCampaignNow = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (['processing', 'completed'].includes(campaign.status)) {
      return res.status(400).json({ error: `Campaign is already ${campaign.status}` });
    }

    await Campaign.findByIdAndUpdate(campaignId, { status: 'processing' });

    const message = await Message.findOne({ campaignId });
    processCampaign(campaignId, campaign, message);

    res.json({ message: 'Campaign sending started', status: 'processing' });

  } catch (err) {
    res.status(500).json({ error: 'Failed to send campaign' });
  }
};

// Get campaign status
exports.getCampaignStatus = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    res.json({
      campaignId: campaign._id,
      status: campaign.status,
      results: campaign.results || {},
      error: campaign.error || null,
      scheduledAt: campaign.scheduledAt
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to get campaign status' });
  }
};

// Validate attachment
const validateAttachmentUrl = async (url) => {
  const axios = require('axios');

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }

  try {
    const res = await axios.head(url);
    if (res.status !== 200) {
      throw new Error(`URL responded with status ${res.status}`);
    }

    const contentType = res.headers['content-type'];
    if (!contentType.startsWith('image/') &&
        !contentType.includes('application/pdf') &&
        !contentType.includes('application/msword') &&
        !contentType.includes('application/vnd.openxmlformats')) {
      console.warn(`Unusual content-type: ${contentType}`);
    }
  } catch (error) {
    throw new Error(`Failed to validate URL: ${error.message}`);
  }
};