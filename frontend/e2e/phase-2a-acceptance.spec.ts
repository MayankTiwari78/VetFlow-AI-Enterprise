import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const screenshotPath = (name: string) => resolve(process.cwd(), "../docs/screenshots", name);
const portalBaseURL = process.env.PORTAL_E2E_URL ?? "http://127.0.0.1:3101";

const assertHealthyVisuals = async (page: Page) => {
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter(
        (image): image is HTMLImageElement =>
          image instanceof HTMLImageElement && (!image.complete || image.naturalWidth === 0)
      )
      .map((image) => image.getAttribute("src"))
  );
  expect(brokenImages).toEqual([]);
  await expect(page.getByText("Network Error", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Runtime Error", { exact: true })).toHaveCount(0);
};

test("patient desktop runtime and primary navigation are healthy", async ({ page }) => {
  const malformedRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/[object%20object]")) malformedRequests.push(request.url());
  });
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource") &&
      !message.text().includes("/_next/webpack-hmr")
    ) {
      consoleErrors.push(message.text());
    }
  });
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false }) })
  );
  await page.route("**/api/user/get-profile", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false }) })
  );
  await page.route("**/api/doctor/list", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": route.request().headers().origin ?? "http://127.0.0.1:3100",
        "access-control-allow-credentials": "true"
      },
      body: JSON.stringify({ success: true, doctors: [] })
    })
  );
  await page.addInitScript(() => window.localStorage.clear());
  await page.context().clearCookies();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Care that moves/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meet your care team" })).toBeVisible({ timeout: 30_000 });
  await assertHealthyVisuals(page);
  await page.screenshot({ path: screenshotPath("phase-2a-patient-desktop.png"), fullPage: true });

  for (const name of ["ALL DOCTORS", "ABOUT", "CONTACT"]) {
    await page.getByRole("link", { name }).first().click();
    await expect(page.locator("main, section").first()).toBeVisible();
  }
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Create your account|Welcome back/ })).toBeVisible();
  await page.goto("/appointment/missing-clinician");
  await expect(page.locator("body")).toBeVisible();
  await assertHealthyVisuals(page);
  for (const route of ["/medical-timeline", "/family-health", "/health-card"]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await assertHealthyVisuals(page);
  }

  expect(malformedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("patient mobile home is balanced and asset-safe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Care that moves/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meet your care team" })).toBeVisible({ timeout: 30_000 });
  await assertHealthyVisuals(page);
  await page.screenshot({ path: screenshotPath("phase-2a-patient-mobile.png"), fullPage: true });
});

test("portal login is healthy at desktop and mobile widths", async ({ page }) => {
  await page.goto(`${portalBaseURL}/admin-dashboard`);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible({ timeout: 20_000 });
  await assertHealthyVisuals(page);
  await page.screenshot({ path: screenshotPath("phase-2a-portal-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible({ timeout: 20_000 });
  await assertHealthyVisuals(page);
  await page.screenshot({ path: screenshotPath("phase-2a-portal-mobile.png"), fullPage: true });
});
