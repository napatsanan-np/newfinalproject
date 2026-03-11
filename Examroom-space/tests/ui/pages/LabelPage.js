const { expect } = require("@playwright/test");

class LabelPage {
  constructor(page) {
    this.page = page;

    this.tabLabelTime = page
      .locator('.nav-link:has-text("ซองข้อสอบช่วงเวลาการสอบ")')
      .first();

    this.tabLabelDefault = page
      .locator('.nav-link:has-text("ซองที่แสดงรหัสวิชา")')
      .first();

    this.tabSignature = page
      .locator('.nav-link:has-text("สำหรับใบรับ-ส่งข้อสอบ")')
      .first();

    this.tabStudent = page
      .locator('.nav-link:has-text("ใบเซ็นชื่อนักศึกษา")')
      .first();

    this.heading = page.getByRole("heading", {
      name: /ซองข้อสอบช่วงเวลาการสอบ/i,
    });

    this.courseLabel = page.locator("label").filter({ hasText: "รายวิชา" }).first();
    this.roomLabel = page.locator("label").filter({ hasText: "ห้องสอบ" }).first();
    this.qtyInput = page.locator('input[type="number"]').first();

    this.btnReset = page.getByRole("button", { name: "ล้าง" });
    this.btnPrint = page.getByRole("button", { name: "พิมพ์ซองข้อสอบ" });

    this.alert = page.locator(".alert").first();
  }

  async bootstrap() {
    await this.page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("API", "http://127.0.0.1:8080/api");
      localStorage.setItem("token", "mock-token");
      localStorage.setItem("roles", JSON.stringify(["Admin"]));
      localStorage.setItem(
        "user",
        JSON.stringify({ username: "Admin1", roles: ["Admin"] })
      );
      window.API_URL = "http://127.0.0.1:8080/api";
      window.User = { username: "Admin1", roles: ["Admin"] };
    });
  }

  async goto() {
    await this.page.goto("/Label");
    await this.page.waitForLoadState("networkidle");
    await expect(this.tabLabelTime).toBeVisible({ timeout: 10000 });
  }

  async clickReset() {
    await this.btnReset.click();
  }

  async clickPrint() {
    await this.btnPrint.click();
  }

  text(text) {
    return this.page.locator(`text=${text}`).first();
  }
}

module.exports = { LabelPage };