const winston = require('winston');
const env = require('./env');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports = [
  // Error logs
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  // All logs
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// If we're not in production, also log to the console with custom color formatting
if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} ${level}: ${stack || message}`;
        })
      ),
    })
  );
}

module.exports = {
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports,
};
