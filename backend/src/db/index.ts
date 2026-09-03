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

const sanitizedConnectionString = (() => {
  if (!connectionString) return undefined;
  const parsed = new URL(connectionString);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('uselibpqcompat');
  return parsed.toString();
})();

const pool = new Pool({
  connectionString: sanitizedConnectionString || 'postgresql://postgres:postgres@localhost:5432/recoveriq',
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
