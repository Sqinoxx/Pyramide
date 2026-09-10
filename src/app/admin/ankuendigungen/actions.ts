"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createAnnouncement, deleteAnnouncement } from "@/server/announcements";
import { recordAudit } from "@/server/audit";
import { fieldErrorsFromZod, type ActionState } from "@/lib/form-state";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich").max(200),
  bodyMd: z.string().trim().min(1, "Text erforderlich").max(5000),
  divisionId: z.string().optional(),
});

export async function createAnnouncementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdmin();
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    bodyMd: formData.get("bodyMd"),
    divisionId: formData.get("divisionId") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const row = await createAnnouncement(
    adminId,
    parsed.data.title,
    parsed.data.bodyMd,
    parsed.data.divisionId ?? null,
  );
  await recordAudit(adminId, "create_announcement", "announcement", row.id);

  revalidatePath("/admin/ankuendigungen");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteAnnouncement(id);
  await recordAudit(adminId, "delete_announcement", "announcement", id);
  revalidatePath("/admin/ankuendigungen");
  revalidatePath("/");
}
