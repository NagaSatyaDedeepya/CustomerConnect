const cron = require('node-cron');
const Campaign = require('../Model/Campagin'); // Fixed typo in import
const Message = require('../Model/Message');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const sendEmail = require('./SendEmail');

// Cron runs every minute to check for due campaigns
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    console.log(`⏰ Scheduler checking for due campaigns at: ${now.toISOString()}`);
    
    // Find all pending campaigns where scheduledAt is in the past or present
    const campaigns = await Campaign.find({
      status: 'pending',
      scheduledAt: { $lte: now }
    });
    
    console.log(`⏰ Scheduler: Found ${campaigns.length} due campaigns`);
    
    // Debug log each campaign found
    if (campaigns.length > 0) {
      campaigns.forEach(campaign => {
        console.log(`Found due campaign: "${campaign.campaignName}" scheduled for ${campaign.scheduledAt}`);
      });
    }
    
    for (const campaign of campaigns) {
      try {
        console.log(`Processing campaign: ${campaign._id} (${campaign.campaignName})`);
        await Campaign.findByIdAndUpdate(campaign._id, { status: 'processing' });
        await processCampaign(campaign._id);
      } catch (err) {
        console.error(`❌ Campaign ${campaign._id} error:`, err.message);
        await Campaign.findByIdAndUpdate(campaign._id, {
          status: 'failed',
          error: err.message
        });
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
});

const processCampaign = async (campaignId) => {
  console.log(`🚀 Starting to process campaign: ${campaignId}`);
  
  const campaign = await Campaign.findById(campaignId);
  const message = await Message.findOne({ campaignId });
  
  if (!campaign || !message) {
    throw new Error('Campaign or message not found');
  }
  
  console.log(`Processing campaign: "${campaign.campaignName}" of type ${campaign.audienceType}`);
  
  let customers = [];
  if (campaign.audienceType === 'all') {
    customers = await Customer.find({ createdBy: campaign.userId });
    console.log(`Found ${customers.length} customers for all audience type`);
  } else if (campaign.audienceType === 'group' && campaign.groupId) {
    const group = await Group.findById(campaign.groupId).populate('customers');
    if (group) {
      customers = group.customers;
      console.log(`Found ${customers.length} customers for group "${group.name}"`);
    } else {
      console.log(`Group ${campaign.groupId} not found`);
    }
  } else if (campaign.audienceType === 'import') {
    customers = campaign.importedCustomers;
    console.log(`Using ${customers.length} imported customers`);
  }
  
  let successCount = 0;
  let failureCount = 0;
  const delay = 200; // 200ms delay between emails to avoid rate limiting
  const batchSize = 50; // Process 50 emails at a time
  
  console.log(`Starting to send emails to ${customers.length} customers`);
  
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(customers.length/batchSize)}`);
    
    await Promise.all(batch.map((cust, idx) => new Promise((resolve) => {
      setTimeout(async () => {
        try {
          if (!cust.email) {
            console.log(`Skipping customer with no email`);
            failureCount++;
            return resolve();
          }
          
          console.log(`Sending email to: ${cust.email}`);
          await sendEmail(
            campaign.userId,
            cust.email,
            campaign.campaignName,
            message.content,
            message.attachmentUrl
          );
          successCount++;
          console.log(`✅ Email sent to ${cust.email}`);
        } catch (err) {
          console.error(`❌ Email to ${cust.email} failed: ${err.message}`);
          failureCount++;
        } finally {
          resolve();
        }
      }, idx * delay);
    })));
  }
  
  await Campaign.findByIdAndUpdate(campaignId, {
    status: 'completed',
    results: {
      totalProcessed: customers.length,
      successCount,
      failureCount
    }
  });
  
  console.log(`✅ Campaign "${campaign.campaignName}" completed: Sent ${successCount}, Failed ${failureCount}`);
};

module.exports = {
  processCampaign
};