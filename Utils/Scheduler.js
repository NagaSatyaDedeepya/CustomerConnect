const cron = require('node-cron');
const Campaign = require('../Model/Campagin'); 
const Message = require('../Model/Message');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const sendEmail = require('./SendEmail');
const sendWhatsApp = require('./Sendwhatsapp'); // Add WhatsApp service

// Cron runs every minute to check for due campaigns
cron.schedule('* * * * *', async () => {
  console.log("Cron job is starting...");
  try {
    const now = new Date();
    console.log(`⏰ Scheduler checking for due campaigns at: ${now.toISOString()}`);
    
    // Find all scheduled campaigns that are due (not pending)
    const campaigns = await Campaign.find({
      status: 'scheduled',
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
  
  // Get customers based on audience type
  if (campaign.audienceType === 'all') {
    customers = await Customer.find({ createdBy: campaign.userId });
    console.log(`Found ${customers.length} customers for all audience type`);
  } else if (campaign.audienceType === 'group' && campaign.groupId) {
    // Get customers by group field
    customers = await Customer.find({ group: campaign.groupId });
    console.log(`Found ${customers.length} customers for group ${campaign.groupId}`);
  } else if (campaign.audienceType === 'import') {
    customers = campaign.importedCustomers;
    console.log(`Using ${customers.length} imported customers`);
  }
  
  let successCount = 0;
  let failureCount = 0;
  const results = [];
  const delay = 200; // 200ms delay between messages to avoid rate limiting
  const batchSize = 50; // Process 50 messages at a time
  
  console.log(`Starting to send messages to ${customers.length} customers`);
  
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(customers.length / batchSize)}`);
    
    await Promise.all(batch.map((cust, idx) => new Promise((resolve) => {
      setTimeout(async () => {
        try {
          // Normalize customer data to handle different field names
          const fullName = cust.fullName || cust.name || 'User';
          const phone = cust.phone || cust.phoneNumber || null;
          const email = cust.email || null;
          const customerId = cust._id || null;
          
          if (campaign.campaignType === 'email') {
            if (!email) {
              console.log(`Skipping customer with no email`);
              failureCount++;
              results.push({
                customerId,
                fullName,
                status: 'failed',
                error: 'Missing email address'
              });
              return resolve();
            }
            
            console.log(`Sending email to: ${email}`);
            await sendEmail(
              campaign.userId,
              email,
              campaign.campaignName,
              message.content,
              message.attachmentUrl
            );
            successCount++;
            results.push({ 
              customerId,
              fullName,
              email, 
              status: 'sent' 
            });
            console.log(`✅ Email sent to ${email}`);
            
          } else if (campaign.campaignType === 'whatsapp') {
            if (!phone) {
              console.log(`Skipping customer with no phone number`);
              failureCount++;
              results.push({
                customerId,
                fullName,
                status: 'failed',
                error: 'Missing phone number'
              });
              return resolve();
            }
            
            console.log(`Sending WhatsApp to: ${phone}`);
            await sendWhatsApp(
              campaign.userId,
              phone,
              fullName,
              campaign.campaignName,
              campaign.templateName,
              message.attachmentUrl
            );
            successCount++;
            results.push({ 
              customerId,
              fullName,
              phone, 
              status: 'sent' 
            });
            console.log(`✅ WhatsApp sent to ${phone}`);
          }
          
        } catch (err) {
          console.error(`❌ Message failed: ${err.message}`);
          failureCount++;
          results.push({
            customerId: cust._id || null,
            fullName: cust.fullName || cust.name || 'Unknown',
            email: cust.email || null, 
            phone: cust.phone || cust.phoneNumber || null,
            status: 'failed',
            error: err.message
          });
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
      failureCount,
      details: results
    }
  });
  
  console.log(`✅ Campaign "${campaign.campaignName}" completed: Sent ${successCount}, Failed ${failureCount}`);
};

module.exports = {
  processCampaign
};