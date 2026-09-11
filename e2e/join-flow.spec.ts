import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./env";
import { waitForMagicLink } from "./helpers/mail";

/**
 * The full happy path from PLAN.md §3 / TODO.md's manually-verified flow:
 * Beitritt → Bestätigungs-Mail → Admin-Freigabe → Login → Pyramide.
 * Runs against the isolated e2e stack (docker-compose.e2e.yml), so it's
 * free to create real rows without touching dev/prod data.
 */
test("join, admin approval, and magic-link login land the member in the pyramid", async ({
  page,
}) => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const firstName = "Erika";
  const lastName = `Testfrau${stamp}`;

  await test.step("Beitritt", async () => {
    await page.goto("/beitreten");
    await page.getByLabel("Vorname").fill(firstName);
    await page.getByLabel("Nachname").fill(lastName);
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Geburtsjahr").fill("1990");
    await page.getByLabel("Geschlecht").selectOption("w");
    await page.getByRole("button", { name: "Zur Pyramide anmelden" }).click();
    await expect(page.getByText("Fast geschafft")).toBeVisible();
  });

  await test.step("Bestätigungs-Link aus der Mail klicken", async () => {
    const link = await waitForMagicLink(email, "Anmeldung zur Pyramide bestätigen");
    await page.goto(link);
    await page.getByRole("button", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/profil$/);
    await expect(page.getByText("Warten auf Freigabe")).toBeVisible();
  });

  await test.step("Abmelden", async () => {
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page.getByRole("link", { name: "Anmelden", exact: true })).toBeVisible();
  });

  await test.step("Admin meldet sich an und schaltet frei", async () => {
    await page.goto("/login");
    await page.getByText("Admin-Login mit Passwort").click();
    await page.locator("#admin-email").fill(E2E_ADMIN_EMAIL);
    await page.locator("#admin-password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Mit Passwort anmelden" }).click();
    await expect(page).toHaveURL(/\/profil$/);

    await page.goto("/admin/mitglieder");
    const row = page.locator("li").filter({ hasText: `${firstName} ${lastName}` });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Freischalten" }).click();
    await expect(page.getByText(`${firstName} ${lastName}`)).not.toBeVisible();

    await page.getByRole("button", { name: "Abmelden" }).click();
  });

  await test.step("Neu freigeschaltetes Mitglied meldet sich per Login-Link an", async () => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByRole("button", { name: "Login-Link anfordern" }).click();
    await expect(page.getByText(/Login-Link geschickt/)).toBeVisible();

    const link = await waitForMagicLink(email, "Dein Login-Link");
    await page.goto(link);
    await page.getByRole("button", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/profil$/);
    await expect(page.getByText("Damen · Aktiv")).toBeVisible();
  });

  await test.step("Mitglied erscheint in der Damen-Pyramide", async () => {
    await page.goto("/?bewerb=damen");
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
  });
});
