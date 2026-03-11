// login-and-token.spec.js

const { test, expect } = require("@playwright/test");
const { API_BASE_URL, TEST_USERNAME, TEST_PASSWORD } = require("../utils/env");

test.describe("Auth: login and use token", () => {
  test("POST /api/login returns token", async ({ request }) => {
    expect(TEST_USERNAME).toBeTruthy();
    expect(TEST_PASSWORD).toBeTruthy();

    const res = await request.post(`${API_BASE_URL}/api/login`, {
      data: { username: TEST_USERNAME, password: TEST_PASSWORD },
    });

    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(10);

    expect(body.user).toBeTruthy();
    expect(body.user.username).toBeTruthy();
    expect(Array.isArray(body.user.roles)).toBeTruthy();
  });

  test("Protected route should be blocked without token", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/DataUser`);
    expect([401, 403]).toContain(res.status());
  });
});