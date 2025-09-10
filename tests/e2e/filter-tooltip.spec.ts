import { test, expect } from "../fixtures/test-helpers";

test.describe("Filter tooltip", () => {
  test("shows 'Filters' tooltip on hover", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/boards/all-notes");

    const filterButton = authenticatedPage.getByRole("button", { name: "Filters" });
    await expect(filterButton).toBeVisible();

    await filterButton.hover();

    await expect(
      authenticatedPage.locator('[data-slot="tooltip-content"]:has-text("Filters")')
    ).toBeVisible();
  });
});
