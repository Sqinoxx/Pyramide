import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getDivisionByKey, getPyramidView } from "@/server/seasons";
import { getMemberByUserId } from "@/server/members";
import { getEligibleDefenders } from "@/server/challenges";
import { listPublishedAnnouncements } from "@/server/announcements";
import { PyramidView } from "@/components/PyramidView";
import { DivisionTabs, EmptyState, PageHeader } from "@/components/ui";
import { PyramidLayoutToggle } from "@/components/PyramidLayoutToggle";
import { PYRAMID_LAYOUT_COOKIE, parsePyramidLayout } from "@/lib/pyramid-layout";

const DIVISION_LABEL: Record<"herren" | "damen", string> = {
  herren: "Herren",
  damen: "Damen",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ bewerb?: string }>;
}) {
  const { bewerb } = await searchParams;
  const active: "herren" | "damen" = bewerb === "damen" ? "damen" : "herren";

  const layout = parsePyramidLayout((await cookies()).get(PYRAMID_LAYOUT_COOKIE)?.value);

  const division = await getDivisionByKey(active);
  const view = division ? await getPyramidView(division.id) : null;
  const announcements = division ? await listPublishedAnnouncements(division.id, 3) : [];

  const session = await auth();
  let viewerMemberId: string | undefined;
  let eligibleMemberIds: Set<string> | undefined;
  if (session?.user && view) {
    const member = await getMemberByUserId(session.user.id);
    if (member && member.divisionId === division!.id) {
      viewerMemberId = member.id;
      const eligible = await getEligibleDefenders(view.season.id, member.id);
      eligibleMemberIds = new Set(eligible.map((e) => e.memberId));
    }
  }

  const canChallengeCount = eligibleMemberIds?.size ?? 0;

  return (
    <div className="page max-w-6xl">
      <PageHeader
        center
        eyebrow="UTC Pyramide"
        title="Tennis-Forderungspyramide"
        lead={view ? view.season.name : undefined}
      />

      <div className="mb-6 flex items-center justify-center gap-2 sm:mb-8">
        <DivisionTabs active={active} basePath="/" />
        {view && view.rows.length > 0 && <PyramidLayoutToggle layout={layout} bewerb={active} />}
      </div>

      {announcements.length > 0 && (
        <div className="mx-auto mb-6 flex max-w-2xl flex-col gap-2 sm:mb-8">
          {announcements.map((a) => (
            <div key={a.id} className="alert alert-warning">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-0.5 whitespace-pre-line opacity-90">{a.bodyMd}</p>
            </div>
          ))}
        </div>
      )}

      {viewerMemberId && view && view.rows.length > 0 && (
        <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-600 dark:text-zinc-400">
          {canChallengeCount > 0 ? (
            <>
              Du kannst aktuell{" "}
              <strong className="text-brand-700 dark:text-brand-300">
                {canChallengeCount} {canChallengeCount === 1 ? "Person" : "Personen"}
              </strong>{" "}
              fordern.
            </>
          ) : (
            <>
              Gerade ist keine Forderung möglich —{" "}
              <Link href="/forderungen" className="link">
                offene Forderungen ansehen
              </Link>
              .
            </>
          )}
        </p>
      )}

      {view ? (
        <PyramidView
          layout={layout}
          rows={view.rows}
          seasonId={view.season.id}
          viewerMemberId={viewerMemberId}
          eligibleMemberIds={eligibleMemberIds}
        />
      ) : (
        <EmptyState>Für {DIVISION_LABEL[active]} wurde noch keine Pyramide gestartet.</EmptyState>
      )}

      {!session?.user && (
        <div className="card card-body mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">Mitspielen?</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Melde dich an, fordere andere Vereinsmitglieder heraus und klettere nach oben.{" "}
              <Link href="/regeln" className="link">
                Regeln
              </Link>
            </p>
          </div>
          <Link href="/beitreten" className="btn btn-primary w-full sm:w-auto">
            Jetzt anmelden
          </Link>
        </div>
      )}
    </div>
  );
}
