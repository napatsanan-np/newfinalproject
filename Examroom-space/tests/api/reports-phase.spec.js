const { test, expect } = require("@playwright/test");
const { loginAndGetToken, bearer } = require("../utils/auth");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8080";

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getPhaseEnv() {
  return process.env.TEST_PHASE || "midterm";
}

function getYearSemester() {
  return {
    academicYear: process.env.TEST_ACADEMIC_YEAR,
    semester: process.env.TEST_SEMESTER,
  };
}

function skipIfMissingYearSemester() {
  const { academicYear, semester } = getYearSemester();
  test.skip(!academicYear || !semester, "Missing TEST_ACADEMIC_YEAR or TEST_SEMESTER in .env.test");
  return { academicYear, semester };
}

function assertReportResponse(res, text, endpointName) {
  expect(
    [200, 204, 400, 404, 422, 500].includes(res.status()),
    `${endpointName} unexpected status=${res.status()} body=${text}`
  ).toBeTruthy();

  expect([401, 403, 405]).not.toContain(res.status());

  if (res.status() === 200) {
    expect(text.length).toBeGreaterThan(0);
    const body = parseJsonSafe(text);
    expect(body).toBeTruthy();
  }
}

test.describe("Phase-based reports API", () => {
  test("GET /api/reports/paper-usage/:academic_year/:semester/:phase should respond", async ({ request }) => {
    const { academicYear, semester } = skipIfMissingYearSemester();
    const phase = getPhaseEnv();
    const token = await loginAndGetToken(request);

    const res = await request.get(
      `${API_BASE_URL}/api/reports/paper-usage/${encodeURIComponent(academicYear)}/${encodeURIComponent(semester)}/${encodeURIComponent(phase)}`,
      { headers: bearer(token) }
    );

    const text = await res.text();
    assertReportResponse(res, text, "paper-usage phase");
  });

  test("GET /api/reports/exam-submissions/:academic_year/:semester/:phase should respond", async ({ request }) => {
    const { academicYear, semester } = skipIfMissingYearSemester();
    const phase = getPhaseEnv();
    const token = await loginAndGetToken(request);

    const res = await request.get(
      `${API_BASE_URL}/api/reports/exam-submissions/${encodeURIComponent(academicYear)}/${encodeURIComponent(semester)}/${encodeURIComponent(phase)}`,
      { headers: bearer(token) }
    );

    const text = await res.text();
    assertReportResponse(res, text, "exam-submissions phase");
  });

  test("GET /api/reports/proctor-stats/:academic_year/:semester/phase/:phase should respond", async ({ request }) => {
    const { academicYear, semester } = skipIfMissingYearSemester();
    const phase = getPhaseEnv();
    const token = await loginAndGetToken(request);

    const res = await request.get(
      `${API_BASE_URL}/api/reports/proctor-stats/${encodeURIComponent(academicYear)}/${encodeURIComponent(semester)}/phase/${encodeURIComponent(phase)}`,
      { headers: bearer(token) }
    );

    const text = await res.text();
    assertReportResponse(res, text, "proctor-stats phase");
  });

  
});