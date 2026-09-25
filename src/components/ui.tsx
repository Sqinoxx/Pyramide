import Link from "next/link";

/**
 * Layout primitives shared across pages. Visual styling lives in the
 * component classes in globals.css; these just keep structure consistent.
 */

export function PageHeader({
  title,
  lead,
  eyebrow,
  actions,
  center = false,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={
        "mb-6 flex flex-col gap-4 sm:mb-8 " +
        (center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between")
      }
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-wider text-brand-700 uppercase dark:text-brand-400">
            {eyebrow}
          </p>
        )}
        <h1 className="page-title">{title}</h1>
        {lead && <p className="page-lead max-w-prose">{lead}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {children}
    </div>
  );
}

/** Centered message for "no profile / no season" style dead ends. */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="page max-w-lg">
      <EmptyState>{children}</EmptyState>
    </div>
  );
}

const DIVISIONS = [
  { key: "herren", label: "Herren" },
  { key: "damen", label: "Damen" },
] as const;

export function DivisionTabs({
  active,
  basePath,
}: {
  active: "herren" | "damen";
  basePath: string;
}) {
  return (
    <div className="segmented">
      {DIVISIONS.map(({ key, label }) => (
        <Link
          key={key}
          href={`${basePath}?bewerb=${key}`}
          aria-current={active === key ? "page" : undefined}
          className="segmented-item"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Narrow centred card used by login, join and the token-link pages. */
export function AuthCard({
  title,
  lead,
  footer,
  wide = false,
  center = false,
  children,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  center?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`page flex flex-col justify-center sm:py-16 ${wide ? "max-w-xl" : "max-w-md"}`}
    >
      <div className={`card p-5 sm:p-8 ${center ? "text-center" : ""}`}>
        <h1 className="page-title">{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
      {footer && (
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">{footer}</p>
      )}
    </div>
  );
}
