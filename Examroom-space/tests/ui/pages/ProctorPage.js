class ProctorPage {

  constructor(page) {
    this.page = page;

    this.searchInput = page.getByPlaceholder("ค้นหาตามชื่อหรือภาควิชา");

    this.addButton = page.getByRole("button", {
      name: "เพิ่มกรรมการห้องอำนวยการสอบ"
    });

    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/CommitteeManagement");

    await this.searchInput.waitFor({ state: "visible" });
  }

  async search(name) {
    await this.searchInput.fill(name);
  }

}

module.exports = { ProctorPage };