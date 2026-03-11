const { expect } = require("@playwright/test");

class ProctorAssignerPage {
  constructor(page) {
    this.page = page;

    this.header = page.getByRole("heading", {
      name: /นำเข้าข้อมูลกรรมการคุมสอบ xlsx/i,
    });

    this.tabUpload = page
      .locator('.nav-link:has-text("นำเข้าข้อมูลกรรมการคุมสอบ xlsx")')
      .first();

    this.fileInput = page.locator('input[type="file"]').first();

    this.btnUpload = page
      .locator("button")
      .filter({ hasText: /อัพโหลดไฟล์|อัปโหลดไฟล์/i })
      .first();

    this.swalPopup = page.locator(".swal2-popup");
    this.swalConfirm = page.locator(".swal2-confirm");
    this.swalCancel = page.locator(".swal2-cancel");
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
    await this.page.goto("/ProctorAsigner");
    await this.page.waitForLoadState("networkidle");
    await expect(this.header).toBeVisible({ timeout: 10000 });
  }

  async clickUploadTab() {
    await this.tabUpload.click();
    await this.fileInput.waitFor({ state: "attached" });
  }

  async chooseFile(filePath) {
    await this.fileInput.setInputFiles(filePath);
  }

  async clickUpload() {
    await this.btnUpload.click();
  }

  async confirmSwal() {
    await this.swalConfirm.click();
  }

  async cancelSwal() {
    await this.swalCancel.click();
  }
}

module.exports = { ProctorAssignerPage };