// const { test, expect } = require("@playwright/test");
// const { loginAndGetToken, bearer } = require("../utils/auth");

// const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8080";

// test.describe("Core flows (read-only)", () => {
//   test("GET /api/DataRoomexam should return 200", async ({ request }) => {
//     const token = await loginAndGetToken(request);

//     const res = await request.get(`${API_BASE_URL}/api/DataRoomexam`, {
//       headers: bearer(token),
//     });

//     expect(res.status()).toBe(200);

//     const text = await res.text();
//     expect(text.length).toBeGreaterThan(0);
//   });

//   test("GET /api/GetProctorNames should return 200", async ({ request }) => {
//     const token = await loginAndGetToken(request);

//     const res = await request.get(`${API_BASE_URL}/api/GetProctorNames`, {
//       headers: bearer(token),
//     });

//     expect(res.status()).toBe(200);

//     const text = await res.text();
//     expect(text.length).toBeGreaterThan(0);
//   });
// });