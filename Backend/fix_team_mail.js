require('dotenv').config();
const mongoose = require('mongoose');

const fixHistoricalData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const Email = require('./src/modules/email/email.model.js');

    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com', 'protonmail.com'];

    // Find all emails
    const emails = await Email.find({});
    let updatedCount = 0;

    for (const email of emails) {
      if (!email.senderEmail) continue;
      const senderDomain = email.senderEmail.split('@')[1]?.toLowerCase();
      
      const isSenderCompanyDomain = senderDomain && !publicDomains.includes(senderDomain);

      // If it is a company domain but currently marked as low priority / inbox, upgrade it!
      if (isSenderCompanyDomain) {
         if (email.aiCategory !== 'Company' && (email.globalPriorityRank > 2 || email.aiPriority === 'Low')) {
             email.aiCategory = 'Team';
             email.aiPriority = 'Medium';
             email.globalPriorityRank = 2;
             if (email.aiReason) {
                 email.aiReason += " (Upgraded to Medium because sender is a team/company member)";
             } else {
                 email.aiReason = "Sender is a team/company member.";
             }
             await email.save();
             updatedCount++;
         }
      }
    }

    console.log(`Updated ${updatedCount} historical company emails to Medium Priority!`);
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

fixHistoricalData();
