const { test, expect } = require("@playwright/test");
const { LabelPage } = require("./pages/LabelPage");

test.describe("Label page - Labeltime tab", () => {
  test.beforeEach(async ({ page }) => {
    const p = new LabelPage(page);
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
            Room_id: "R101",
            Course: "SC101",
            Num_st: 60,
          },
        ]),
      });
    });

    await page.route("**/select_data/rooms", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            room_id: "R101",
            room_name: "ห้องประชุม 1",
            capacity: 100,
          },
        ]),
      });
    });

    await p.goto();
  });

  test("เปิดหน้า /Label ได้ และมีแท็บหลัก", async ({ page }) => {
    const p = new LabelPage(page);

    await expect(p.tabLabelTime).toBeVisible();
    await expect(p.tabLabelDefault).toBeVisible();
    await expect(p.tabSignature).toBeVisible();
    await expect(p.tabStudent).toBeVisible();
  });

  test("เข้าแท็บเริ่มต้น Labeltime และแสดงฟอร์ม", async ({ page }) => {
    const p = new LabelPage(page);

    await expect(p.heading).toBeVisible();
    await expect(p.courseLabel).toBeVisible();
    await expect(p.roomLabel).toBeVisible();
    await expect(p.qtyInput).toBeVisible();
    await expect(p.btnReset).toBeVisible();
    await expect(p.btnPrint).toBeVisible();
  });

  test("โหลดข้อมูลแล้วแสดง label", async ({ page }) => {
    const p = new LabelPage(page);

    await expect(p.text("SC101")).toBeVisible();
    await expect(p.text("05/10/2025")).toBeVisible();
    await expect(p.text("09:00-12:00")).toBeVisible();
    await expect(p.text("ห้องประชุม 1")).toBeVisible();
  });

  test("กดล้างได้", async ({ page }) => {
    const p = new LabelPage(page);

    await p.clickReset();

    await expect(p.btnPrint).toBeVisible();
    await expect(p.courseLabel).toBeVisible();
  });
});