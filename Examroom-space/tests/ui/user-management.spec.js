// tests/ui/user-management.spec.js
const { test, expect } = require("@playwright/test");
const { UserManagementPage } = require("./pages/UserManagementPage");

test.describe("UserManagement UI", () => {
  test.beforeEach(async ({ page }) => {
    const um = new UserManagementPage(page);
    await um.setStorage();

    // mock: departments + users (หน้าเรียก 2 GET ตอน mount) :contentReference[oaicite:5]{index=5}
    await page.route("**/select_data/departments", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id_dept: 1, name_th: "เทคโนโลยีสารสนเทศ" },
          { id_dept: 2, name_th: "วิทยาการคอมพิวเตอร์" },
        ]),
      });
    });

    await page.route("**/select_data/users", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { user_id: 10, username: "Admin1", full_name: "Admin One", department: 1 },
          { user_id: 11, username: "User2", full_name: "User Two", department: 2 },
        ]),
      });
    });

    await um.goto();
  });

  test("โหลดหน้าได้ และมีตาราง", async ({ page }) => {
    const um = new UserManagementPage(page);
    await expect(um.table).toBeVisible();
    await expect(page.getByText("Admin1")).toBeVisible();
  });

  test("ค้นหา username แล้วเหลือเฉพาะรายการที่ตรง", async ({ page }) => {
    const um = new UserManagementPage(page);

    await um.search("Admin1");
    await expect(page.getByText("Admin1")).toBeVisible();
    await expect(page.getByText("User2")).toHaveCount(0);
  });

  test("เปิด modal เพิ่มผู้ใช้", async ({ page }) => {
    const um = new UserManagementPage(page);

    await um.openAddModal();
    await expect(um.usernameInput).toBeVisible();
    await expect(um.fullNameInput).toBeVisible();
    await expect(um.departmentSelect).toBeVisible();
  });

  test("เพิ่มผู้ใช้ (mock POST) -> alert โผล่และ modal ปิด", async ({ page }) => {
    const um = new UserManagementPage(page);

    await page.route("**/insert_data/users", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await um.openAddModal();
    await um.fillModal({ username: "NewUser", full_name: "New User", departmentId: 1 });

    // accept alert "เพิ่มผู้ใช้สำเร็จ" จากหน้า :contentReference[oaicite:6]{index=6}
    await um.submitAdd();

    // modal ควรปิด
    await expect(um.modalTitleAdd).toHaveCount(0);
  });

  test("แก้ไขผู้ใช้ (mock PUT) -> alert โผล่", async ({ page }) => {
    const um = new UserManagementPage(page);

    await page.route("**/update_data/users/**", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await um.clickEditFirstRow();
    await um.fillModal({ full_name: "Admin One Edited" });

    await um.submitEdit();
    await expect(um.modalTitleEdit).toHaveCount(0);
  });

  test("ลบผู้ใช้ (mock DELETE) -> confirm + alert", async ({ page }) => {
    const um = new UserManagementPage(page);

    await page.route("**/delete_data/users/**", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    // confirm + alert ถูก accept ใน page object
    await um.clickDeleteFirstRow();
  });
});