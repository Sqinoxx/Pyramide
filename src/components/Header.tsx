import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
        Tennis-Pyramide
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {session?.user ? (
          <>
            <Link href="/profil" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Profil
            </Link>
            {session.user.role === "admin" && (
              <Link
                href="/admin/mitglieder"
                className="text-zinc-700 hover:underline dark:text-zinc-300"
              >
                Mitglieder
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-zinc-700 hover:underline dark:text-zinc-300">
                Abmelden
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Anmelden
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Registrieren
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
