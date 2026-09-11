import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("pyramid view shows the Herren/Damen toggle and switches division", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Tennis-Forderungspyramide" })).toBeVisible();

    const herren = page.getByRole("link", { name: "Herren" });
    const damen = page.getByRole("link", { name: "Damen" });
    await expect(herren).toBeVisible();
    await expect(damen).toBeVisible();

    await damen.click();
    await expect(page).toHaveURL(/bewerb=damen/);
  });

  test("legal pages are reachable", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.locator("body")).not.toBeEmpty();

    await page.goto("/datenschutz");
    await expect(page.locator("body")).not.toBeEmpty();

    await page.goto("/regeln");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("join form rejects an incomplete submission client-side/server-side", async ({ page }) => {
    await page.goto("/beitreten");
    await page.getByRole("button", { name: "Zur Pyramide anmelden" }).click();
    // Required native inputs block submission — page shouldn't show the success state.
    await expect(page.getByText("Fast geschafft")).not.toBeVisible();
  });
});
