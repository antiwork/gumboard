import { test, expect } from "../fixtures/test-helpers";

test.describe("Home Page", () => {
  test("sticky notes demo - should handle all UI interactions correctly", async ({ page }) => {
    let networkCalls: number = 0;

    await page.route("**/api/boards/*/notes/*", async (route) => {
      const method = route.request().method();
      if (method === "PUT" || method === "DELETE") {
        networkCalls += 1;
      }
    });

    await page.goto("/");
    await expect(page.locator("text=Keep on top of your team's to-dos")).toBeVisible();
    let initialNotes = await page.getByRole("button", { name: "Add task" }).count();

    // Test 1: Add a new note
    await page.getByRole("button", { name: "Add Note" }).click();
    await expect(page.getByText("New to-do")).toBeVisible();
    await expect(await page.getByRole("button", { name: "Add task" }).count()).toBe(
      initialNotes + 1
    );
    initialNotes += 1;

    // Test 2: Toggle checklist item (check/uncheck)
    const initialCheckedCount = await page.getByRole("checkbox", { checked: true }).count();
    const uncheckedCheckbox = page.getByTestId("102").getByRole("checkbox");
    await uncheckedCheckbox.click();
    await expect(await page.getByRole("checkbox", { checked: true })).toHaveCount(
      initialCheckedCount + 1
    );
    await uncheckedCheckbox.click();
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(initialCheckedCount);

    // Test 3: Add a new checklist item
    await page.getByRole("button", { name: "Add task" }).first().click();
    await page.getByPlaceholder("Add new item...").fill("Brand new task item");
    await page.getByPlaceholder("Add new item...").press("Enter");
    await expect(page.getByText("Brand new task item")).toBeVisible();

    // Test 4: Edit existing checklist item content
    await page.getByText("Gumboard release by Friday").click();
    const editInput = page.locator('input[value="Gumboard release by Friday"]');
    await expect(editInput).toBeVisible();
    await editInput.fill("Updated Gumboard release deadline");
    await page.locator('input[value="Updated Gumboard release deadline"]').press("Enter");
    await expect(page.getByText("Updated Gumboard release deadline")).toBeVisible();

    // Test 5: Delete a checklist item
    page.getByTestId("101").getByRole("button", { name: "Delete item", exact: true }).click();
    await expect(page.getByTestId("101")).not.toBeAttached();

    // Test 6: Delete entire note
    const deleteNoteButton = page.getByRole("button", { name: "Delete Note 1", exact: true });
    await deleteNoteButton.click();
    await expect(deleteNoteButton).not.toBeAttached();
    await expect(await page.getByRole("button", { name: "Add task" }).count()).toBe(
      initialNotes - 1
    );
    initialNotes -= 1;

    // Test 7: Split checklist item (Enter in middle of text)
    const itemToSplit = page.getByText("Helper Tix (Mon-Fri)");
    await itemToSplit.click();
    const editSplitInput = page.locator('input[value="Helper Tix (Mon-Fri)"]');
    if (await editSplitInput.isVisible()) {
      await editSplitInput.click();
      await editSplitInput.press("ArrowLeft");
      await editSplitInput.press("ArrowLeft");
      await editSplitInput.press("ArrowLeft");
      await editSplitInput.press("Enter");
    }
    await expect(page.getByTestId("203")).toBeVisible();
    await expect(page.getByText("(Mon-Fri)")).toBeVisible();

    // Test 8: Should re-order items
    const sourceElement = page.locator("text=Metabase queries");
    const targetElement = page.locator("text=Review support huddle");

    await expect(page.getByTestId("301")).toHaveAttribute("data-testorder", "0");
    await expect(page.getByTestId("302")).toHaveAttribute("data-testorder", "1");

    await expect(sourceElement).toBeVisible();

    const targetBox = await targetElement.boundingBox();
    if (!targetBox) throw Error("will never throw");

    await sourceElement.hover();
    await page.mouse.down();
    await targetElement.hover();
    await targetElement.hover();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 5);
    await page.mouse.up();

    await expect(page.getByTestId("302")).toHaveAttribute("data-testorder", "0");
    await expect(page.getByTestId("301")).toHaveAttribute("data-testorder", "1");

    expect(networkCalls).toBe(0);
  });
});
