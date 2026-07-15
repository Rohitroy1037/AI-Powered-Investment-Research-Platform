import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});
const isVercel = !!process.env.VERCEL;
export const env = isVercel ? (process.env as any) : schema.parse(process.env);
