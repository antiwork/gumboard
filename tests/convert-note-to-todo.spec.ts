import { test, expect } from "@playwright/test";

test.describe("Note to to-do conversion", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should allow a user to turn a note into a to-do list", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Create Board" }).click();
    await page.getByLabel("Name").fill("Board for To-dos");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/.*\/boards\/.*/);

    await page.getByRole("button", { name: "New Note" }).click();
    const noteText = "First item\nSecond item";
    await page.getByRole("textbox").fill(noteText);
    await page.getByRole("button", { name: "Save" }).click();

    const note = page.getByText("First item");
    await note.hover();
    await page.getByRole("button", { name: "Make to-do" }).click();

    await expect(
      page.getByRole("checkbox", { name: "First item" })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Second item" })
    ).toBeVisible();
  });
});
