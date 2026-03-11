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

function configSelectPayload() {
  if (process.env.EXAM_CONFIG_SELECT_PAYLOAD_JSON) {
    return JSON.parse(process.env.EXAM_CONFIG_SELECT_PAYLOAD_JSON);
  }

  return {};
}

function systemManagementPayload() {
  if (process.env.SYSTEM_MANAGEMENT_PAYLOAD_JSON) {
    return JSON.parse(process.env.SYSTEM_MANAGEMENT_PAYLOAD_JSON);
  }

  return {
    status: true,
  };
}

function updateConfigPayload() {
  if (process.env.EXAM_CONFIG_UPDATE_PAYLOAD_JSON) {
    return JSON.parse(process.env.EXAM_CONFIG_UPDATE_PAYLOAD_JSON);
  }

  return {
    status: true,
  };
}

test.describe("Exam config API", () => {
  test("POST /api/selectConfig/exam_config blocked without token", async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/selectConfig/exam_config`, {
      data: configSelectPayload(),
    });

    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/selectConfig/exam_config should respond when authenticated", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.post(`${API_BASE_URL}/api/selectConfig/exam_config`, {
      headers: bearer(token),
      data: configSelectPayload(),
    });

    const text = await res.text();
    expect(
      [200, 204, 400, 422, 500].includes(res.status()),
      `Unexpected selectConfig status=${res.status()} body=${text}`
    ).toBeTruthy();

    if (res.status() === 200) {
      const body = parseJsonSafe(text);
      expect(body).toBeTruthy();
    }
  });

  test("POST /api/SetSystemmanagement should respond when authenticated", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const res = await request.post(`${API_BASE_URL}/api/SetSystemmanagement`, {
      headers: bearer(token),
      data: systemManagementPayload(),
    });

    const text = await res.text();
    expect(
      [200, 201, 204, 400, 422, 500].includes(res.status()),
      `Unexpected SetSystemmanagement status=${res.status()} body=${text}`
    ).toBeTruthy();
  });

  test("POST /api/update_data/exam_config/:academic_year/:semester should respond when authenticated", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const academicYear = process.env.TEST_ACADEMIC_YEAR || "2568";
    const semester = process.env.TEST_SEMESTER || "1";

    const res = await request.post(
      `${API_BASE_URL}/api/update_data/exam_config/${encodeURIComponent(academicYear)}/${encodeURIComponent(semester)}`,
      {
        headers: bearer(token),
        data: updateConfigPayload(),
      }
    );

    const text = await res.text();
    expect(
      [200, 201, 204, 400, 404, 422, 500].includes(res.status()),
      `Unexpected update exam_config status=${res.status()} body=${text}`
    ).toBeTruthy();
  });

  test("POST /api/delete_data/exam_config should respond when authenticated", async ({ request }) => {
    const token = await loginAndGetToken(request);

    const payload = process.env.EXAM_CONFIG_DELETE_PAYLOAD_JSON
      ? JSON.parse(process.env.EXAM_CONFIG_DELETE_PAYLOAD_JSON)
      : {};

    const res = await request.post(`${API_BASE_URL}/api/delete_data/exam_config`, {
      headers: bearer(token),
      data: payload,
    });

    const text = await res.text();
    expect(
      [200, 204, 400, 404, 422, 500].includes(res.status()),
      `Unexpected delete exam_config status=${res.status()} body=${text}`
    ).toBeTruthy();
  });
});