import { db } from './src/db'; import { merchants } from './src/db/schema'; async function run() { const ms = await db.select().from(merchants).limit(1); console.log(ms); process.exit(0); } run();
