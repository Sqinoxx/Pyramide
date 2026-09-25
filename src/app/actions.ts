"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PYRAMID_LAYOUT_COOKIE, parsePyramidLayout } from "@/lib/pyramid-layout";

/**
 * Remembers whether phones show the pyramid as a list or as the real
 * triangle. A cookie (not localStorage) so the server renders the chosen
 * layout directly — no flash of the other one on load.
 */
export async function setPyramidLayoutAction(formData: FormData) {
  const layout = parsePyramidLayout(formData.get("layout")?.toString());
  const bewerb = formData.get("bewerb") === "damen" ? "damen" : "herren";

  (await cookies()).set(PYRAMID_LAYOUT_COOKIE, layout, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect(`/?bewerb=${bewerb}`);
}
