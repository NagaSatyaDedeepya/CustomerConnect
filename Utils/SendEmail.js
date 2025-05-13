const nodemailer = require('nodemailer');
const GmailProvider = require('../models/GmailProvider');

/**
 * Sends email using user's saved Gmail provider config from DB
 * @param {ObjectId} userId - User ID (to fetch provider)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body
 * @param {string} attachmentUrl - Optional attachment URL
 */
const sendEmail = async (userId, to, subject, text, attachmentUrl) => {
  const provider = await GmailProvider.findOne({ createdBy: userId });

  if (!provider) {
    throw new Error('No Gmail provider found for this user');
  }

  const transporter = nodemailer.createTransport({
    host: provider.smtpHost,
    port: provider.smtpPort,
    secure: provider.smtpPort === 465, // usually true for 465
    auth: {
      user: provider.emailAddress,
      pass: provider.password,
    },
  });

  const mailOptions = {
    from: provider.emailAddress,
    to,
    subject,
    text,
  };

  if (attachmentUrl) {
    mailOptions.attachments = [
      {
        filename: 'attachment',
        path: attachmentUrl,
      }
    ];
  }

  return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
