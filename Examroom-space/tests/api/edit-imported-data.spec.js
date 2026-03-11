const { test, expect } = require("@playwright/test");
const { API_BASE_URL } = require("../utils/env");
const { loginAndGetToken, bearer } = require("../utils/auth");

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function assertReadableResponse(res, text, endpointName) {
  expect(
    [200, 204].includes(res.status()),
    `${endpointName} unexpected status=${res.status()} body=${text}`
  ).toBeTruthy();

  if (res.status() === 200) {
    expect(text.trim().length).toBeGreaterThan(0);
  }
}

function assertBodyIsUsable(text) {
  const body = parseJsonSafe(text);

  // ถ้า parse JSON ได้ ถือว่าผ่าน
  if (body !== null) {
    expect(body).toBeTruthy();
    return;
  }

  // ถ้าไม่ใช่ JSON แต่เป็น text ที่ไม่ว่าง ก็ถือว่าผ่าน
  expect(text.trim().length).toBeGreaterThan(0);
}

test.describe("Edit imported data read APIs", () => {
  test("GET /api/select_data/detail_exam_all should return 200/204", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.get(`${API_BASE_URL}/api/select_data/detail_exam_all`, {
      headers: bearer(token),
    });

    const text = await res.text();
    console.log("detail_exam_all status =", res.status());
    console.log("detail_exam_all body =", text);

    assertReadableResponse(res, text, "detail_exam_all");

    if (res.status() === 200) {
      assertBodyIsUsable(text);
    }
  });

  test("GET /api/select_data/examtable_all should return 200/204", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.get(`${API_BASE_URL}/api/select_data/examtable_all`, {
      headers: bearer(token),
    });

    const text = await res.text();
    console.log("examtable_all status =", res.status());
    console.log("examtable_all body =", text);

    assertReadableResponse(res, text, "examtable_all");

    if (res.status() === 200) {
      assertBodyIsUsable(text);
    }
  });

  test("GET /api/select_data/roomexam_all should return 200/204", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.get(`${API_BASE_URL}/api/select_data/roomexam_all`, {
      headers: bearer(token),
    });

    const text = await res.text();
    console.log("roomexam_all status =", res.status());
    console.log("roomexam_all body =", text);

    assertReadableResponse(res, text, "roomexam_all");

    if (res.status() === 200) {
      assertBodyIsUsable(text);
    }
  });
});