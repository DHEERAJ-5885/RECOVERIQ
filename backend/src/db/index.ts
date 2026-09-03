import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('DATABASE_URL is required in production');
  }
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/recoveriq',
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
