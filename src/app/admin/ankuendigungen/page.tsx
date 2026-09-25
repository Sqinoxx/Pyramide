import { listAllAnnouncements } from "@/server/announcements";
import { getAllDivisions } from "@/server/seasons";
import { AnnouncementForm } from "./AnnouncementForm";
import { deleteAnnouncementAction } from "./actions";
import { EmptyState } from "@/components/ui";

export default async function AnnouncementsAdminPage() {
  const [announcements, divisions] = await Promise.all([
    listAllAnnouncements(),
    getAllDivisions(),
  ]);

  return (
    <div className="page max-w-xl">
      <h1 className="page-title">
        Ankündigungen
      </h1>
      <p className="page-lead mb-6">
        Erscheinen auf der Startseite oberhalb der Pyramide.
      </p>

      <div className="card card-body mb-10">
        <AnnouncementForm divisions={divisions} />
      </div>

      <h2 className="section-title">Veröffentlicht</h2>
      {announcements.length === 0 ? (
        <EmptyState>Noch keine Ankündigungen.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{a.title}</p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  {a.division?.name ?? "Vereinsweit"} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString("de-AT")}
                </p>
              </div>
              <form action={deleteAnnouncementAction}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Löschen
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
