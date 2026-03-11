// role-access.spec.js

const { test, expect } = require("@playwright/test");
const {
  API_BASE_URL,
  TEST_TEACHER_USERNAME,
  TEST_TEACHER_PASSWORD,
  TEST_PROCTOR_USERNAME,
  TEST_PROCTOR_PASSWORD,
  TEST_ADMIN_USERNAME,
  TEST_ADMIN_PASSWORD,
  TEST_USERNAME,
  TEST_PASSWORD,
} = require("../utils/env");
const { loginAndGetToken, bearer } = require("../utils/auth");

test.describe("Role access control", () => {
  test("TEACHER can access /api/teacher but not /api/proctor", async ({ request }) => {
    test.skip(!TEST_TEACHER_USERNAME || !TEST_TEACHER_PASSWORD, "Missing teacher creds");

    const token = await loginAndGetToken(request, TEST_TEACHER_USERNAME, TEST_TEACHER_PASSWORD);

    const okRes = await request.get(`${API_BASE_URL}/api/teacher/GetExamtable`, { headers: bearer(token) });
    expect([200, 204]).toContain(okRes.status());

    const deniedRes = await request.get(`${API_BASE_URL}/api/proctor/GetExamtableProctor`, { headers: bearer(token) });
    expect(deniedRes.status()).toBe(403);
  });

  test("PROCTOR can access /api/proctor but not /api/teacher", async ({ request }) => {
    test.skip(!TEST_PROCTOR_USERNAME || !TEST_PROCTOR_PASSWORD, "Missing proctor creds");

    const token = await loginAndGetToken(request, TEST_PROCTOR_USERNAME, TEST_PROCTOR_PASSWORD);

    const okRes = await request.get(`${API_BASE_URL}/api/proctor/GetExamtableProctor`, { headers: bearer(token) });
    expect([200, 204]).toContain(okRes.status());

    const deniedRes = await request.get(`${API_BASE_URL}/api/teacher/GetExamtable`, { headers: bearer(token) });
    expect(deniedRes.status()).toBe(403);
  });

  test("ADMIN can access /api/DataUser", async ({ request }) => {
    const adminU = TEST_ADMIN_USERNAME || TEST_USERNAME;
    const adminP = TEST_ADMIN_PASSWORD || TEST_PASSWORD;
    test.skip(!adminU || !adminP, "Missing admin creds");

    const token = await loginAndGetToken(request, adminU, adminP);
    const res = await request.get(`${API_BASE_URL}/api/DataUser`, { headers: bearer(token) });
    expect(res.status()).toBe(200);
  });
});