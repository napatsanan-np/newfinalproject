// tests/ui/dept-management.spec.js
import { test, expect } from "@playwright/test";
import DeptPage from "./pages/DeptPage";

test.describe("DepartmentManagement UI", () => {
  test.beforeEach(async ({ page }) => {
    const deptPage = new DeptPage(page);
    await deptPage.clearStorageAndSetAPI();

    // ----------- MOCK: initial fetch (2 endpoints) -----------
    await page.route("**/api/select_data/departments", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id_dept: 1, name_th: "เทคโนโลยีสารสนเทศ" },
          { id_dept: 2, name_th: "คณิตศาสตร์" },
        ]),
      });
    });

    await page.route("**/api/select_data/departments_group", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id_dept: 1, id_dept_code: "IT01" },
          { id_dept: 1, id_dept_code: "IT02" },
          { id_dept: 2, id_dept_code: "MATH01" },
        ]),
      });
    });

    await deptPage.goto();
  });

  test("แสดงรายการภาควิชา + badges รหัสกลุ่ม", async ({ page }) => {
    await expect(page.getByRole("cell", { name: "เทคโนโลยีสารสนเทศ" })).toBeVisible();
    await expect(page.getByText("IT01")).toBeVisible();
    await expect(page.getByText("IT02")).toBeVisible();
    await expect(page.getByText("MATH01")).toBeVisible();
  });

  test("เพิ่มภาควิชา (mock POST) -> alert success โผล่", async ({ page }) => {
    const deptPage = new DeptPage(page);

    await page.route("**/api/add_department", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();

      // จะเช็ค body คร่าวๆ ว่ามี name_th ตามที่กรอก
      const body = JSON.parse(route.request().postData() || "{}");
      expect(body.name_th).toBeTruthy();

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await deptPage.openAddModal();
    await deptPage.addDepartment("ฟิสิกส์");

    // notification type success (bootstrap alert) :contentReference[oaicite:19]{index=19}
    await expect(deptPage.alert).toBeVisible();
    await expect(deptPage.alert).toContainText('เพิ่มภาควิชา "ฟิสิกส์" เรียบร้อยแล้ว');
  });

  test("เพิ่มภาควิชาแบบไม่กรอกชื่อ -> warning", async ({ page }) => {
    const deptPage = new DeptPage(page);

    await deptPage.openAddModal();
    await deptPage.addSaveBtn.click();

    // warning: 'กรุณากรอกชื่อภาควิชา' :contentReference[oaicite:20]{index=20}
    await expect(deptPage.alert).toBeVisible();
    await expect(deptPage.alert).toContainText("กรุณากรอกชื่อภาควิชา");
  });

  test("แก้ไขภาควิชา (mock PUT) + เพิ่มรหัสกลุ่ม", async ({ page }) => {
    const deptPage = new DeptPage(page);

    await page.route("**/api/edit_department/*", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();

      const body = JSON.parse(route.request().postData() || "{}");
      expect(body.id_dept_codes).toBeTruthy(); // ต้องส่งรหัสกลุ่มมาด้วย :contentReference[oaicite:21]{index=21}

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await deptPage.openEditByRowName("เทคโนโลยีสารสนเทศ");
    await deptPage.setDeptCode("IT99");
    await deptPage.saveEdit();

    await expect(deptPage.alert).toBeVisible();
    await expect(deptPage.alert).toContainText('แก้ไขภาควิชา "เทคโนโลยีสารสนเทศ" เรียบร้อยแล้ว'); // :contentReference[oaicite:22]{index=22}
  });

  test("ลบภาควิชา (mock DELETE) -> confirm accept + alert warning โผล่", async ({ page }) => {
    const deptPage = new DeptPage(page);

    await page.route("**/api/delete_department/*", async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await deptPage.deleteByRowName("คณิตศาสตร์");

    await expect(deptPage.alert).toBeVisible();
    await expect(deptPage.alert).toContainText('ลบภาควิชา "คณิตศาสตร์" เรียบร้อยแล้ว'); // :contentReference[oaicite:23]{index=23}
  });
});