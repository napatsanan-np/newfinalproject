const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;

    this.username = page.locator("#username");
    this.password = page.locator("#password");
    this.loginButton = page.locator("#login_button");

    //  เพิ่ม locator ของ sweetalert
    this.swalPopup = page.locator(".swal2-popup");
  }

  async clearStorageAndSetAPI() {
    await this.page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("API", "http://127.0.0.1:8080/api");
    });
  }

  async goto() {
    await this.page.goto("/");
    await this.page.waitForSelector("#username", { timeout: 5000 });
  }

  async fill(username, password) {
    await this.username.fill(username);
    await this.password.fill(password);
  }

  async submit() {
    await this.loginButton.click();
  }

  //  เพิ่ม method 
  async expectSwalContains(text) {
    await expect(this.swalPopup).toBeVisible({ timeout: 5000 });
    await expect(this.swalPopup).toContainText(text);
  }
}

module.exports = { LoginPage };