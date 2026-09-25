"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  PyramidIcon,
  SwordsIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

function isActive(pathname: string, href: string) {
  // Section roots whose sub-pages have their own nav entries.
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * A Link that knows whether it points at the current page. Server components
 * (Header) render these so active-state styling works without making the
 * whole header a client component.
 */
export function NavLink({
  href,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  children,
  ...rest
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  children: React.ReactNode;
  "aria-label"?: string;
  title?: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * Open state is keyed to the pathname it was opened on, so navigating
 * anywhere closes the menu without a setState-in-effect round trip.
 */
function useRouteScopedToggle() {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = useCallback(() => setOpenedOn(null), []);
  const toggle = () => setOpenedOn(open ? null : pathname);
  return { open, toggle, close };
}

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const { open, toggle, close } = useRouteScopedToggle();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        className="btn btn-ghost -mr-2 h-11 w-11 px-0"
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>

      {/* Portalled to <body>: the header's backdrop-filter would otherwise
          become the containing block for this fixed overlay and clip it. */}
      {open &&
        createPortal(
          <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-40 lg:hidden">
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={close}
              className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px]"
            />
            <nav
              className="relative max-h-full overflow-y-auto border-b border-line bg-surface px-4 pt-2 pb-6 shadow-xl"
              // Tapping a link to the page you're already on wouldn't change
              // the pathname, so close explicitly on any link click.
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) close();
              }}
            >
              {children}
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}

export function DropdownMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, toggle, close } = useRouteScopedToggle();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="btn btn-ghost btn-sm gap-1.5"
      >
        {icon}
        {label}
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="card absolute right-0 z-50 mt-2 w-60 overflow-hidden p-1.5 shadow-xl"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) close();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { href: "/", label: "Pyramide", Icon: PyramidIcon },
  { href: "/forderungen", label: "Forderungen", Icon: SwordsIcon },
  { href: "/ergebnisse", label: "Ergebnisse", Icon: TrophyIcon },
  { href: "/mitglieder", label: "Mitglieder", Icon: UsersIcon },
  { href: "/profil", label: "Profil", Icon: UserIcon },
];

/** App-style tab bar for signed-in members on phones and small tablets. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <>
      {/* Spacer so the fixed bar never covers the footer. */}
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors " +
                    (active
                      ? "text-brand-700 dark:text-brand-300"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
                  }
                >
                  <span
                    className={
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors " +
                      (active ? "bg-brand-100 dark:bg-brand-900/60" : "")
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
