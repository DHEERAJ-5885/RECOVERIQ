import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (databaseUrl) {
  databaseUrl.searchParams.set('uselibpqcompat', 'true');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl?.toString() || 'postgresql://postgres:postgres@localhost:5432/recoveriq',
  },
  verbose: true,
  strict: false,
});
