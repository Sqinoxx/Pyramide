import Link from "next/link";
import { getDivisionByKey, getPyramidView } from "@/server/seasons";
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

      {view ? (
        <PyramidView rows={view.rows} />
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Für {DIVISION_LABEL[active]} wurde noch keine Pyramide gestartet.
        </p>
      )}
    </div>
  );
}
