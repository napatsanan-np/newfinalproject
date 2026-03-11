const { test, expect } = require("@playwright/test");
const { LoginPage } = require("./pages/LoginPage");

test.describe("Login Page UI", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.clearStorageAndSetAPI();
    await loginPage.goto();
  });

  test("ไม่กรอกข้อมูลแล้วกดล็อกอิน", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.submit();
    await loginPage.expectSwalContains("ข้อมูลไม่ครบ");
  });

  test("Login สำเร็จ", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.unroute("**/api/login").catch(() => {});
    await page.route("**/api/login", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-token",
          user: { username: "Admin1", roles: ["Admin"] },
        }),
      });
    });

    await loginPage.fill("Admin1", "1234");
    await loginPage.submit();

    await expect(page).toHaveURL(/\/Home$/, { timeout: 5000 });
  });

  test("Login ผิด", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.unroute("**/api/login").catch(() => {});
    await page.route("**/api/login", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Name หรือ Password ไม่ถูกต้อง กรุณาลองอีกครั้ง",
        }),
      });
    });

    await loginPage.fill("wrong", "wrong");
    await loginPage.submit();

    await loginPage.expectSwalContains("ล็อกอินไม่สำเร็จ");
  });
});