// tests/ui/pages/DeptPage.js
import { expect } from "@playwright/test";

export default class DeptPage {
  constructor(page) {
    this.page = page;

    // หน้า
    this.title = page.getByRole("heading", { name: "จัดการข้อมูลภาควิชา" }); // :contentReference[oaicite:1]{index=1}

    // ปุ่มเปิด modal เพิ่มภาควิชา
    this.openAddBtn = page.getByRole("button", { name: /เพิ่มภาควิชา/ }); // ปุ่มเขียว “เพิ่มภาควิชา” :contentReference[oaicite:2]{index=2}

    // ตาราง
    this.table = page.locator("table");

    // Notification alert (bootstrap alert)
    this.alert = page.getByRole("alert");

    // Modal: เพิ่มภาควิชาใหม่
    this.addDialog = page.getByRole("dialog"); // จะ scope ตอนใช้จริง
    this.addModalTitle = page.getByRole("dialog").getByText("เพิ่มภาควิชาใหม่"); // :contentReference[oaicite:3]{index=3}
    this.addNameInput = page.getByRole("dialog").getByPlaceholder("กรอกชื่อภาควิชา"); // :contentReference[oaicite:4]{index=4}
    this.addSaveBtn = page.getByRole("dialog").getByRole("button", { name: "บันทึก", exact: true }); // :contentReference[oaicite:5]{index=5}
    this.addCloseBtn = page.getByRole("dialog").getByRole("button", { name: "ปิด", exact: true }); // :contentReference[oaicite:6]{index=6}

    // Modal: แก้ไขภาควิชา
    this.editModalTitle = page.getByRole("dialog").getByText("แก้ไขภาควิชา"); // :contentReference[oaicite:7]{index=7}
    this.editNameInput = page.getByRole("dialog").getByPlaceholder("กรอกชื่อภาควิชา"); // :contentReference[oaicite:8]{index=8}
    this.deptCodeInput = page.getByRole("dialog").getByPlaceholder("กรอกรหัสกลุ่ม"); // :contentReference[oaicite:9]{index=9}
    this.deptCodeAddBtn = page.getByRole("dialog").getByRole("button", { name: "เพิ่ม", exact: true }); // :contentReference[oaicite:10]{index=10}
    this.editSaveBtn = page.getByRole("dialog").getByRole("button", { name: "บันทึก", exact: true }); // :contentReference[oaicite:11]{index=11}
  }

  async clearStorageAndSetAPI() {
    await this.page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("API", "http://127.0.0.1:8080/api");
      localStorage.setItem("token", "mock-token"); // ให้ผ่าน ProtectRoutes
      localStorage.setItem("roles", JSON.stringify(["Admin"]));
      localStorage.setItem("user", JSON.stringify({ username: "Admin1", roles: ["Admin"] }));
    });
  }

  async goto() {
    await this.page.goto("/Dept/Deptmanagement");
    // รอให้หน้าโหลดจริง (มี heading)
    await expect(this.title).toBeVisible({ timeout: 5000 });
  }

  // ------ Actions ------
  async openAddModal() {
    await this.openAddBtn.click();
    await expect(this.addModalTitle).toBeVisible({ timeout: 5000 });
  }

  async addDepartment(name) {
    await this.addNameInput.fill(name);
    await this.addSaveBtn.click();
  }

  async openEditByRowName(deptName) {
    const row = this.page.getByRole("row", { name: new RegExp(deptName) });
    await row.getByRole("button", { name: "แก้ไข", exact: true }).click(); // :contentReference[oaicite:12]{index=12}
    await expect(this.editModalTitle).toBeVisible({ timeout: 5000 });
  }

  async setDeptCode(code) {
    await this.deptCodeInput.fill(code);
    await this.deptCodeAddBtn.click();
  }

  async saveEdit() {
    await this.editSaveBtn.click();
  }

  async deleteByRowName(deptName) {
    // dept.jsx ใช้ window.confirm ก่อนลบ :contentReference[oaicite:13]{index=13}
    this.page.once("dialog", (d) => d.accept());

    const row = this.page.getByRole("row", { name: new RegExp(deptName) });
    await row.getByRole("button", { name: "ลบ", exact: true }).click(); // :contentReference[oaicite:14]{index=14}
  }
}