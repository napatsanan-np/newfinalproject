const { test, expect } = require("@playwright/test");
const path = require("path");
const { ProctorAssignerPage } = require("./pages/ProctorAssignerPage");

test.describe("ProctorAssigner UI - Upload only", () => {
  test.beforeEach(async ({ page }) => {
    const p = new ProctorAssignerPage(page);
    await p.bootstrap();

    await page.route("**/select_data/roomexam", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            Ref: "1",
            No: 1,
            Edate: "05/10/2025",
            Etime: "09:00-12:00",
            Room_id: "R001",
            Course: "SC123",
            Num_st: 50,
            Hr: "3",
          },
        ]),
      });
    });

    await page.route("**/select_data/proctor_assignments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ ref: "1", no: 1, user_id: "U001" }]),
      });
    });

    await page.route("**/select_data/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { user_id: "U001", full_name: "สมชาย ใจดี", department: 1 },
          { user_id: "U002", full_name: "สมหญิง ตั้งใจ", department: 2 },
        ]),
      });
    });

    await page.route("**/select_data/departments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id_dept: 1, name_th: "เทคโนโลยีสารสนเทศ" },
          { id_dept: 2, name_th: "คณิตศาสตร์" },
        ]),
      });
    });

    await page.route("**/ConditionWithproctor", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            users: { user_id: "U001", full_name: "สมชาย ใจดี" },
            condition_proctor: {
              base_condition: "ไม่มี",
              special_dates: "",
              time_period: "เช้า",
              special_courses: "",
              time_restriction: "",
            },
          },
        ]),
      });
    });

    await page.route("**/upload/proctor_condition", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await p.goto();
  });

  // test("อัปโหลดไฟล์สำเร็จ", async ({ page }) => {
  //   const p = new ProctorAssignerPage(page);
  //   const filePath = path.resolve(__dirname, "../fixtures/sample.xlsx");

  //   await p.clickUploadTab();
  //   await p.chooseFile(filePath);

  //   await expect(page.locator("text=ไฟล์ที่เลือก:")).toContainText("sample.xlsx");

  //   await p.clickUpload();
  //   await expect(p.swalPopup).toBeVisible();

  //   await p.confirmSwal();
  //   await expect(page.locator(".swal2-popup")).toContainText("สำเร็จ");
  // });

  test("ไม่ได้เลือกไฟล์แต่กดอัปโหลด", async ({ page }) => {
    const p = new ProctorAssignerPage(page);

    await p.clickUploadTab();
    await p.clickUpload();

    await expect(p.swalPopup).toBeVisible();
    await expect(page.locator(".swal2-popup")).toContainText("คุณแน่ใจไหม?");

    await p.confirmSwal();
    await expect(page.locator(".swal2-popup")).toContainText("ไม่ได้เลือกไฟล์");
  });
});