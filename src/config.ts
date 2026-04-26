import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  chatopsUrl: z.string().url(),
  token: z.string().optional(),
  cookie: z.string().optional(),
  csrf: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  teamName: z.string().optional(),
});

const env = {
  chatopsUrl: process.env.CHATOPS_URL?.replace(/\/$/, ''),
  token: process.env.CHATOPS_TOKEN,
  cookie: process.env.CHATOPS_COOKIE,
  csrf: process.env.CHATOPS_CSRF,
  username: process.env.CHATOPS_USERNAME,
  password: process.env.CHATOPS_PASSWORD,
  teamName: process.env.CHATOPS_TEAM_NAME,
};

const parsed = configSchema.safeParse(env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error('   Required: CHATOPS_URL, CHATOPS_TEAM_NAME');
  console.error('   Auth: CHATOPS_COOKIE + CHATOPS_CSRF (recommended)');
  parsed.error.errors.forEach((err) => {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

export const config = parsed.data;
