const cron = require('node-cron');
const Campaign = require('../Model/Campagin');
const Message = require('../Model/Message');
const Customer = require('../Model/Customer');
const Group = require('../Model/Groups');
const sendEmail = require('../Utils/SendEmail');

// Process scheduled campaigns every minute
cron.schedule('* * * * *', async () => {
  try {
    console.log('Checking for scheduled campaigns...');
    const now = new Date();
  
    const nowISOString = now.toISOString(); // Use this for UTC comparison
    console.log(`Current UTC time: ${nowISOString}`);

    const campaigns = await Campaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: nowISOString }
    });

    console.log(`Found ${campaigns.length} campaigns to process  ${nowISOString}`);
   
    
    for (const campaign of campaigns) {
      try {
        // Update campaign status to processing
        await Campaign.findByIdAndUpdate(campaign._id, { status: 'processing' });
        console.log(`Processing campaign: ${campaign.campaignName} (ID: ${campaign._id})`);
        
        await processCampaign(campaign._id);
        console.log(`Campaign scheduledAt: ${campaign.scheduledAt.toISOString()}, Current time: ${nowISOString}`);

      } catch (err) {
        console.error(`Error processing campaign ${campaign._id}:`, err.message);
        // Update campaign to failed status
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

// Process a campaign and send emails to all recipients
const processCampaign = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    const message = await Message.findOne({ campaignId });
    
    if (!campaign || !message) {
      throw new Error('Campaign or message not found');
    }

    let customers = [];
    let successCount = 0;
    let failureCount = 0;

    // Get customers based on audience type
    if (campaign.audienceType === 'all') {
      customers = await Customer.find({ createdBy: campaign.userId });
    } else if (campaign.audienceType === 'group' && campaign.groupId) {
      const group = await Group.findById(campaign.groupId).populate('customers');
      if (group) customers = group.customers;
    } else if (campaign.audienceType === 'import') {
      customers = campaign.importedCustomers;
    }

    console.log(`Campaign ${campaignId} - Sending to ${customers.length} customers`);

    // Process each customer with rate limiting
    const batchSize = 50; // Process in batches of 50
    const delayBetweenEmails = 200; // 200ms between emails (5 per second)
    
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      // Process batch with some concurrency control
      const emailPromises = batch.map((customer, index) => {
        return new Promise(resolve => {
          // Delay each email slightly to avoid overwhelming the SMTP server
          setTimeout(async () => {
            try {
              if (!customer.email) {
                failureCount++;
                resolve({ success: false, email: 'missing-email', error: 'No email address provided' });
                return;
              }
              
              await sendEmail(
                campaign.userId,
                customer.email,
                campaign.campaignName,
                message.content,
                message.attachmentUrl
              );
              
              successCount++;
              resolve({ success: true, email: customer.email });
            } catch (err) {
              console.error(`Failed to send email to ${customer.email}:`, err.message);
              failureCount++;
              resolve({ success: false, email: customer.email, error: err.message });
            }
          }, index * delayBetweenEmails);
        });
      });
      
      await Promise.all(emailPromises);
    }

    // Update campaign with completion status and results
    await Campaign.findByIdAndUpdate(campaignId, { 
      status: 'completed',
      results: {
        totalProcessed: customers.length,
        successCount,
        failureCount
      }
    });
    
    console.log(`✅ Campaign "${campaign.campaignName}" completed. Success: ${successCount}, Failed: ${failureCount}`);
    return { success: true, totalSent: successCount, totalFailed: failureCount };
  } catch (error) {
    console.error(`Campaign processing error: ${error.message}`);
    // Update campaign status to failed
    await Campaign.findByIdAndUpdate(campaignId, { status: 'failed', error: error.message });
    throw error;
  }
};

module.exports = {
  processCampaign // Export the function so it can be used in the campaign controller
};