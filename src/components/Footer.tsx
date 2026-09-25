import Link from "next/link";
import { BallLogo } from "./icons";

const LINKS = [
  { href: "/ergebnisse", label: "Ergebnisse" },
  { href: "/regeln", label: "Regeln" },
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:justify-between sm:px-6 dark:text-zinc-400">
        <p className="flex items-center gap-2">
          <BallLogo className="h-4 w-4" />
          Tennis-Forderungspyramide · UTC Neukirchen
        </p>
        <nav className="flex flex-wrap justify-center gap-x-1 gap-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-1.5 hover:bg-surface-muted hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
