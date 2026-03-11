// tests/ui/pages/PageformPage.js
const { expect } = require("@playwright/test");

class PageformPage {
  constructor(page) {
    this.page = page;

    // ✅ fix strict mode: เจาะ label เท่านั้น
    this.courseLabel = page.locator('label:has-text("ชื่อวิชา")').first();

    // ✅ react-select: ใช้ input ด้านใน (เสถียรสุด)
    // จาก error ของคุณมี id="react-select-2-placeholder" แปลว่าเป็น react-select แน่
    this.courseInput = page.locator('[id^="react-select-"][id$="-input"]');
    // fallback เผื่อ class-based
    this.courseInputFallback = page.locator(".react-select__input input").first();

    // ช่องอื่น ๆ
    this.refInput = page.locator('input[name="Ref"]');
    this.examDate = page.locator('input[name="eDate"]');
    this.examTime = page.locator('input[name="eTime"]');
    this.examRoom = page.locator('input[name="examRoom"]');
    this.hr = page.locator('input[name="hr"]');
    this.noSt = page.locator('input[name="NoSt"]');
    this.submitStatus = page.locator('input[name="submit"]');

    this.noExamCheckbox = page.getByRole("checkbox", { name: "มีสอบแต่ไม่มีข้อสอบส่ง" });
    this.submitBtn = page.getByRole("button", { name: "ส่งข้อสอบ", exact: true });

    this.requiredAlert = page.locator(".alert.alert-danger, .alert-danger");
  }

  async clearStorageAndSetAPI() {
    await this.page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("API", "http://127.0.0.1:8080/api");

      // ให้ผ่าน ProtectRoutes
      localStorage.setItem("token", "mock-token");
      localStorage.setItem("roles", JSON.stringify(["Admin"]));
      localStorage.setItem("user", JSON.stringify({ username: "Admin1", roles: ["Admin"] }));

      // กันบางหน้าที่อ่าน window.User
      window.User = { username: "Admin1", roles: ["Admin"] };
    });
  }

  async goto() {
    await this.page.goto("/Pageform", { waitUntil: "domcontentloaded" });
    await expect(this.page).toHaveURL(/\/Pageform/i, { timeout: 15000 });

    // ✅ รอ label จริง ๆ ของฟอร์ม
    await expect(this.courseLabel).toBeVisible({ timeout: 15000 });
  }

  async selectCourseByLabel(labelText) {
    // react-select บางที input ยังไม่โผล่ทันที ให้ fallback
    const input =
      (await this.courseInput.count()) > 0 ? this.courseInput.first() : this.courseInputFallback;

    // focus input (คลิก label หรือพื้นที่ใกล้ ๆ แล้วค่อยพิมพ์)
    await this.courseLabel.click({ force: true });

    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(labelText);

    // option จะอยู่ใน menu listbox
    const option = this.page.locator('[role="option"]').filter({ hasText: labelText }).first();

    if ((await option.count()) > 0) {
      await expect(option).toBeVisible({ timeout: 5000 });
      await option.click();
    } else {
      // fallback: เลือกตัวแรก
      await this.page.keyboard.press("Enter");
    }
  }

  async submit() {
    await this.submitBtn.click();
  }
}

module.exports = { PageformPage };