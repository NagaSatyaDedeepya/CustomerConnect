const Campaign = require('../Model/Campagin'); // Fixed typo in import
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const Message = require('../Model/Message');
const sendEmail = require('../Utils/SendEmail');
const { processCampaign } = require('../Utils/Scheduler');
const XLSX = require('xlsx');
const fs = require('fs');

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const {
      campaignName, campaignType, audienceType,
      groupId, importedCustomers, scheduledAt,
      content, attachmentUrl
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
          email: row.email
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
      console.log(`Scheduling: Time provided (${scheduledDateTime}) > now (${now}) = ${isScheduled}`);
    }

    // 🧾 Create campaign
    const campaign = new Campaign({
      userId,
      campaignName,
      campaignType,
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
      console.log(`Campaign scheduled for: ${scheduledDateTime}`);
      return res.status(201).json({ 
        campaign, 
        message, 
        status: 'scheduled', 
        scheduledAt: scheduledDateTime,
        message: 'Campaign scheduled successfully.'
      });
    }

    // 📨 Process immediately
    console.log('Processing campaign immediately');
    processCampaign(campaign._id)
      .catch(err => console.error(`Immediate campaign error: ${err.message}`));

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


// Rest of the code remains the same...
// More extensive debug logging for the scheduler

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

    processCampaign(campaignId)
      .catch(err => console.error(`Manual trigger error: ${err.message}`));

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