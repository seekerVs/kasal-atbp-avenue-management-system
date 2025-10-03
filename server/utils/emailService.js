const nodemailer = require('nodemailer');
const { format } = require('date-fns');
require('dotenv').config();

// 1. Create the Nodemailer Transporter
// This object is configured once and reused for all email sending.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a rental return reminder email to a customer.
 * @param {object} rental - The full rental object from the database.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 * @throws {Error} Throws an error if the email fails to send.
 */
const sendReturnReminder = async (rental) => {
  const customer = rental.customerInfo[0];
  if (!customer || !customer.email) {
    console.warn(`⚠️ Cannot send reminder for rental ${rental._id}: customer email is missing.`);
    return; // Silently fail if there's no email address
  }

  // 2. Format the data for the email template
  const formattedReturnDate = format(new Date(rental.rentalEndDate), 'EEEE, MMMM dd, yyyy');

  // 3. Define the email content
  const mailOptions = {
    from: `"Kasal atbp. Avenue" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: `Friendly Reminder: Your Rental is Due for Return Today!`,
    text: `
      Hi ${customer.name},

      This is a friendly reminder that your rental (ID: ${rental._id}) is due to be returned today, ${formattedReturnDate}.

      Please ensure all items are returned to avoid any late fees.

      Thank you for choosing Kasal atbp. Avenue!
    `,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Friendly Return Reminder</h2>
        <p>Hi ${customer.name},</p>
        <p>This is a friendly reminder that your rental with ID <strong>${rental._id}</strong> is due to be returned today, <strong>${formattedReturnDate}</strong>.</p>
        <p>Please ensure all items are returned to avoid any late fees as per our rental agreement.</p>
        <p>We appreciate your business and hope you had a wonderful event!</p>
        <br>
        <p>Sincerely,</p>
        <p><strong>The Team at Kasal atbp. Avenue</strong></p>
      </div>
    `,
  };

  // 4. Send the email using the transporter
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent successfully to ${customer.email} for rental ${rental._id}.`);
  } catch (error) {
    console.error(`❌ Failed to send reminder email for rental ${rental._id}. Error:`, error);
    // Re-throw the error so the calling function (scheduler or route) knows it failed.
    throw new Error('Failed to send reminder email via SMTP.');
  }
};

module.exports = { sendReturnReminder };