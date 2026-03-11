const { expect } = require("@playwright/test");

class SystemManagementPage {

  baseURL = "http://localhost:3000/SystemManagement";

  constructor(page) {
    this.page = page;

    this.academicYear = page.locator("#academic_year");
    this.semester = page.locator("#semester");
    this.phase = page.locator("#phase");

    this.saveButton = page.getByRole("button", { name: "บันทึกการตั้งค่าเวลา" });
    this.detailButton = page.getByRole("button", { name: "ดูรายละเอียด" });
  }

  async goto() {
    await this.page.goto(this.baseURL);
  }

  async selectAcademicYear() {
    await this.academicYear.selectOption({ index: 1 });
  }

  async selectSemester() {
    await this.semester.selectOption({ index: 1 });
  }

  async selectPhase() {
    await this.phase.selectOption({ index: 1 });
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickDetail() {
    await this.detailButton.click();
  }

}

module.exports = { SystemManagementPage };