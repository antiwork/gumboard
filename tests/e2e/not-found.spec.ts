import { test, expect } from "../fixtures/test-helpers";

test.describe("Not Found Page", () => {
  test("should display not found page for invalid routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    await expect(page.locator("text=Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Gumboard" })).toBeVisible();

    // Click the "Go to Gumboard" button
    const homeButton = page.getByRole("link", { name: "Go to Gumboard" });
    await homeButton.click();

    // Wait for navigation to complete
    await page.waitForURL("/");

    // Should navigate to the home page
    await expect(page).toHaveURL("/");
  });
});
