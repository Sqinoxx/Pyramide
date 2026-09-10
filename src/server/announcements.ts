import "server-only";
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";

export async function createAnnouncement(
  authorId: string,
  title: string,
  bodyMd: string,
  divisionId: string | null,
) {
  const [row] = await db
    .insert(announcements)
    .values({ title, bodyMd, divisionId, authorId, publishedAt: new Date() })
    .returning();
  return row;
}

/** Published announcements for a division, plus club-wide ones (divisionId null). Omit divisionId for the global-only feed. */
export async function listPublishedAnnouncements(divisionId?: string, limit = 10) {
  return db.query.announcements.findMany({
    where: and(
      isNotNull(announcements.publishedAt),
      divisionId
        ? or(isNull(announcements.divisionId), eq(announcements.divisionId, divisionId))
        : isNull(announcements.divisionId),
    ),
    orderBy: [desc(announcements.publishedAt)],
    limit,
  });
}

export async function listAllAnnouncements() {
  return db.query.announcements.findMany({
    orderBy: [desc(announcements.createdAt)],
    limit: 50,
    with: { division: true },
  });
}

export async function deleteAnnouncement(id: string) {
  await db.delete(announcements).where(eq(announcements.id, id));
}
