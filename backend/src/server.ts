import express from 'express';
import cors from 'cors';
import { db } from './db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';


dotenv.config();

export const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    // Check DB connection
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', message: 'RecoverIQ Backend is running, DB connected.' });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed.' });
  }
});

import recoveryRoutes from './routes/recovery';

import webhookRoutes from './routes/webhooks';

import analyticsRoutes from './routes/analytics';
import casesRoutes from './routes/cases';
import auditRoutes from './routes/audit';

// Need raw body for Razorpay webhook signature verification
app.use('/api/webhooks', express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}), webhookRoutes);

import policiesRoutes from './routes/policies';
import escalationsRoutes from './routes/escalations';


app.use('/api/auth', (req, res) => res.json({ message: 'Auth stub' }));
app.use('/api/revenue-events', (req, res) => res.json({ message: 'Events stub' }));
app.use('/api/policies', policiesRoutes);
app.use('/api/escalations', escalationsRoutes);

app.use('/api/recovery', recoveryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/audit', auditRoutes);
import devRoutes from './routes/dev';
app.use('/api/dev', devRoutes);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}
