// login-negative.spec.js

const { test, expect } = require("@playwright/test");
const { API_BASE_URL, TEST_USERNAME } = require("../utils/env");

test("Login should fail with wrong password", async ({ request }) => {
  expect(TEST_USERNAME).toBeTruthy();

  const res = await request.post(`${API_BASE_URL}/api/login`, {
    data: { username: TEST_USERNAME, password: "wrong_password" },
  });

  expect([400, 401, 403]).toContain(res.status());
});