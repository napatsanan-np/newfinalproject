// tests/ui/pages/UserManagementPage.js
const { expect } = require("@playwright/test");

class UserManagementPage {
    constructor(page) {
        this.page = page;

        // Header + ปุ่มเพิ่มผู้ใช้
        this.title = page.getByText("ระบบจัดการผู้ใช้งาน");
        this.addUserBtn = page.getByRole("button", { name: /เพิ่มผู้ใช้ใหม่/ });

        // Search
        this.searchInput = page.getByPlaceholder("ค้นหาผู้ใช้...");

        // Table / empty state
        this.table = page.locator("table");
        this.emptyRow = page.getByText("ไม่พบข้อมูลผู้ใช้");

        // Modal
        this.modalTitleAdd = page.locator(".modal-title").filter({ hasText: "เพิ่มผู้ใช้ใหม่" });
        this.modalTitleEdit = page.getByText("แก้ไขข้อมูลผู้ใช้");

        this.usernameInput = page.locator('input[name="username"]');
        this.fullNameInput = page.locator('input[name="full_name"]');
        this.departmentSelect = page.locator('select[name="department"]');

        this.cancelBtn = page.getByRole("button", { name: "ยกเลิก" });
        this.submitAddBtn = page.getByRole("button", { name: "เพิ่มผู้ใช้", exact: true });

        this.submitEditBtn = page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true });
    }

    async setStorage() {
        await this.page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem("API", "http://127.0.0.1:8080/api");
            localStorage.setItem("token", "mock-token");
            localStorage.setItem("user", JSON.stringify({ roles: ["Admin"] }));
            localStorage.setItem("roles", JSON.stringify(["Admin"]));
        });
    }

    async goto() {
        await this.page.goto("/User/Usermanagement");
        await expect(this.title).toBeVisible({ timeout: 10000 });
        await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    }

    async search(text) {
        await this.searchInput.fill(text);
    }

    async openAddModal() {
        await this.addUserBtn.click();
        await expect(this.modalTitleAdd).toBeVisible();
    }

    async fillModal({ username, full_name, departmentId }) {
        if (username !== undefined) await this.usernameInput.fill(username);
        if (full_name !== undefined) await this.fullNameInput.fill(full_name);
        if (departmentId !== undefined) await this.departmentSelect.selectOption(String(departmentId));
    }

    async submitAdd() {
        // หน้าคุณใช้ alert() หลังบันทึก :contentReference[oaicite:1]{index=1}
        this.page.once("dialog", (d) => d.accept());
        await this.submitAddBtn.click();
    }

    async submitEdit() {
        this.page.once("dialog", (d) => d.accept());
        await this.submitEditBtn.click();
    }

    async clickEditFirstRow() {
        // ปุ่ม edit เป็น icon ไม่มี text: ในโค้ดใช้ variant="info" size="sm" className="me-1 text-white" :contentReference[oaicite:2]{index=2}
        // ทางที่เสถียร: เลือกปุ่ม info ตัวแรกในตาราง
        const editBtn = this.table.locator('button.btn-info').first();
        await editBtn.click();
        await expect(this.modalTitleEdit).toBeVisible();
    }

    async clickDeleteFirstRow() {
        // ปุ่มลบ variant="danger" :contentReference[oaicite:3]{index=3}
        const delBtn = this.table.locator('button.btn-danger').first();

        // หน้าคุณใช้ confirm() :contentReference[oaicite:4]{index=4}
        this.page.once("dialog", (d) => d.accept());
        await delBtn.click();
    }
}

module.exports = { UserManagementPage };