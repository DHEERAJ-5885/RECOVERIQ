import { db } from '../db';
import { auditLogs } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  static async log(
    entityType: 'case' | 'event' | 'prediction' | 'action' | 'policy' | 'system',
    entityId: string,
    action: string,
    changes?: any,
    metadata?: any,
    userId?: string
  ) {
    try {
      await db.insert(auditLogs).values({
        id: uuidv4(),
        entityType,
        entityId,
        action,
        userId: userId || null,
        changes: changes || {},
        metadata: metadata || {},
        source: 'WORKFLOW_ENGINE'
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // We don't throw to prevent blocking the main workflow if only audit fails, 
      // but in production we might use a robust messaging queue.
    }
  }
}
