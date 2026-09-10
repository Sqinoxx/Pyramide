import { adminSwapPositionsAction } from "./actions";

export function PositionSwapForm({
  seasonId,
  members,
}: {
  seasonId: string;
  members: { memberId: string; firstName: string; lastName: string; row: number; slot: number }[];
}) {
  return (
    <form action={adminSwapPositionsAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="seasonId" value={seasonId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">Mitglied A</label>
        <select
          name="memberAId"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {members.map((m) => (
            <option key={m.memberId} value={m.memberId}>
              {m.row}.{m.slot} — {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">Mitglied B</label>
        <select
          name="memberBId"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {members.map((m) => (
            <option key={m.memberId} value={m.memberId}>
              {m.row}.{m.slot} — {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        Positionen tauschen
      </button>
    </form>
  );
}
