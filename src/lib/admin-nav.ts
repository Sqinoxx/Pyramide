/**
 * Every admin section, shared by the header menus and the /admin overview
 * so a new page only has to be registered once.
 */
export const ADMIN_SECTIONS = [
  {
    href: "/admin/mitglieder",
    label: "Registrierungen",
    description: "Neue Anmeldungen prüfen und freischalten.",
  },
  {
    href: "/admin/spieler",
    label: "Spieler:innen",
    description: "Alle Konten mit Position, ITN und Urlaubsmodus.",
  },
  {
    href: "/admin/saison",
    label: "Saison",
    description: "Saison starten, beenden, umbenennen; Positionen tauschen.",
  },
  {
    href: "/admin/einstellungen",
    label: "Regeln & Einstellungen",
    description: "Fristen, Reichweite, Sperrfristen, Pause und Inaktivität.",
  },
  {
    href: "/admin/regeln",
    label: "Mindestspiele",
    description: "Wer die Mindestanzahl an Spielen verfehlt; aus der Pyramide entfernen.",
  },
  {
    href: "/admin/forderungen",
    label: "Streitfälle",
    description: "Strittige oder abgelaufene Forderungen entscheiden.",
  },
  {
    href: "/admin/ankuendigungen",
    label: "Ankündigungen",
    description: "Neuigkeiten für alle oder einen Bewerb veröffentlichen.",
  },
  {
    href: "/admin/mitglieder-import",
    label: "Vereinsmitglieder",
    description: "Mitgliederliste des Vereins importieren.",
  },
  {
    href: "/admin/itn-import",
    label: "ITN-Import",
    description: "Offizielle ITN-Liste hochladen.",
  },
  {
    href: "/admin/itn",
    label: "ITN-Zuordnung",
    description: "ITN-Treffer bestätigen oder manuell setzen.",
  },
  {
    href: "/admin/audit",
    label: "Audit-Log",
    description: "Nachvollziehen, wer was geändert hat.",
  },
] as const;
