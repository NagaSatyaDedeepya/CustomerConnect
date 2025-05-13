const Campaign = require('../Model/Campagin');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const Message = require('../Model/Message');

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const {
      campaignName, campaignType, audienceType,
      groupId, importedCustomers, scheduledAt, content, attachmentUrl
    } = req.body;

    const userId = req.user._id;  // assuming user is authenticated

    // Create campaign
    const campaign = new Campaign({
      userId,
      campaignName,
      campaignType,
      audienceType,
      groupId: audienceType === 'group' ? groupId : null,
      importedCustomers: audienceType === 'import' ? importedCustomers : [],
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? 'pending' : 'completed',
    });
    await campaign.save();

    // Create message
    const message = new Message({
      campaignId: campaign._id,
      content,
      attachmentUrl
    });
    await message.save();

    res.status(201).json({ campaign, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

// Fetch all customers for the logged-in user
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ createdBy: req.user._id });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// Fetch all groups for the logged-in user
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find({ userId: req.user._id });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// Fetch customers in a group
exports.getCustomersByGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('customers');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    res.json(group.customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group customers' });
  }
};
const sendEmail = require('../Utils/SendEmail');

exports.sendCampaignNow = async (req, res) => {
  try {
    const userId = req.userId;
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId).lean();
    const message = await Message.findOne({ campaignId }).lean();

    if (!campaign || !message) {
      return res.status(404).json({ error: 'Campaign or message not found' });
    }

    let customers = [];
    if (campaign.audienceType === 'all') {
      customers = await Customer.find({ createdBy: userId });
    }

    for (const customer of customers) {
      if (!customer.email) continue;
      try {
        await sendEmail(userId, customer.email, campaign.campaignName, message.content, message.attachmentUrl);
      } catch (err) {
        console.error(`Failed to send email to ${customer.email}:`, err.message);
      }
    }

    await Campaign.findByIdAndUpdate(campaignId, { status: 'completed' });

    res.json({ message: 'Emails sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
};
