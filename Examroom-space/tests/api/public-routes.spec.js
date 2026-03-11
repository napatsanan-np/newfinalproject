//public-routes.spec.js

const { test, expect } = require("@playwright/test");
const { API_BASE_URL } = require("../utils/env");

test.describe("Public API routes", () => {
  // test("GET /api/sso/login should exist (not 404)", async ({ request }) => {
  //   const res = await request.get(`${API_BASE_URL}/api/sso/login`);
  //   expect(res.status()).not.toBe(404);
  // });

  test("GET /api/callback should exist (not 404)", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/callback`);
    expect(res.status()).not.toBe(404);
  });

  test("POST /api/login should exist (not 404)", async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/login`, { data: {} });
    expect(res.status()).not.toBe(404);
  });
});