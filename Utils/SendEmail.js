const nodemailer = require('nodemailer');
const GmailProvider = require('../Model/EmailProvider');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { URL } = require('url');

/**
 * Sends email using user's saved Gmail provider config from DB
 * @param {ObjectId} userId - User ID (to fetch provider)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body
 * @param {string} attachmentUrl - Optional attachment URL
 * @returns {Promise} - Email send result
 */
const sendEmail = async (userId, to, subject, text, attachmentUrl) => {
  let tempFilePath = null;
  
  try {
    // Fetch email provider configuration
    const provider = await GmailProvider.findOne({ createdBy: userId });
    if (!provider) {
      throw new Error('No Gmail provider found for this user');
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: provider.smtpHost,
      port: provider.smtpPort,
      secure: provider.smtpPort === 465, // usually true for 465
      auth: {
        user: provider.emailAddress,
        pass: provider.password,
      },
    });

    // Setup basic mail options
    const mailOptions = {
      from: provider.emailAddress,
      to,
      subject,
      text,
    };

    // Handle attachment if provided
    if (attachmentUrl) {
      try {
        // For URLs, download the file to a temporary location first
        if (attachmentUrl.startsWith('http://') || attachmentUrl.startsWith('https://')) {
          console.log(`Downloading attachment from: ${attachmentUrl}`);
          
          // Create a HEAD request first to verify the URL is accessible
          const headResponse = await axios.head(attachmentUrl);
          if (headResponse.status !== 200) {
            throw new Error(`Attachment URL returned status ${headResponse.status}`);
          }
          
          // Get filename from URL, removing query parameters
          let fileName = 'attachment.jpg';
          
          try {
            // Parse the URL and get the pathname
            const urlObj = new URL(attachmentUrl);
            const pathName = urlObj.pathname;
            
            // Extract just the filename without query parameters
            const baseFileName = path.basename(pathName);
            if (baseFileName && baseFileName !== '') {
              fileName = baseFileName;
            }
          } catch (e) {
            console.log(`Error parsing URL, using default filename: ${e.message}`);
          }
          
          console.log(`Using filename: ${fileName}`);
          
          // Download the file
          const response = await axios.get(attachmentUrl, { responseType: 'arraybuffer' });
          
          // Create a temporary file path with a clean filename
          tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);
          
          console.log(`Saving attachment to: ${tempFilePath}`);
          
          // Write the file to disk
          fs.writeFileSync(tempFilePath, response.data);
          
          // Add the attachment to mail options
          mailOptions.attachments = [
            {
              filename: fileName,
              path: tempFilePath,
            }
          ];
        } else {
          // For local file paths, check if file exists
          if (!fs.existsSync(attachmentUrl)) {
            throw new Error(`Attachment file not found: ${attachmentUrl}`);
          }
          
          // Add the attachment to mail options
          mailOptions.attachments = [
            {
              filename: path.basename(attachmentUrl),
              path: attachmentUrl,
            }
          ];
        }
      } catch (attachmentError) {
        console.error(`Attachment processing error: ${attachmentError.message}`);
        throw new Error(`Failed to process attachment: ${attachmentError.message}`);
      }
    }
    
    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    // Clean up temporary file if one was created
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Deleted temporary file: ${tempFilePath}`);
      } catch (unlinkError) {
        console.error(`Error deleting temporary file: ${unlinkError.message}`);
      }
    }
    
    return result;
  } catch (error) {
    // Make sure to clean up temporary file even on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Deleted temporary file after error: ${tempFilePath}`);
      } catch (unlinkError) {
        console.error(`Error deleting temporary file: ${unlinkError.message}`);
      }
    }
    
    console.error(`Email sending error: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;