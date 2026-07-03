const mongoose = require('mongoose');

const initModels = () => {
  require('../modules/user/user.model');
  require('../modules/settings/settings.model');
  require('../modules/category/category.model');
  require('../modules/contacts/contacts.model');
  require('../modules/email/email.model');
  require('../modules/reply/reply.model');
  require('../modules/ai/aiHistory.model');
  require('../modules/spam/spam.model');
  require('../modules/notification/notification.model');
  
  const logger = require('../shared/utils/logger');
  logger.info('All Mongoose models initialized successfully.');
};

module.exports = { initModels };
