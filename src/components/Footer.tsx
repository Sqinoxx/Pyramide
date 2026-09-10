import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto flex justify-center gap-4 border-t border-zinc-200 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <Link href="/regeln" className="hover:underline">
        Regeln
      </Link>
      <Link href="/impressum" className="hover:underline">
        Impressum
      </Link>
      <Link href="/datenschutz" className="hover:underline">
        Datenschutz
      </Link>
    </footer>
  );
}
