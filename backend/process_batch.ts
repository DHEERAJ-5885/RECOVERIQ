import { db } from './src/db';
import { revenueEvents, recoveryCases } from './src/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { RecoveryWorkflowService } from './src/services/RecoveryWorkflowService';

async function processEvents() {
  console.log('Fetching unprocessed events...');
  
  // Find events that don't have a case yet
  const events = await db.select()
    .from(revenueEvents)
    .leftJoin(recoveryCases, eq(revenueEvents.id, recoveryCases.eventId))
    .where(isNull(recoveryCases.id))
    .limit(50);

  console.log(`Found ${events.length} unprocessed events. Processing...`);

  for (const { revenue_events: event } of events) {
    try {
      await RecoveryWorkflowService.analyzeEvent(event.id);
      console.log(`✅ Processed event ${event.id}`);
    } catch (e: any) {
      console.error(`❌ Failed to process event ${event.id}:`, e.message);
    }
  }

  console.log('Done!');
  process.exit(0);
}

processEvents();
