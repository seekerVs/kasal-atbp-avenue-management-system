// server/config/logger.js

const winston = require('winston');
// --- (1) IMPORT the MongoDB transport ---
require('winston-mongodb');
require('dotenv').config();

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // --- (2) Keep the Console transport for development and Vercel's real-time logs ---
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),

    // --- (3) ADD the new MongoDB transport ---
    new winston.transports.MongoDB({
      level: 'info', // Log 'info' level and above (info, warn, error) to the database
      db: process.env.MONGO_URI,
      options: {
        useUnifiedTopology: true
      },
      collection: 'logs', // The name of the collection in your database
      capped: true, // Use the capped collection we defined in the model
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // Store logs as JSON objects in the DB
      )
    })
  ],
  // Optional: Do not exit on handled exceptions
  exitOnError: false,
});

module.exports = logger;