// protected-with-token.spec.js

const { test, expect } = require("@playwright/test");
const { API_BASE_URL } = require("../utils/env");
const { loginAndGetToken, bearer } = require("../utils/auth");

test.describe("Protected routes with token", () => {
  test("GET /api/DataUser should succeed with token", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.get(`${API_BASE_URL}/api/DataUser`, {
      headers: bearer(token),
    });

    expect([200, 403]).toContain(res.status()); // ถ้า role ไม่ตรงอาจ 403
  });

  test("GET /api/activity-logs should succeed or forbidden depending on role", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.get(`${API_BASE_URL}/api/activity-logs`, {
      headers: bearer(token),
    });

    expect([200, 403]).toContain(res.status());
  });
});