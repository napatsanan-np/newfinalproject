const { test, expect } = require("@playwright/test");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8080";

test("GET /health should be reachable", async ({ request }) => {
  const res = await request.get(`${API_BASE_URL}/health`);

  console.log("health status =", res.status());
  const txt = await res.text();
  console.log("health body =", txt);

  expect([200, 204]).toContain(res.status());
});