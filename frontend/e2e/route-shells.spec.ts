import { expect, test } from "@playwright/test";

const portalBaseURL = process.env.PORTAL_E2E_URL ?? "http://127.0.0.1:3101";

test("patient home route renders the booking experience", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Care that moves", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "ALL DOCTORS" })).toBeVisible();
});

test("patient navigation never requests a stringified object URL", async ({ page }) => {
  const malformedRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/[object%20object]")) malformedRequests.push(request.url());
  });

  await page.goto("/");
  await page.getByRole("link", { name: "ALL DOCTORS" }).click();
  await expect(page).toHaveURL(/\/doctors$/);
  await page.getByRole("link", { name: "HOME", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(malformedRequests).toEqual([]);
});

test("portal unauthenticated route renders the secure login form", async ({ page }) => {
  await page.goto(`${portalBaseURL}/admin-dashboard`);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Email")).toBeVisible();
});
