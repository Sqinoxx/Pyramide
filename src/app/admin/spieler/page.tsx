import Link from "next/link";
import { listMembersForAdmin, type AdminMemberFilter } from "@/server/members";
import { EmptyState, PageHeader } from "@/components/ui";
import { adminClearLeaveAction, adminSetLeaveAction } from "./actions";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "wartet auf Freigabe", className: "badge-warning" },
  active: { text: "aktiv", className: "badge-brand" },
  paused: { text: "pausiert", className: "badge-neutral" },
  left: { text: "ausgetreten", className: "badge-neutral" },
};

const ITN_SOURCE: Record<string, string> = { import: "offiziell", admin: "Admin", self: "selbst" };

const STATUSES = ["active", "pending", "paused", "left"] as const;
const DIVISIONS = ["herren", "damen"] as const;

function isOneOf<T extends string>(values: readonly T[], v: string | undefined): v is T {
  return !!v && (values as readonly string[]).includes(v);
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bewerb?: string; status?: string }>;
}) {
  const { q, bewerb, status } = await searchParams;
  const filter: AdminMemberFilter = {
    query: q,
    divisionKey: isOneOf(DIVISIONS, bewerb) ? bewerb : undefined,
    status: isOneOf(STATUSES, status) ? status : undefined,
  };
  const list = await listMembersForAdmin(filter);
  const now = new Date();
  // Date inputs want yyyy-mm-dd; default leave: two weeks from today.
  const defaultLeave = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="page max-w-3xl">
      <PageHeader
        eyebrow="Admin"
        title="Spieler:innen"
        lead="Alle Konten mit Status, Position und ITN. Urlaubsmodus kann hier auch stellvertretend gesetzt werden."
      />

      <form className="card card-body mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="label">
            Suche
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, E-Mail oder Verein"
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bewerb" className="label">
            Bewerb
          </label>
          <select id="bewerb" name="bewerb" defaultValue={filter.divisionKey ?? ""} className="input">
            <option value="">Alle</option>
            <option value="herren">Herren</option>
            <option value="damen">Damen</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={filter.status ?? ""} className="input">
            <option value="">Alle</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s].text}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filtern
        </button>
      </form>

      <p className="hint mb-3">
        {list.length} Treffer
        {(q || filter.divisionKey || filter.status) && (
          <>
            {" · "}
            <Link href="/admin/spieler" className="link">
              Filter zurücksetzen
            </Link>
          </>
        )}
      </p>

      {list.length === 0 ? (
        <EmptyState>Keine Spieler:innen gefunden.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((m) => {
            const status = STATUS_LABEL[m.status];
            const onLeave = m.onLeaveUntil && m.onLeaveUntil > now;
            return (
              <li key={m.id} className="card card-body flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {m.lastName} {m.firstName}
                    </p>
                    <p className="text-sm break-words text-zinc-500 dark:text-zinc-400">
                      {m.user.email}
                      {m.division ? ` · ${m.division.name}` : ""}
                      {m.birthYear ? ` · Jg. ${m.birthYear}` : ""}
                      {m.club ? ` · ${m.club}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`badge ${status.className}`}>{status.text}</span>
                    {m.user.role === "admin" && <span className="badge badge-brand">Admin</span>}
                    {onLeave && (
                      <span className="badge badge-warning">
                        Urlaub bis {m.onLeaveUntil!.toLocaleDateString("de-AT")}
                      </span>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="hint">Position</dt>
                    <dd>{m.position ? `Reihe ${m.position.row}, Platz ${m.position.slot}` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="hint">ITN</dt>
                    <dd>
                      {m.itn ? m.itn.value.toFixed(1) : "—"}
                      {m.itn && <span className="hint"> ({ITN_SOURCE[m.itn.source] ?? m.itn.source})</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="hint">Dabei seit</dt>
                    <dd>{m.joinedAt ? m.joinedAt.toLocaleDateString("de-AT") : "—"}</dd>
                  </div>
                </dl>

                {m.status === "active" &&
                  (onLeave ? (
                    <form action={adminClearLeaveAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button type="submit" className="btn btn-secondary btn-sm">
                        Urlaubsmodus beenden
                      </button>
                    </form>
                  ) : (
                    <form action={adminSetLeaveAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="memberId" value={m.id} />
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`until-${m.id}`} className="hint">
                          Urlaub/Verletzung bis
                        </label>
                        <input
                          id={`until-${m.id}`}
                          type="date"
                          name="until"
                          defaultValue={defaultLeave}
                          required
                          className="input w-44"
                        />
                      </div>
                      <button type="submit" className="btn btn-secondary btn-sm">
                        Urlaubsmodus setzen
                      </button>
                    </form>
                  ))}
                {m.status === "pending" && (
                  <Link href="/admin/mitglieder" className="link text-sm">
                    Zur Freigabe
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
