"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createItnImport } from "@/server/itn-import";
import { recordAudit } from "@/server/audit";
import type { ActionState } from "@/lib/form-state";

async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export type ImportActionState = ActionState & {
  rowCount?: number;
  parseErrors?: string[];
};

export async function importItnAction(
  _prev: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const userId = await requireAdmin();

  const file = formData.get("file");
  const pasted = String(formData.get("pasted") ?? "").trim();

  let text = pasted;
  let source: "csv" | "paste" = "paste";
  let fileName: string | null = null;

  if (file instanceof File && file.size > 0) {
    text = await file.text();
    source = "csv";
    fileName = file.name;
  }

  if (!text) {
    return { error: "Bitte eine Datei hochladen oder eine Tabelle einfügen." };
  }

  const result = await createItnImport(source, fileName, text, userId);

  if (!result.importId) {
    return {
      error: "Es konnten keine gültigen Zeilen importiert werden.",
      parseErrors: result.errors.map((e) => `Zeile ${e.rowNumber || "?"}: ${e.message}`),
    };
  }

  await recordAudit(userId, "import_itn", "itn_import", result.importId, null, {
    fileName,
    rowCount: result.rowCount,
  });

  revalidatePath("/admin/itn-import");
  revalidatePath("/admin/itn");

  return {
    success: true,
    rowCount: result.rowCount,
    parseErrors: result.errors.map((e) => `Zeile ${e.rowNumber}: ${e.message}`),
  };
}
