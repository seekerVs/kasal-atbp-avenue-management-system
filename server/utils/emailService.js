const nodemailer = require('nodemailer');
const { format } = require('date-fns');
require('dotenv').config();
const namer = require('color-namer');

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

/**
 * Sends a detailed reservation confirmation email to a customer.
 * @param {object} reservation - The full, saved reservation object from the database.
 * @param {object} shopSettings - The shop settings object for contact info.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 */
const sendReservationConfirmation = async (reservation, shopSettings) => {
  const customer = reservation.customerInfo;
  if (!customer || !customer.email) {
    console.warn(`⚠️ Cannot send confirmation for reservation ${reservation._id}: customer email is missing.`);
    return; // Do not throw an error, just skip sending.
  }

  // --- Helper Functions for Formatting ---
  const formatCurrency = (value) => `₱${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getMotifName = (hex) => {
    if (!hex) return 'N/A';
    try {
      const names = namer(hex);
      return (names.ntc[0]?.name || 'Custom Color').replace(/\b\w/g, char => char.toUpperCase());
    } catch { return 'Custom Color'; }
  };

  const allItems = [
    ...(reservation.itemReservations || []).map(item => `
      <tr>
        <td>${item.itemName}</td>
        <td>${item.variation.color.name}, ${item.variation.size}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `),
    ...(reservation.packageReservations || []).map(pkg => `
      <tr>
        <td>${pkg.packageName}</td>
        <td>Motif: ${getMotifName(pkg.motifHex)}</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">${formatCurrency(pkg.price)}</td>
      </tr>
    `)
  ].join('');

  // --- Email Content ---
  const mailOptions = {
    from: `"Kasal atbp. Avenue" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: `Your Reservation Request has been Received (ID: ${reservation._id})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #AE0C00;">Reservation Request Received!</h2>
        <p>Hi ${customer.name},</p>
        <p>Thank you for your request! We have received it and our staff will review the details shortly. Your unique Reservation ID is <strong>${reservation._id}</strong>.</p>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Summary</h3>
        <p><strong>Reservation Date:</strong> ${format(new Date(reservation.reserveDate), 'MMMM dd, yyyy')}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item/Package</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Details</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>${allItems}</tbody>
        </table>

        <table style="width: 100%; max-width: 300px; margin-left: auto; text-align: right;">
          <tr><td>Subtotal:</td><td>${formatCurrency(reservation.financials.subtotal)}</td></tr>
          <tr><td>Required Deposit:</td><td>${formatCurrency(reservation.financials.requiredDeposit)}</td></tr>
          <tr style="font-weight: bold; border-top: 1px solid #ccc; font-size: 1.1em;"><td>Grand Total:</td><td>${formatCurrency(reservation.financials.grandTotal)}</td></tr>
          <tr><td>Amount Paid:</td><td>${formatCurrency(reservation.financials.totalPaid)}</td></tr>
          <tr style="color: #AE0C00; font-weight: bold;"><td>Balance Due:</td><td>${formatCurrency(reservation.financials.remainingBalance)}</td></tr>
        </table>

        <div style="background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; margin-top: 20px; border-radius: 5px;">
          <h4 style="margin-top: 0;">What's Next?</h4>
          <p>1. Our staff will review your request and verify your payment.</p>
          <p>2. You will receive another notification once your reservation is confirmed.</p>
          <p>3. You can track the status of your request anytime on our website using your Reservation ID.</p>
        </div>

        <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
          If you have any questions, please contact us at ${shopSettings?.shopContactNumber || 'our shop'} or reply to this email.
        </p>
      </div>
    `,
  };

  // --- Send the email ---
  await transporter.sendMail(mailOptions);
  console.log(`✅ Reservation confirmation email sent successfully to ${customer.email} for reservation ${reservation._id}.`);
};

/**
 * Sends a detailed appointment confirmation email to a customer.
 * @param {object} appointment - The full, saved appointment object from the database.
 * @param {object} shopSettings - The shop settings object for contact info.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 */
const sendAppointmentConfirmation = async (appointment, shopSettings) => {
  const customer = appointment.customerInfo;
  if (!customer || !customer.email) {
    console.warn(`⚠️ Cannot send confirmation for appointment ${appointment._id}: customer email is missing.`);
    return;
  }

  // Format the appointment date and time block for display
  const formattedDate = format(new Date(appointment.appointmentDate), 'MMMM dd, yyyy');
  const timeBlock = appointment.timeBlock.charAt(0).toUpperCase() + appointment.timeBlock.slice(1);

  const mailOptions = {
    from: `"Kasal atbp. Avenue" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: `Your Appointment Request has been Received (ID: ${appointment._id})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #AE0C00;">Appointment Request Received!</h2>
        <p>Hi ${customer.name},</p>
        <p>Thank you for your interest in our Custom Tailoring service. We have received your appointment request. Your unique Appointment ID is <strong>${appointment._id}</strong>.</p>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Your Requested Schedule</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time Block:</strong> ${timeBlock}</p>
        ${appointment.notes ? `<p><strong>Your Notes:</strong> <em>"${appointment.notes}"</em></p>` : ''}
        
        <div style="background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; margin-top: 20px; border-radius: 5px;">
          <h4 style="margin-top: 0;">What's Next?</h4>
          <p>1. Our staff will review your request and check our schedule availability.</p>
          <p>2. We will contact you at <strong>${customer.phoneNumber}</strong> to confirm the final time for your consultation.</p>
          <p>3. You can track the status of your request on our website using your Appointment ID.</p>
        </div>

        <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
          If you have any urgent questions, please contact us at ${shopSettings?.shopContactNumber || 'our shop'} or reply to this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Appointment confirmation email sent successfully to ${customer.email} for appointment ${appointment._id}.`);
};

module.exports = { sendReturnReminder, sendReservationConfirmation, sendAppointmentConfirmation };

