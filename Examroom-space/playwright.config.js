require("dotenv").config({ path: ".env.test" });

const { defineConfig, devices } = require("@playwright/test");

const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: "./tests",
  reporter: [["html", { open: "always" }]],

  // timeout รวมต่อ 1 test case
  timeout: 60_000,

  // timeout ของ expect
  expect: {
    timeout: 10_000,
  },

  // รายงานผล
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],

  // ถ้า CI ให้ fail เร็วขึ้น
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  use: {
    baseURL: process.env.WEB_BASE_URL || "http://localhost:3000",

    // local จะเปิด browser ให้ดูได้ถ้าอยาก debug
    // CI จะรันแบบ headless อัตโนมัติ
    headless: isCI ? true : false,

    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",

    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  // ถ้ามี frontend ต้องเปิดก่อนเทส ให้ Playwright เปิดเอง
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || "npm run dev -- --host --port 3000",
    url: process.env.WEB_BASE_URL || "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});