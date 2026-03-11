const { test, expect } = require("@playwright/test");
const { SystemManagementPage } = require("./pages/SystemManagementPage");

test.describe("SystemManagement UI", () => {

  test.beforeEach(async ({ page }) => {

    // mock login
    await page.addInitScript(() => {
      localStorage.setItem("token", "mock-token");
      localStorage.setItem("API", "http://localhost:8080/api");
    });

  });

  test("โหลดหน้า SystemManagement ได้", async ({ page }) => {

    const sm = new SystemManagementPage(page);

    await sm.goto();

    await expect(page.locator("#academic_year")).toBeVisible();
  });


  test("เลือกปี ภาค phase แล้วกดบันทึก", async ({ page }) => {

    const sm = new SystemManagementPage(page);

    await sm.goto();

    await sm.selectAcademicYear();
    await sm.selectSemester();
    await sm.selectPhase();

    await sm.clickSave();

  });


  test("กดดูรายละเอียด", async ({ page }) => {

    const sm = new SystemManagementPage(page);

    await sm.goto();

    await sm.clickDetail();

    await expect(page).toHaveURL(/TimeSettingsModal/);

  });

});