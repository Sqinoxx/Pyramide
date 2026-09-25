import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getMemberByUserId } from "@/server/members";
import { countUnreadNotifications } from "@/server/notifications";
import { DropdownMenu, MobileMenu, NavLink } from "./nav";
import { BallLogo, BellIcon, BookIcon, LogoutIcon, ShieldIcon } from "./icons";

const MEMBER_LINKS = [
  { href: "/", label: "Pyramide" },
  { href: "/ergebnisse", label: "Ergebnisse" },
  { href: "/forderungen", label: "Forderungen" },
  { href: "/mitglieder", label: "Mitglieder" },
];

const ADMIN_LINKS = [
  { href: "/admin/mitglieder", label: "Registrierungen" },
  { href: "/admin/mitglieder-import", label: "Vereinsmitglieder" },
  { href: "/admin/itn-import", label: "ITN-Import" },
  { href: "/admin/itn", label: "ITN-Zuordnung" },
  { href: "/admin/saison", label: "Saison" },
  { href: "/admin/forderungen", label: "Streitfälle" },
  { href: "/admin/audit", label: "Audit-Log" },
  { href: "/admin/ankuendigungen", label: "Ankündigungen" },
];

const desktopLink =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted";
const desktopActive = "text-brand-700 dark:text-brand-300";
const desktopInactive = "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

const menuLink = "flex min-h-11 items-center rounded-xl px-3 text-base font-medium transition-colors";
const menuActive = "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200";
const menuInactive = "text-zinc-700 hover:bg-surface-muted dark:text-zinc-300";

const dropdownLink = "flex min-h-9 items-center rounded-lg px-3 text-sm transition-colors";

function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white ring-2 ring-background ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function Header() {
  const session = await auth();

  let unreadCount = 0;
  if (session?.user) {
    const member = await getMemberByUserId(session.user.id);
    if (member) unreadCount = await countUnreadNotifications(member.id);
  }

  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BallLogo className="h-8 w-8 drop-shadow-sm" />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Tennis-Pyramide
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              UTC Neukirchen
            </span>
          </span>
        </Link>

        {session?.user ? (
          <>
            {/* Desktop */}
            <nav className="hidden items-center gap-1 lg:flex">
              {MEMBER_LINKS.map((l) => (
                <NavLink
                  key={l.href}
                  href={l.href}
                  className={desktopLink}
                  activeClassName={desktopActive}
                  inactiveClassName={desktopInactive}
                >
                  {l.label}
                </NavLink>
              ))}
              {isAdmin && (
                <DropdownMenu label="Admin" icon={<ShieldIcon className="h-4 w-4" />}>
                  {ADMIN_LINKS.map((l) => (
                    <NavLink
                      key={l.href}
                      href={l.href}
                      className={dropdownLink}
                      activeClassName={menuActive}
                      inactiveClassName={menuInactive}
                    >
                      {l.label}
                    </NavLink>
                  ))}
                </DropdownMenu>
              )}
              <span className="mx-2 h-6 w-px bg-line" />
              <NavLink
                href="/benachrichtigungen"
                aria-label="Benachrichtigungen"
                title="Benachrichtigungen"
                className="btn btn-ghost relative h-10 w-10 px-0"
                activeClassName="text-brand-700 dark:text-brand-300"
              >
                <BellIcon />
                <UnreadBadge count={unreadCount} className="absolute -top-0.5 -right-0.5" />
              </NavLink>
              <NavLink
                href="/profil"
                className={desktopLink}
                activeClassName={desktopActive}
                inactiveClassName={desktopInactive}
              >
                Profil
              </NavLink>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Abmelden"
                  title="Abmelden"
                  className="btn btn-ghost h-10 w-10 px-0"
                >
                  <LogoutIcon />
                </button>
              </form>
            </nav>

            {/* Mobile */}
            <div className="flex items-center gap-1 lg:hidden">
              <Link
                href="/benachrichtigungen"
                aria-label="Benachrichtigungen"
                className="btn btn-ghost relative h-11 w-11 px-0"
              >
                <BellIcon className="h-6 w-6" />
                <UnreadBadge count={unreadCount} className="absolute top-0.5 right-0.5" />
              </Link>
              <MobileMenu>
                <p className="section-title mt-3 mb-1 px-3">Menü</p>
                {[...MEMBER_LINKS, { href: "/profil", label: "Profil" }].map((l) => (
                  <NavLink
                    key={l.href}
                    href={l.href}
                    className={menuLink}
                    activeClassName={menuActive}
                    inactiveClassName={menuInactive}
                  >
                    {l.label}
                  </NavLink>
                ))}
                <NavLink
                  href="/benachrichtigungen"
                  className={`${menuLink} justify-between`}
                  activeClassName={menuActive}
                  inactiveClassName={menuInactive}
                >
                  Benachrichtigungen
                  <UnreadBadge count={unreadCount} />
                </NavLink>
                <NavLink
                  href="/regeln"
                  className={`${menuLink} gap-3`}
                  activeClassName={menuActive}
                  inactiveClassName={menuInactive}
                >
                  <BookIcon className="h-5 w-5 text-zinc-400" />
                  Regeln
                </NavLink>

                {isAdmin && (
                  <>
                    <p className="section-title mt-5 mb-1 flex items-center gap-1.5 px-3">
                      <ShieldIcon className="h-3.5 w-3.5" /> Admin
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {ADMIN_LINKS.map((l) => (
                        <NavLink
                          key={l.href}
                          href={l.href}
                          className={`${menuLink} text-sm`}
                          activeClassName={menuActive}
                          inactiveClassName={menuInactive}
                        >
                          {l.label}
                        </NavLink>
                      ))}
                    </div>
                  </>
                )}

                <form action={signOutAction} className="mt-5 border-t border-line pt-4">
                  <button type="submit" className="btn btn-secondary w-full">
                    <LogoutIcon className="h-4 w-4" />
                    Abmelden
                  </button>
                </form>
              </MobileMenu>
            </div>
          </>
        ) : (
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink
              href="/ergebnisse"
              className={`${desktopLink} hidden sm:inline-flex`}
              activeClassName={desktopActive}
              inactiveClassName={desktopInactive}
            >
              Ergebnisse
            </NavLink>
            <Link href="/login" className="btn btn-ghost btn-sm">
              Anmelden
            </Link>
            <Link href="/beitreten" className="btn btn-primary btn-sm">
              <span className="sm:hidden">Beitreten</span>
              <span className="hidden sm:inline">Zur Pyramide anmelden</span>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
