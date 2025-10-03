// server/scheduler.js

const cron = require('node-cron');
const Rental = require('./models/Rental'); // Assuming path is correct
const { sendReturnReminder } = require('./utils/emailService'); // Assuming path is correct

const scheduleReturnReminders = () => {
  // Schedule a task to run every day at 8:00 AM server time.
  // The cron syntax is: 'minute hour day-of-month month day-of-week'
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily return reminder scheduler...');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // End of today

    try {
      // Find rentals that are due today, are 'To Return', and haven't had a reminder sent yet.
      const rentalsDueToday = await Rental.find({
        status: 'To Return',
        rentalEndDate: {
          $gte: today.toISOString().split('T')[0],
          $lte: endOfToday.toISOString().split('T')[0],
        },
        returnReminderSent: false,
      });

      if (rentalsDueToday.length === 0) {
        console.log('✅ No rentals due for reminders today.');
        return;
      }

      console.log(`📧 Found ${rentalsDueToday.length} rental(s) due for a return reminder today.`);

      // Loop through each rental and attempt to send an email.
      for (const rental of rentalsDueToday) {
        try {
          // Attempt to send the email first.
          await sendReturnReminder(rental);
          
          // If the email sends successfully, update the rental document.
          // This prevents retrying a successful send if a later one fails.
          await Rental.updateOne(
            { _id: rental._id },
            { $set: { returnReminderSent: true } }
          );

          console.log(`- Successfully sent reminder and updated status for rental ${rental._id}.`);

        } catch (emailError) {
          // Log the specific error for this rental but continue with the others.
          console.error(`- Failed to process reminder for rental ${rental._id}:`, emailError.message);
        }
      }

      console.log('✅ Scheduler finished processing reminders for the day.');
    } catch (dbError) {
      console.error('❌ An error occurred while fetching rentals for the scheduler:', dbError);
    }
  }, {
    // Optional: Set the timezone for the cron job to run in.
    // This is highly recommended for production to avoid server time ambiguity.
    timezone: "Asia/Manila" // Example: Philippine Standard Time
  });
};

// Export the function so index.js can call it.
module.exports = { scheduleReturnReminders };