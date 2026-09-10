import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Records an admin action for the trail PLAN.md §9/§12 calls for. Kept
 * deliberately fire-and-forget-cheap (single insert, no transaction
 * coupling) — a missed audit row should never be the reason a legitimate
 * admin action fails.
 */
export async function recordAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  before?: unknown,
  after?: unknown,
) {
  await db.insert(auditLog).values({
    actorId,
    action,
    entity,
    entityId,
    before: before === undefined ? null : before,
    after: after === undefined ? null : after,
  });
}

export async function listAuditLog(limit = 100) {
  return db.query.auditLog.findMany({
    orderBy: [desc(auditLog.at)],
    limit,
    with: { actor: true },
  });
}

export async function listAuditLogForEntity(entity: string, entityId: string) {
  return db.query.auditLog.findMany({
    where: and(eq(auditLog.entity, entity), eq(auditLog.entityId, entityId)),
    orderBy: [desc(auditLog.at)],
    with: { actor: true },
  });
}
