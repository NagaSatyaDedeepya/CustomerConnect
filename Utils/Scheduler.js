const cron = require('node-cron');
const Campaign = require('../Model/Campagin');
const Message = require('../Model/Message');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const sendEmail = require('../Utils/SendEmail');

// Run every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();

  const campaigns = await Campaign.find({
    status: 'pending',
    scheduledAt: { $lte: now }
  });

  for (const campaign of campaigns) {
    const message = await Message.findOne({ campaignId: campaign._id });
    let customers = [];

    if (campaign.audienceType === 'all') {
      customers = await Customer.find({ createdBy: campaign.userId });
    } else if (campaign.audienceType === 'group') {
      const group = await Group.findById(campaign.groupId).populate('customers');
      customers = group ? group.customers : [];
    } else if (campaign.audienceType === 'import') {
      customers = campaign.importedCustomers;
    }

    for (const cust of customers) {
      if (!cust.email) continue;
      try {
        await sendEmail(cust.email, campaign.campaignName, message.content, message.attachmentUrl);
      } catch (err) {
        console.error(`Email failed for ${cust.email}:`, err.message);
      }
    }

    // Update campaign to completed
    await Campaign.findByIdAndUpdate(campaign._id, { status: 'completed' });
    console.log(`✅ Campaign "${campaign.campaignName}" completed`);
  }
});
