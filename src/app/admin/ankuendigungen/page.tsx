import { listAllAnnouncements } from "@/server/announcements";
import { getAllDivisions } from "@/server/seasons";
import { AnnouncementForm } from "./AnnouncementForm";
import { deleteAnnouncementAction } from "./actions";

export default async function AnnouncementsAdminPage() {
  const [announcements, divisions] = await Promise.all([
    listAllAnnouncements(),
    getAllDivisions(),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Ankündigungen
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Erscheinen auf der Startseite oberhalb der Pyramide.
      </p>

      <div className="mb-10">
        <AnnouncementForm divisions={divisions} />
      </div>

      <ul className="flex flex-col gap-2">
        {announcements.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{a.title}</p>
              <p className="text-zinc-500 dark:text-zinc-400">
                {a.division?.name ?? "Vereinsweit"} ·{" "}
                {new Date(a.createdAt).toLocaleDateString("de-AT")}
              </p>
            </div>
            <form action={deleteAnnouncementAction}>
              <input type="hidden" name="id" value={a.id} />
              <button type="submit" className="text-xs text-red-600 underline dark:text-red-400">
                Löschen
              </button>
            </form>
          </li>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Noch keine Ankündigungen.</p>
        )}
      </ul>
    </div>
  );
}
