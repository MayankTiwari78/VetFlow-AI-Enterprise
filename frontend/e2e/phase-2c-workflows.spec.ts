import { expect, test, type Page, type Route } from "@playwright/test";

const patientProfile = {
  _id: "000000000000000000000001",
  name: "Patient One",
  image: "/profile_pic.png",
  dob: "1994-06-12"
};
const portalBaseURL = process.env.PORTAL_E2E_URL ?? "http://127.0.0.1:3101";

const corsHeaders = (route: Route) => ({
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization, content-type, token, atoken, dtoken",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-origin": route.request().headers().origin ?? "http://127.0.0.1:3000"
});

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders(route) });
    return;
  }

  await route.fulfill({
    status,
    contentType: "application/json",
    headers: corsHeaders(route),
    body: JSON.stringify(body)
  });
};

const setupPatientSession = async (page: Page) => {
  await page.route("**/api/v1/auth/refresh", (route) =>
    fulfillJson(route, { success: true, data: { accessToken: "patient-token" } })
  );
  await page.route("**/api/user/get-profile", (route) =>
    fulfillJson(route, { success: true, userData: patientProfile })
  );
  await page.route("**/api/doctor/list", (route) =>
    fulfillJson(route, { success: true, doctors: [] })
  );
  await page.goto("/");
  await page.evaluate(() => window.localStorage.setItem("token", "patient-token"));
};

const setupPortalSession = async (page: Page, tokenKey: "aToken" | "dToken") => {
  await page.goto(`${portalBaseURL}/login`);
  await page.evaluate((key) => window.localStorage.setItem(key, `${key}-value`), tokenKey);
};

test("patient Phase 2C pages keep finalized records visible and private notes hidden", async ({
  page
}) => {
  await setupPatientSession(page);
  await page.route("**/api/user/medical-timeline", (route) =>
    fulfillJson(route, {
      success: true,
      timeline: {
        patient: patientProfile,
        healthProfile: {
          bloodGroup: "O+",
          allergies: ["Penicillin"],
          chronicConditions: ["Asthma"],
          medicalNotes: "Patient private medical note"
        },
        documentStorage: {
          configured: false,
          message: "Storage is not configured in this local environment. Report uploads are disabled."
        },
        appointments: [
          {
            _id: "appt-1",
            date: Date.now(),
            slotDate: "2026-07-18",
            slotTime: "10:00",
            status: "completed",
            clinicalNotes: "Private assigned-doctor note",
            docData: { name: "Dr. Secure" }
          }
        ],
        records: [
          {
            _id: "record-1",
            type: "prescription_plan",
            title: "Final prescription",
            summary: "Patient-visible finalized prescription.",
            status: "finalized",
            finalizedAt: "2026-07-18T10:30:00.000Z",
            details: {
              medicines: [
                {
                  name: "Demo medicine",
                  dosage: "5 mg",
                  frequency: "Once daily",
                  duration: "5 days"
                }
              ]
            }
          }
        ]
      }
    })
  );

  await page.goto("/medical-timeline");
  await expect(page.getByRole("heading", { name: "Medical timeline" })).toBeVisible();
  await expect(page.getByText("Final prescription")).toBeVisible();
  await expect(page.getByText("Demo medicine")).toBeVisible();
  await expect(page.getByText("Storage is not configured")).toBeVisible();
  await expect(page.getByText("Private assigned-doctor note")).toHaveCount(0);
  await expect(page.getByText("Patient private medical note")).toHaveCount(0);
  await expect(page.getByText("Draft care plan")).toHaveCount(0);
});

test("patient family health supports owned add, list, and remove interactions", async ({ page }) => {
  await setupPatientSession(page);
  let created = false;
  let removed = false;

  await page.route("**/api/user/family-members", async (route) => {
    if (route.request().method() === "POST") {
      created = true;
      return fulfillJson(route, {
        success: true,
        member: {
          _id: "family-1",
          name: "Family Contact",
          relationship: "Sibling",
          dob: "1998-01-20",
          consentScope: "No medical-record access is granted."
        }
      });
    }

    return fulfillJson(route, {
      success: true,
      members: created && !removed
        ? [
            {
              _id: "family-1",
              name: "Family Contact",
              relationship: "Sibling",
              dob: "1998-01-20",
              consentScope: "No medical-record access is granted."
            }
          ]
        : []
    });
  });
  await page.route("**/api/user/family-members/family-1", (route) => {
    removed = true;
    return fulfillJson(route, { success: true });
  });

  await page.goto("/family-health");
  await expect(page.getByRole("heading", { name: "Family health" })).toBeVisible();
  await page.getByLabel("Name").fill("Family Contact");
  await page.getByLabel("Relationship").fill("Sibling");
  await page.getByLabel("Date of birth").fill("1998-01-20");
  await page.getByRole("button", { name: "Save member" }).click();
  await expect(page.getByText("No medical-record access is granted.")).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("No family members have been added.")).toBeVisible();
});

test("patient health card renders a safe opaque QR lookup flow", async ({ page }) => {
  await setupPatientSession(page);
  const qrPayload = JSON.stringify({
    type: "medflow-health-card",
    version: 1,
    lookupId: "opaque_lookup_alpha_safe"
  });
  expect(qrPayload).not.toContain(patientProfile._id);
  expect(qrPayload).not.toContain("patient@example.com");
  expect(qrPayload).not.toContain("1234567890");

  await page.route("**/api/user/health-card", (route) =>
    fulfillJson(route, {
      success: true,
      card: {
        cardId: "MF-SAFE123456",
        lookupId: "opaque_lookup_alpha_safe",
        qrPayload,
        qrDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        patient: {
          name: "Patient One",
          image: "/profile_pic.png",
          bloodGroup: "O+",
          emergencyContact: { name: "Sam Patient", relationship: "Sibling", phone: "" }
        }
      }
    })
  );
  await page.route("**/api/user/health-card/lookup/opaque_lookup_alpha_safe", (route) =>
    fulfillJson(route, {
      success: true,
      status: {
        valid: true,
        cardId: "MF-SAFE123456",
        status: "active",
        message: "MedFlow health card exists. Sign in with an authorized account to view any health details."
      }
    })
  );

  await page.goto("/health-card");
  await expect(page.getByRole("heading", { name: "Health card" })).toBeVisible();
  await expect(page.getByAltText("Health card QR code")).toBeVisible();
  await page.getByRole("button", { name: "Verify QR lookup" }).click();
  await expect(page.getByText("Sign in with an authorized account")).toBeVisible();
  await expect(page.getByText(patientProfile._id)).toHaveCount(0);
  await expect(page.getByText("patient@example.com")).toHaveCount(0);
});

test("doctor portal creates finalized patient-visible records separately from private notes", async ({
  page
}) => {
  await setupPortalSession(page, "dToken");
  const savedRecords: unknown[] = [];

  await page.route("**/api/doctor/dashboard", (route) =>
    fulfillJson(route, { success: true, dashData: {} })
  );
  await page.route("**/api/doctor/appointments", (route) =>
    fulfillJson(route, {
      success: true,
      appointments: [
        {
          _id: "appointment-1",
          userData: { name: "Patient One", image: "/profile_pic.png", dob: "1994-06-12" },
          payment: true,
          amount: 650,
          slotDate: "2026-07-18",
          slotTime: "10:00",
          cancelled: false,
          isCompleted: true,
          clinicalNotes: "Private assigned-doctor note"
        }
      ]
    })
  );
  await page.route("**/api/doctor/appointments/appointment-1/medical-records", async (route) => {
    const payload = route.request().postDataJSON();
    savedRecords.push(payload);
    return fulfillJson(route, { success: true, message: "Medical record saved", record: payload }, 201);
  });

  await page.goto(`${portalBaseURL}/doctor-appointments`);
  await expect(page.getByText("Private assigned-doctor note")).toBeVisible();
  await expect(page.getByText("Patient-visible medical record")).toBeVisible();
  await page.getByRole("combobox").first().selectOption("prescription_plan");
  await page.getByPlaceholder("Record title").fill("Final prescription");
  await page.getByRole("combobox").nth(1).selectOption("finalized");
  await page.getByPlaceholder("Patient-visible summary").fill("Safe patient-facing summary");
  await page.getByPlaceholder("Medicine").fill("Demo medicine");
  await page.getByPlaceholder("Dosage").fill("5 mg");
  await page.getByPlaceholder("Frequency").fill("Once daily");
  await page.getByPlaceholder("Duration").fill("5 days");
  await page.getByRole("button", { name: "Save medical record" }).click();

  await expect.poll(() => savedRecords.length).toBe(1);
  expect(savedRecords[0]).toMatchObject({
    type: "prescription_plan",
    title: "Final prescription",
    summary: "Safe patient-facing summary",
    patientVisible: true,
    status: "finalized"
  });
  expect(JSON.stringify(savedRecords[0])).not.toContain("Private assigned-doctor note");
});

test("admin medical-record overview is routed under portal auth and excludes clinical notes", async ({
  page
}) => {
  await setupPortalSession(page, "aToken");
  await page.route("**/api/admin/medical-records**", (route) =>
    fulfillJson(route, {
      success: true,
      records: [
        {
          _id: "record-1",
          patientId: "000000000000000000000001",
          type: "consultation_summary",
          title: "Final summary",
          summary: "Tenant-scoped finalized record.",
          status: "finalized",
          patientVisible: true,
          author: { displayName: "Dr. Secure" }
        }
      ]
    })
  );

  await page.goto(`${portalBaseURL}/medical-records`);
  await expect(page.getByRole("heading", { name: "Medical records" })).toBeVisible();
  await expect(page.getByText("Final summary")).toBeVisible();
  await expect(page.getByText("Tenant-scoped finalized record.")).toBeVisible();
  await expect(page.getByText("Private assigned-doctor note")).toHaveCount(0);
});
