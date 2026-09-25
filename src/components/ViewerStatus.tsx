import Link from "next/link";
import type { ChallengeBlockReason } from "@/server/challenges";
import type { Position } from "@/lib/pyramid";
import { rankOf } from "@/lib/pyramid";
import { createChallengeAction } from "@/app/forderungen/actions";
import type { MatchQuotaStatus } from "@/lib/match-quota";
import { HourglassIcon } from "./icons";

const DIVISION_LABEL: Record<string, string> = {
  herren: "Herren",
  damen: "Damen",
};

export type EligibleDefender = {
  memberId: string;
  firstName: string;
  lastName: string;
  row: number;
  slot: number;
};

/**
 * "Wer bin ich / wen darf ich fordern" panel on the home page for a logged-in
 * member. Only rendered when the viewer plays in the division being shown;
 * otherwise `otherDivisionKey` points them to their own pyramid.
 */
export function ViewerStatus({
  firstName,
  lastName,
  divisionKey,
  otherDivisionKey,
  seasonId,
  position,
  blockedBy,
  onLeaveUntil,
  eligible,
  quota,
}: {
  firstName: string;
  lastName: string;
  divisionKey: string | null;
  otherDivisionKey?: string;
  seasonId?: string;
  position?: Position | null;
  blockedBy?: ChallengeBlockReason | null;
  onLeaveUntil?: Date | null;
  eligible?: EligibleDefender[];
  quota?: MatchQuotaStatus;
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <section className="card card-body">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white dark:bg-brand-500 dark:text-brand-950"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-brand-700 uppercase dark:text-brand-400">
            Angemeldet als
          </p>
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
            {firstName} {lastName}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {divisionKey ? (DIVISION_LABEL[divisionKey] ?? divisionKey) : "Kein Bewerb"}
            {position && <> · Platz {rankOf(position)}</>}
          </p>
        </div>
      </div>

      {quota && (
        <div className={`alert mt-4 flex gap-2 ${quota.state === "overdue" ? "alert-error" : "alert-warning"}`}>
          <HourglassIcon className="h-5 w-5 shrink-0" />
          <p>
            {quota.state === "overdue" ? (
              <>
                Du hast bis {quota.deadline.toLocaleDateString("de-AT")} nur {quota.played} von{" "}
                {quota.required} Pflichtspielen bestritten. Ein Admin kann dich aus der Pyramide
                entfernen.
              </>
            ) : (
              <>
                Dir fehlen noch {quota.required - quota.played} Spiel(e) bis{" "}
                {quota.deadline.toLocaleDateString("de-AT")} ({quota.played}/{quota.required}).
                Sonst kannst du aus der Pyramide entfernt werden.
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        {otherDivisionKey ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Du spielst bei den {DIVISION_LABEL[otherDivisionKey] ?? otherDivisionKey}.{" "}
            <Link href={`/?bewerb=${otherDivisionKey}`} className="link">
              Zu deiner Pyramide
            </Link>
          </p>
        ) : !divisionKey ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Du bist noch keinem Bewerb zugeordnet.
          </p>
        ) : blockedBy ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <BlockedMessage reason={blockedBy} onLeaveUntil={onLeaveUntil ?? null} />
          </p>
        ) : eligible && eligible.length > 0 && seasonId ? (
          <>
            <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Du darfst aktuell fordern ({eligible.length}):
            </p>
            <ul className="flex flex-wrap gap-2">
              {eligible
                .slice()
                .sort((a, b) => rankOf(a) - rankOf(b))
                .map((e) => (
                  <li
                    key={e.memberId}
                    className="flex items-center gap-2 rounded-full border border-brand-200 bg-surface py-1 pl-3 pr-1 text-sm dark:border-brand-900"
                  >
                    <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
                      {rankOf(e)}
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {e.firstName} {e.lastName}
                    </span>
                    <form action={createChallengeAction}>
                      <input type="hidden" name="seasonId" value={seasonId} />
                      <input type="hidden" name="defenderId" value={e.memberId} />
                      <button type="submit" className="btn btn-primary btn-sm rounded-full px-2.5">
                        Fordern
                      </button>
                    </form>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Aktuell kannst du niemanden fordern – alle Personen in Reichweite sind
            gerade gebunden, im Urlaub oder in der Sperrfrist.
          </p>
        )}
      </div>
    </section>
  );
}

function BlockedMessage({
  reason,
  onLeaveUntil,
}: {
  reason: ChallengeBlockReason;
  onLeaveUntil: Date | null;
}) {
  switch (reason) {
    case "not_placed":
      return <>Du bist in der aktuellen Pyramide noch nicht platziert.</>;
    case "inactive":
      return <>Dein Konto ist noch nicht aktiv – daher kannst du noch niemanden fordern.</>;
    case "paused":
      return <>Forderungen sind derzeit pausiert (z. B. Winterpause).</>;
    case "on_leave":
      return (
        <>
          Du bist im Urlaubsmodus
          {onLeaveUntil && <> bis {onLeaveUntil.toLocaleDateString("de-AT")}</>} und kannst
          aktuell nicht fordern.
        </>
      );
    case "open_challenge":
      return (
        <>
          Du hast bereits eine offene Forderung.{" "}
          <Link href="/forderungen" className="link">
            Zu deinen Forderungen
          </Link>
        </>
      );
  }
}
