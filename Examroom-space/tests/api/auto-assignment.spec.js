// const { test, expect } = require("@playwright/test");
// const { API_BASE_URL } = require("../utils/env");
// const { loginAndGetToken, bearer } = require("../utils/auth");

// function parsePayload(envKey, fallback = {}) {
//   const raw = process.env[envKey];
//   if (!raw) return fallback;

//   try {
//     return JSON.parse(raw);
//   } catch (e) {
//     throw new Error(`${envKey} must be valid JSON. Received: ${raw}`);
//   }
// }

// function assertAuthenticatedEndpointExists(status, bodyText, endpointName) {
//   expect(
//     ![401, 403, 404, 405].includes(status),
//     `${endpointName} should exist and accept authenticated requests. status=${status} body=${bodyText}`
//   ).toBeTruthy();
// }

// function assertAssignmentStatus(status, bodyText, endpointName, hasExplicitPayload) {
//   if (hasExplicitPayload) {
//     expect(
//       [200, 201, 204].includes(status),
//       `${endpointName} expected success with explicit payload. status=${status} body=${bodyText}`
//     ).toBeTruthy();
//     return;
//   }

//   // ไม่มี schema controller จริง จึงทำ smoke test ที่เข้มพอสมควร:
//   // route ต้องมีจริง, auth ต้องผ่าน, ถ้า payload ไม่ครบควรเป็น validation error มากกว่า 404/405/401/403
//   expect(
//     [200, 201, 204, 400, 422].includes(status),
//     `${endpointName} returned unexpected status. status=${status} body=${bodyText}`
//   ).toBeTruthy();
// }

// test.describe("Auto assignment API", () => {
//   test("POST /api/AutoExamRoom blocked without token", async ({ request }) => {
//     const res = await request.post(`${API_BASE_URL}/api/AutoExamRoom`, {
//       data: {},
//     });

//     expect([401, 403]).toContain(res.status());
//   });

//   test("POST /api/AutoProctor blocked without token", async ({ request }) => {
//     const res = await request.post(`${API_BASE_URL}/api/AutoProctor`, {
//       data: {},
//     });

//     expect([401, 403]).toContain(res.status());
//   });

//   test("POST /api/AutoExamRoom should respond when authenticated", async ({ request }) => {
//     const token = await loginAndGetToken(request);
//     const hasExplicitPayload = !!process.env.AUTO_EXAM_ROOM_PAYLOAD_JSON;
//     const payload = parsePayload("AUTO_EXAM_ROOM_PAYLOAD_JSON", {});

//     const res = await request.post(`${API_BASE_URL}/api/AutoExamRoom`, {
//       headers: bearer(token),
//       data: payload,
//     });

//     const text = await res.text();

//     assertAuthenticatedEndpointExists(res.status(), text, "AutoExamRoom");
//     assertAssignmentStatus(res.status(), text, "AutoExamRoom", hasExplicitPayload);
//   });

//   test("POST /api/AutoProctor should respond when authenticated", async ({ request }) => {
//     const token = await loginAndGetToken(request);
//     const hasExplicitPayload = !!process.env.AUTO_PROCTOR_PAYLOAD_JSON;
//     const payload = parsePayload("AUTO_PROCTOR_PAYLOAD_JSON", {});

//     const res = await request.post(`${API_BASE_URL}/api/AutoProctor`, {
//       headers: bearer(token),
//       data: payload,
//     });

//     const text = await res.text();

//     assertAuthenticatedEndpointExists(res.status(), text, "AutoProctor");
//     assertAssignmentStatus(res.status(), text, "AutoProctor", hasExplicitPayload);
//   });
// });