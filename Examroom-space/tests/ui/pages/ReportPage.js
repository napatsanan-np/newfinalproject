const { expect } = require("@playwright/test");

class ReportPage {
  constructor(page) {
    this.page = page;

    this.yearSelect = page.locator(".basic-select").nth(0);
    this.semesterSelect = page.locator(".basic-select").nth(1);
    this.phaseSelect = page.locator(".basic-select").nth(2);

    this.chart = page.locator(".recharts-wrapper").first();

    this.totalPages = page.getByText("จำนวนแผ่นรวมทั้งหมด");
    this.totalCourses = page.getByText("จำนวนวิชาทั้งหมด");
    this.totalDepartments = page.getByText("จำนวนภาควิชา");

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
    await this.page.goto("/report");
    await this.page.waitForLoadState("networkidle");
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
}

module.exports = { ReportPage };