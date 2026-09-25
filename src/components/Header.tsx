import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { countUnreadNotifications } from "@/server/notifications";

export async function Header() {
  const session = await auth();

  let unreadCount = 0;
  let displayName: string | undefined;
  let initials = "";
  if (session?.user) {
    const member = await getMemberByUserId(session.user.id);
    if (member) {
      unreadCount = await countUnreadNotifications(member.id);
      displayName = `${member.firstName} ${member.lastName}`;
      initials =
        `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
    } else {
      displayName = session.user.email;
      initials = session.user.email.charAt(0).toUpperCase();
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
        Tennis-Pyramide
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link
          href="/ergebnisse"
          className="text-zinc-700 hover:underline dark:text-zinc-300"
        >
          Ergebnisse
        </Link>
        {session?.user ? (
          <>
            <Link
              href="/mitglieder"
              className="text-zinc-700 hover:underline dark:text-zinc-300"
            >
              Mitglieder
            </Link>
            <Link
              href="/forderungen"
              className="text-zinc-700 hover:underline dark:text-zinc-300"
            >
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
            <Link
              href="/profil"
              title="Angemeldet – zum Profil"
              className="flex items-center gap-2 rounded-full border border-zinc-200 py-0.5 pl-0.5 pr-3 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              <span
                aria-hidden
                className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
              >
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-400 dark:border-zinc-900" />
              </span>
              <span className="font-medium">{displayName}</span>
              {session.user.role === "admin" && (
                <span className="rounded bg-zinc-900 px-1.5 text-[10px] font-semibold uppercase text-white dark:bg-zinc-100 dark:text-zinc-900">
                  Admin
                </span>
              )}
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
                  href="/admin/mitglieder-import"
                  className="text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Vereinsmitglieder
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
              <button
                type="submit"
                className="text-zinc-700 hover:underline dark:text-zinc-300"
              >
                Abmelden
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-zinc-700 hover:underline dark:text-zinc-300"
            >
              Anmelden
            </Link>
            <Link
              href="/beitreten"
              className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Zur Pyramide anmelden
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
