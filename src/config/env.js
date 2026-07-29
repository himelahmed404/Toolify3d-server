import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET', 'BETTER_AUTH_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parseUrlList = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  betterAuthUrls: parseUrlList(process.env.BETTER_AUTH_URL, 'http://localhost:3000'),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  contactToEmail: process.env.CONTACT_TO_EMAIL,
  contactFromEmail: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER,
  orderToEmail: process.env.ORDER_TO_EMAIL,
  orderFromEmail:
    process.env.ORDER_FROM_EMAIL ||
    process.env.CONTACT_FROM_EMAIL ||
    process.env.SMTP_USER,
};
