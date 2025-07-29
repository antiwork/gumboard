import { test as setup, expect } from "@playwright/test";
import { randomBytes } from "crypto";

const authFile = "playwright/.auth/user.json";

const testUser = {
  email: `${randomBytes(8).toString("hex")}@test.com`,
  password: "password123",
};

setup("authenticate", async ({ page }) => {
  await page.request.post("/api/testing/create-user", {
    data: {
      email: testUser.email,
      password: testUser.password,
    },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(testUser.email);
  await page.getByLabel("Password").fill(testUser.password);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("/dashboard");

  await page.context().storageState({ path: authFile });
});
