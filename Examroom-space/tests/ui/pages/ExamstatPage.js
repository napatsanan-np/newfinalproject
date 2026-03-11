const { expect } = require("@playwright/test");

class ExamstatPage {
  constructor(page) {
    this.page = page;

    this.yearSelect = page.locator(".examstat-select").nth(0);
    this.semesterSelect = page.locator(".examstat-select").nth(1);
    this.phaseSelect = page.locator(".examstat-select").nth(2);

    this.btnShow = page.getByRole("button", { name: "แสดงข้อมูล" });

    this.chart = page.locator(".recharts-wrapper").first();

    this.total = page.locator(".summary-stats .stats-card").nth(0);
    this.submitted = page.locator(".summary-stats .stats-card").nth(1);
    this.pending = page.locator(".summary-stats .stats-card").nth(2);

    this.errorAlert = page.locator(".alert-danger");
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
    });
  }

  async goto() {
    await this.page.goto("/report-stats");
    await this.page.waitForLoadState("networkidle");
    await expect(this.btnShow).toBeVisible({ timeout: 10000 });
  }

  async selectYear(text) {
    await this.yearSelect.click();
    await this.page.getByRole("option", { name: text, exact: true }).click();
  }

  async selectSemester(text) {
    await this.semesterSelect.click();
    await this.page.getByRole("option", { name: text, exact: true }).click();
  }

  async selectPhase(text) {
    await this.phaseSelect.click();
    await this.page.getByRole("option", { name: text, exact: true }).click();
  }

  async clickShow() {
    await this.btnShow.click();
  }
}

module.exports = { ExamstatPage };