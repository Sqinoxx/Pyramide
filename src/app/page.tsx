import Link from "next/link";
import { auth } from "@/auth";
import { getDivisionByKey, getPyramidView } from "@/server/seasons";
import { getMemberByUserId } from "@/server/members";
import { getEligibleDefenders } from "@/server/challenges";
import { listPublishedAnnouncements } from "@/server/announcements";
import { PyramidView } from "@/components/PyramidView";

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          UTC Pyramide
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Tennis-Forderungspyramide
        </h1>
      </div>

      <div className="mb-8 flex justify-center gap-2">
        {(["herren", "damen"] as const).map((key) => (
          <Link
            key={key}
            href={`/?bewerb=${key}`}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (active === key
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700")
            }
          >
            {DIVISION_LABEL[key]}
          </Link>
        ))}
      </div>

      {announcements.length > 0 && (
        <div className="mb-8 flex flex-col gap-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950"
            >
              <p className="font-medium text-amber-900 dark:text-amber-200">{a.title}</p>
              <p className="whitespace-pre-line text-amber-800 dark:text-amber-300">{a.bodyMd}</p>
            </div>
          ))}
        </div>
      )}

      {view ? (
        <PyramidView
          rows={view.rows}
          seasonId={view.season.id}
          viewerMemberId={viewerMemberId}
          eligibleMemberIds={eligibleMemberIds}
        />
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Für {DIVISION_LABEL[active]} wurde noch keine Pyramide gestartet.
        </p>
      )}
    </div>
  );
}
