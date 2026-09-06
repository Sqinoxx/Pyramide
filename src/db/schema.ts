import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  smallint,
  boolean,
  timestamp,
  numeric,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const roleEnum = pgEnum("role", ["member", "admin"]);
export const genderEnum = pgEnum("gender", ["m", "w", "d"]);
export const memberStatusEnum = pgEnum("member_status", [
  "pending",
  "active",
  "paused",
  "left",
]);
export const divisionKeyEnum = pgEnum("division_key", ["herren", "damen"]);
export const seasonStatusEnum = pgEnum("season_status", [
  "draft",
  "active",
  "closed",
]);
export const itnSourceEnum = pgEnum("itn_source", ["import", "admin", "self"]);
export const positionReasonEnum = pgEnum("position_reason", [
  "seed",
  "challenge_win",
  "swap_loss",
  "inactivity",
  "admin",
  "insert",
]);
export const challengeStateEnum = pgEnum("challenge_state", [
  "proposed",
  "accepted",
  "declined",
  "reported",
  "disputed",
  "expired_accept",
  "expired_play",
  "cancelled",
  "settled",
]);
export const matchResolutionEnum = pgEnum("match_resolution", [
  "played",
  "walkover_challenger",
  "walkover_defender",
  "cancelled",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "challenge_received",
  "challenge_accepted",
  "challenge_declined",
  "result_reported",
  "result_confirmed",
  "deadline_reminder",
  "walkover",
  "inactivity_warning",
  "position_change",
  "announcement",
  "itn_mismatch",
]);

/* -------------------------------------------------------------------------- */
/*  Auth (Auth.js v5 — credentials + email verification)                      */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Auth sessions use next-auth's JWT strategy (no adapter, nothing to persist
 * here) — see src/auth.ts. Credentials-based sign-in, email verification,
 * and password reset are hand-rolled on top of `users` and
 * `verification_tokens` instead of next-auth's adapter/Email-provider
 * machinery, which is built around OAuth account linking we don't need.
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 320 }).notNull(),
    // SHA-256 hex digest of the token — the raw token is only ever sent in
    // the email link, never stored, so a DB leak can't be used to log in.
    tokenHash: text("token_hash").notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull(), // 'verify-email' | 'reset-password'
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.tokenHash] })],
);

/* -------------------------------------------------------------------------- */
/*  Divisions (Herren / Damen)                                                */
/* -------------------------------------------------------------------------- */

export const divisions = pgTable("divisions", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: divisionKeyEnum("key").notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  settings: jsonb("settings").notNull().default({}),
});

/* -------------------------------------------------------------------------- */
/*  Members                                                                    */
/* -------------------------------------------------------------------------- */

export const members = pgTable(
  "members",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    birthYear: smallint("birth_year"),
    gender: genderEnum("gender").notNull(),
    club: varchar("club", { length: 150 }),
    divisionId: text("division_id").references(() => divisions.id),
    phone: varchar("phone", { length: 40 }),
    avatarUrl: text("avatar_url"),
    status: memberStatusEnum("status").notNull().default("pending"),
    onLeaveUntil: timestamp("on_leave_until", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    preferredTimes: text("preferred_times"),
    notes: text("notes"),
    showItnPublicly: boolean("show_itn_publicly").notNull().default(true),
    normalizedName: text("normalized_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("members_normalized_name_trgm_idx").using(
      "gin",
      sql`${t.normalizedName} gin_trgm_ops`,
    ),
    index("members_division_idx").on(t.divisionId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  ITN — import, records, links, and the append-only member_itn ladder       */
/* -------------------------------------------------------------------------- */

export const itnImports = pgTable("itn_imports", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  source: varchar("source", { length: 32 }).notNull(), // 'pdf' | 'csv' | 'manual'
  fileName: text("file_name"),
  importedBy: text("imported_by").references(() => users.id),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  rowCount: integer("row_count").notNull().default(0),
});

export const itnRecords = pgTable(
  "itn_records",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    importId: text("import_id")
      .notNull()
      .references(() => itnImports.id, { onDelete: "cascade" }),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    birthYear: smallint("birth_year"),
    gender: genderEnum("gender"),
    club: varchar("club", { length: 150 }),
    region: varchar("region", { length: 64 }),
    licenceNo: varchar("licence_no", { length: 32 }),
    itn: numeric("itn", { precision: 3, scale: 1 }).notNull(),
    points: integer("points"),
    normalizedName: text("normalized_name").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("itn_records_normalized_name_trgm_idx").using(
      "gin",
      sql`${t.normalizedName} gin_trgm_ops`,
    ),
  ],
);

export const itnLinks = pgTable(
  "itn_links",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    itnRecordId: text("itn_record_id")
      .notNull()
      .references(() => itnRecords.id, { onDelete: "cascade" }),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    confirmedBy: text("confirmed_by").references(() => users.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.itnRecordId] })],
);

/**
 * "Nicht ich" for a suggested candidate (PLAN.md §5.2) — without this, the
 * same rejected suggestion would keep reappearing every time matching is
 * recomputed, since matching itself is stateless (run fresh from
 * itn_records + members.normalized_name on every view, not cached).
 */
export const itnMatchDismissals = pgTable(
  "itn_match_dismissals",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    itnRecordId: text("itn_record_id")
      .notNull()
      .references(() => itnRecords.id, { onDelete: "cascade" }),
    dismissedBy: text("dismissed_by")
      .notNull()
      .references(() => users.id),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.itnRecordId] })],
);

/**
 * Append-only ladder of ITN values per member. The *active* value for a
 * member is resolved in application code (and mirrored in a view) using the
 * precedence import > admin > self described in PLAN.md 5.4. Rows are never
 * mutated, only superseded, so the provenance of a seeding decision stays
 * auditable.
 */
export const memberItn = pgTable(
  "member_itn",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    source: itnSourceEnum("source").notNull(),
    value: numeric("value", { precision: 3, scale: 1 }).notNull(),
    licenceNo: varchar("licence_no", { length: 32 }),
    asOf: timestamp("as_of", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (t) => [
    // At most one *active* (non-superseded) entry per member+source.
    uniqueIndex("member_itn_active_per_source_idx")
      .on(t.memberId, t.source)
      .where(sql`${t.supersededAt} is null`),
    index("member_itn_member_idx").on(t.memberId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Seasons & positions                                                        */
/* -------------------------------------------------------------------------- */

export const seasons = pgTable("seasons", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  divisionId: text("division_id")
    .notNull()
    .references(() => divisions.id),
  name: varchar("name", { length: 100 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: seasonStatusEnum("status").notNull().default("draft"),
  settings: jsonb("settings").notNull().default({}),
});

export const positions = pgTable(
  "positions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    row: integer("row").notNull(),
    slot: integer("slot").notNull(),
    since: timestamp("since", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("positions_season_row_slot_idx").on(
      t.seasonId,
      t.row,
      t.slot,
    ),
    uniqueIndex("positions_season_member_idx").on(t.seasonId, t.memberId),
  ],
);

export const positionHistory = pgTable(
  "position_history",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    fromRow: integer("from_row"),
    fromSlot: integer("from_slot"),
    toRow: integer("to_row").notNull(),
    toSlot: integer("to_slot").notNull(),
    reason: positionReasonEnum("reason").notNull(),
    challengeId: text("challenge_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("position_history_season_member_idx").on(t.seasonId, t.memberId)],
);

/* -------------------------------------------------------------------------- */
/*  Challenges & matches                                                      */
/* -------------------------------------------------------------------------- */

export const challenges = pgTable(
  "challenges",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    challengerId: text("challenger_id")
      .notNull()
      .references(() => members.id),
    defenderId: text("defender_id")
      .notNull()
      .references(() => members.id),
    state: challengeStateEnum("state").notNull().default("proposed"),
    proposedAt: timestamp("proposed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptDeadline: timestamp("accept_deadline", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    playDeadline: timestamp("play_deadline", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    court: varchar("court", { length: 100 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: matchResolutionEnum("resolution"),
    declineReason: text("decline_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("challenges_challenger_idx").on(t.challengerId),
    index("challenges_defender_idx").on(t.defenderId),
    // Enforced additionally in application logic: at most one open outgoing /
    // incoming challenge per member (partial unique index added in raw SQL
    // migration, see drizzle/000x_partial_indexes.sql, because Drizzle's
    // query builder cannot express OR-of-columns partial predicates cleanly).
  ],
);

export const matches = pgTable("matches", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  challengeId: text("challenge_id")
    .notNull()
    .unique()
    .references(() => challenges.id, { onDelete: "cascade" }),
  playedAt: timestamp("played_at", { withTimezone: true }),
  winnerId: text("winner_id").references(() => members.id),
  retired: boolean("retired").notNull().default(false),
  walkover: boolean("walkover").notNull().default(false),
  reportedBy: text("reported_by").references(() => members.id),
  confirmedBy: text("confirmed_by").references(() => members.id),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matchSets = pgTable(
  "match_sets",
  {
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    setNo: smallint("set_no").notNull(),
    gamesA: smallint("games_a").notNull(),
    gamesB: smallint("games_b").notNull(),
    tiebreakA: smallint("tiebreak_a"),
    tiebreakB: smallint("tiebreak_b"),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.setNo] })],
);

/* -------------------------------------------------------------------------- */
/*  Availability, notifications, announcements, settings, audit               */
/* -------------------------------------------------------------------------- */

export const availability = pgTable(
  "availability",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0=Mon .. 6=Sun
    fromTime: varchar("from_time", { length: 5 }).notNull(), // 'HH:MM'
    toTime: varchar("to_time", { length: 5 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.weekday, t.fromTime] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_member_unread_idx").on(t.memberId, t.readAt)],
);

export const announcements = pgTable("announcements", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  divisionId: text("division_id").references(() => divisions.id),
  title: varchar("title", { length: 200 }).notNull(),
  bodyMd: text("body_md").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorId: text("actor_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 100 }).notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);

/* -------------------------------------------------------------------------- */
/*  Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ one }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
  division: one(divisions, {
    fields: [members.divisionId],
    references: [divisions.id],
  }),
  itnHistory: many(memberItn),
  positions: many(positions),
  challengesMade: many(challenges, { relationName: "challenger" }),
  challengesReceived: many(challenges, { relationName: "defender" }),
}));

export const divisionsRelations = relations(divisions, ({ many }) => ({
  members: many(members),
  seasons: many(seasons),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  division: one(divisions, {
    fields: [seasons.divisionId],
    references: [divisions.id],
  }),
  positions: many(positions),
  challenges: many(challenges),
}));

export const challengesRelations = relations(challenges, ({ one }) => ({
  season: one(seasons, {
    fields: [challenges.seasonId],
    references: [seasons.id],
  }),
  challenger: one(members, {
    fields: [challenges.challengerId],
    references: [members.id],
    relationName: "challenger",
  }),
  defender: one(members, {
    fields: [challenges.defenderId],
    references: [members.id],
    relationName: "defender",
  }),
  match: one(matches, {
    fields: [challenges.id],
    references: [matches.challengeId],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  challenge: one(challenges, {
    fields: [matches.challengeId],
    references: [challenges.id],
  }),
  sets: many(matchSets),
}));

export const itnRecordsRelations = relations(itnRecords, ({ one }) => ({
  import: one(itnImports, {
    fields: [itnRecords.importId],
    references: [itnImports.id],
  }),
}));
