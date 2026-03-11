// protected-requires-auth.spec.js

const { test, expect } = require("@playwright/test");
const { API_BASE_URL } = require("../utils/env");

function isAuthBlocked(status) {
  return status === 401 || status === 403;
}

test.describe("Protected routes require auth", () => {
  test("GET /api/teacher/GetExamtable blocked without token", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/teacher/GetExamtable`);
    expect(isAuthBlocked(res.status())).toBeTruthy();
  });

  test("GET /api/proctor/GetExamtableProctor blocked without token", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/proctor/GetExamtableProctor`);
    expect(isAuthBlocked(res.status())).toBeTruthy();
  });

  test("GET /api/DataUser blocked without token", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/DataUser`);
    expect(isAuthBlocked(res.status())).toBeTruthy();
  });

  test("GET /api/activity-logs blocked without token", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/activity-logs`);
    expect(isAuthBlocked(res.status())).toBeTruthy();
  });
});