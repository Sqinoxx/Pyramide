import { setPyramidLayoutAction } from "@/app/actions";
import type { PyramidLayout } from "@/lib/pyramid-layout";
import { ListIcon, PyramidIcon } from "./icons";

const OPTIONS = [
  { value: "liste", label: "Listenansicht", Icon: ListIcon },
  { value: "pyramide", label: "Pyramidenansicht", Icon: PyramidIcon },
] as const;

/**
 * Phone-only switch between the stacked row list and the real triangle.
 * From md up the triangle always fits, so the switch is hidden there.
 */
export function PyramidLayoutToggle({
  layout,
  bewerb,
}: {
  layout: PyramidLayout;
  bewerb: "herren" | "damen";
}) {
  return (
    <form action={setPyramidLayoutAction} className="segmented md:hidden" aria-label="Ansicht">
      <input type="hidden" name="bewerb" value={bewerb} />
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="submit"
          name="layout"
          value={value}
          aria-label={label}
          aria-pressed={layout === value}
          title={label}
          className="segmented-item min-w-0 px-3"
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </form>
  );
}
