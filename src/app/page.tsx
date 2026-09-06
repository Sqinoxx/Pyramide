export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        UTC Pyramide
      </p>
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Tennis-Forderungspyramide
      </h1>
      <p className="mt-4 max-w-md text-zinc-600 dark:text-zinc-400">
        Registrierung, Herren- und Damen-Pyramide und Forderungen folgen in den
        nächsten Phasen — siehe{" "}
        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
          PLAN.md
        </code>
        .
      </p>
    </div>
  );
}
