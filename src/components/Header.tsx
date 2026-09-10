import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { countUnreadNotifications } from "@/server/notifications";

export async function Header() {
  const session = await auth();

  let unreadCount = 0;
  if (session?.user) {
    const member = await getMemberByUserId(session.user.id);
    if (member) unreadCount = await countUnreadNotifications(member.id);
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
        Tennis-Pyramide
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/ergebnisse" className="text-zinc-700 hover:underline dark:text-zinc-300">
          Ergebnisse
        </Link>
        {session?.user ? (
          <>
            <Link href="/mitglieder" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Mitglieder
            </Link>
            <Link href="/forderungen" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Forderungen
            </Link>
            <Link
              href="/benachrichtigungen"
              className="text-zinc-700 hover:underline dark:text-zinc-300"
            >
              Benachrichtigungen
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link href="/profil" className="text-zinc-700 hover:underline dark:text-zinc-300">
              Profil
            </Link>
            {session.user.role === "admin" && (
              <>
                <Link
                  href="/admin/mitglieder"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Registrierungen
                </Link>
                <Link
                  href="/admin/itn-import"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  ITN-Import
                </Link>
                <Link
                  href="/admin/itn"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  ITN-Zuordnung
                </Link>
                <Link
                  href="/admin/saison"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Saison
                </Link>
                <Link
                  href="/admin/forderungen"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Streitfälle
                </Link>
                <Link
                  href="/admin/audit"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Audit-Log
                </Link>
                <Link
                  href="/admin/ankuendigungen"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Ankündigungen
                </Link>
              </>
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
