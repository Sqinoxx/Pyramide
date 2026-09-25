import Link from "next/link";
import { getActiveSeason, getAllDivisions, getPyramidView } from "@/server/seasons";
import { countMembersByStatus } from "@/server/members";
import { countOpenChallenges, listChallengesNeedingAdminAttention } from "@/server/challenges";
import { listAuditLog } from "@/server/audit";
import { divisionSettingsSchema } from "@/lib/settings";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { ACTION_LABEL } from "@/lib/audit-labels";
import { PageHeader } from "@/components/ui";

function Stat({
  label,
  value,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card card-body flex flex-col gap-1 transition-colors hover:border-brand-300 ${
        highlight ? "border-amber-300 dark:border-amber-800" : ""
      }`}
    >
      <span className="text-2xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
        {value}
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const [divisions, byStatus, attention, recentAudit] = await Promise.all([
    getAllDivisions(),
    countMembersByStatus(),
    listChallengesNeedingAdminAttention(),
    listAuditLog(5),
  ]);

  const perDivision = await Promise.all(
    divisions.map(async (division) => {
      const season = await getActiveSeason(division.id);
      const view = season ? await getPyramidView(division.id) : null;
      return {
        division,
        season,
        players: view?.rows.length ?? 0,
        openChallenges: season ? await countOpenChallenges(season.id) : 0,
        settings: season ? divisionSettingsSchema.parse(season.settings ?? {}) : null,
      };
    }),
  );

  const pending = byStatus.pending ?? 0;

  return (
    <div className="page max-w-4xl">
      <PageHeader eyebrow="Admin" title="Übersicht" lead="Was gerade ansteht, auf einen Blick." />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Wartende Anmeldungen" value={pending} href="/admin/mitglieder" highlight={pending > 0} />
        <Stat
          label="Streitfälle"
          value={attention.length}
          href="/admin/forderungen"
          highlight={attention.length > 0}
        />
        <Stat label="Aktive Mitglieder" value={byStatus.active ?? 0} href="/admin/spieler?status=active" />
        <Stat
          label="Offene Forderungen"
          value={perDivision.reduce((sum, d) => sum + d.openChallenges, 0)}
          href="/admin/saison"
        />
      </div>

      <h2 className="section-title mb-3">Bewerbe</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {perDivision.map(({ division, season, players, openChallenges, settings }) => (
          <div key={division.id} className="card card-body flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{division.name}</p>
              {season ? (
                settings?.challengesPaused ? (
                  <span className="badge badge-warning">Pausiert</span>
                ) : (
                  <span className="badge badge-brand">Läuft</span>
                )
              ) : (
                <span className="badge badge-neutral">Keine Saison</span>
              )}
            </div>
            {season ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {season.name} · {players} Spieler:innen · {openChallenges} offene Forderung(en)
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Noch keine aktive Saison.{" "}
                <Link href="/admin/saison" className="link">
                  Jetzt starten
                </Link>
              </p>
            )}
            {settings && (
              <p className="hint">
                Reichweite {settings.challengeRowRange} Reihen · Annahme {settings.acceptDeadlineDays} T ·
                Austragung {settings.playDeadlineDays} T ·{" "}
                {settings.inactivityEnabled
                  ? `Inaktiv nach ${settings.inactivityWeeks} Wo.`
                  : "Inaktivitätsregel aus"}
              </p>
            )}
            <Link href="/admin/einstellungen" className="link self-start text-sm">
              Regeln anpassen
            </Link>
          </div>
        ))}
      </div>

      <h2 className="section-title mb-3">Bereiche</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card card-body flex flex-col gap-1 transition-colors hover:border-brand-300"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{s.label}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{s.description}</span>
          </Link>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">Letzte Admin-Aktionen</h2>
        <Link href="/admin/audit" className="link text-sm">
          Alle anzeigen
        </Link>
      </div>
      {recentAudit.length === 0 ? (
        <p className="hint">Noch keine Einträge.</p>
      ) : (
        <ul className="card divide-y divide-line text-sm">
          {recentAudit.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
              <span>{ACTION_LABEL[e.action] ?? e.action}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {e.actor?.email ?? "—"} · {new Date(e.at).toLocaleString("de-AT")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
