import { test, expect } from "@playwright/test";

test.describe("Board creation", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should allow a user to create a new board", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Create Board" }).click();

    await page.getByLabel("Name").fill("My New Board");
    await page.getByLabel("Description").fill("A board for all my things.");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(/.*\/boards\/.*/);
    await expect(page.getByText("My New Board")).toBeVisible();
  });
});
