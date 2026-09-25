import { adminSwapPositionsAction } from "./actions";

export function PositionSwapForm({
  seasonId,
  members,
}: {
  seasonId: string;
  members: { memberId: string; firstName: string; lastName: string; row: number; slot: number }[];
}) {
  return (
    <form action={adminSwapPositionsAction} className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="seasonId" value={seasonId} />
      <div className="flex flex-col gap-1.5">
        <label className="label">Mitglied A</label>
        <select
          name="memberAId"
          className="input"
        >
          {members.map((m) => (
            <option key={m.memberId} value={m.memberId}>
              {m.row}.{m.slot} — {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label">Mitglied B</label>
        <select
          name="memberBId"
          className="input"
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
        className="btn btn-secondary w-full sm:w-auto"
      >
        Positionen tauschen
      </button>
    </form>
  );
}
