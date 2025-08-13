import { test, expect } from "../fixtures/test-helpers";

test.describe("Not Found Page", () => {
  test("should display not found page for invalid routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    await expect(page.locator("text=Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Gumboard home" })).toBeVisible();

    // Click the "Go to Gumboard home" button
    const homeButton = page.getByRole("link", { name: "Go to Gumboard home" });
    await homeButton.click();

    // Wait for navigation to complete
    await page.waitForURL("/");

    // Should navigate to the home page
    await expect(page).toHaveURL("/");
  });
});
