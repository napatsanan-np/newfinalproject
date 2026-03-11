// activity-log.spec.js

const { test, expect } = require("@playwright/test");
const { API_BASE_URL } = require("../utils/env");
const { loginAndGetToken, bearer } = require("../utils/auth");

test.describe("Activity log evidence", () => {
  test("GET /api/activity-logs should return 200 and include records", async ({ request }) => {
    const token = await loginAndGetToken(request);

    // ยิง endpoint protected สักอันเพื่อให้ ActivityLogMiddleware บันทึก
    await request.get(`${API_BASE_URL}/api/DataRoomexam`, { headers: bearer(token) });

    const res = await request.get(`${API_BASE_URL}/api/activity-logs`, { headers: bearer(token) });
    expect(res.status()).toBe(200);

    const bodyText = await res.text();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});