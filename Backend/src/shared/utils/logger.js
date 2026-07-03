const winston = require('winston');
const loggerConfig = require('../../config/logger');

const logger = winston.createLogger(loggerConfig);

module.exports = logger;
