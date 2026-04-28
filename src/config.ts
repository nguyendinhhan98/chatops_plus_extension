import dotenv from 'dotenv';

dotenv.config();

export const config = {
  chatopsUrl: (process.env.CHATOPS_URL || '').replace(/\/$/, ''),
  token: process.env.CHATOPS_TOKEN,
  cookie: process.env.CHATOPS_COOKIE,
  csrf: process.env.CHATOPS_CSRF,
  username: process.env.CHATOPS_USERNAME,
  password: process.env.CHATOPS_PASSWORD,
  teamName: process.env.CHATOPS_TEAM_NAME || 'dn',
};
