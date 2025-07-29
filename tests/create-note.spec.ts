import { test, expect } from "@playwright/test";

test.describe("Note creation", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should allow a user to create a note with newlines", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Create Board" }).click();
    await page.getByLabel("Name").fill("Board For Notes");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/.*\/boards\/.*/);

    await page.getByRole("button", { name: "New Note" }).click();

    const noteText = "This is a note\nwith multiple\nlines.";
    await page.getByRole("textbox").fill(noteText);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("This is a note")).toBeVisible();
    await expect(page.getByText("with multiple")).toBeVisible();
    await expect(page.getByText("lines.")).toBeVisible();
  });
});
