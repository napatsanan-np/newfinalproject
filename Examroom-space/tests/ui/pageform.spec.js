// tests/ui/pageform.spec.js
const { test, expect } = require("@playwright/test");
const { PageformPage } = require("./pages/PageformPage");

test.describe("Pageform UI (/Pageform)", () => {
  test.beforeEach(async ({ page }) => {
    const p = new PageformPage(page);
    await p.clearStorageAndSetAPI();

    // ===== Mock endpoints ที่หน้าเรียกจริง (จาก NewForm.jsx) =====
    await page.route("**/api/select_data/examtable", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            Ref: "1",
            Course: "Data Structure",
            No_st: "50",
            Lecturer: "Dr. Smith,Dr. John",
            Edate: "10-10-2569",
            Etime: "09:00",
            Hr: "3",
          },
        ]),
      });
    });

    await page.route("**/api/select_data/detail_exam", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            Ref: 1,
            submit: "ยังไม่ส่ง",
            Lecturer: "Dr. Smith",
          },
        ]),
      });
    });

    await page.route("**/api/select_data/users", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ full_name: "Dr. Smith" }, { full_name: "Dr. John" }]),
      });
    });

    await page.route("**/api/DataRoomexam", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            roomexam: { Ref: "1" },
            rooms: { room_name: "SC101" },
          },
        ]),
      });
    });

    // ===== Mock submit =====
    await page.route("**/api/Edit_DetailExam", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await p.goto();
  });

  test("เปิดหน้าได้ และเห็นฟอร์มหลัก", async ({ page }) => {
    const p = new PageformPage(page);

    await expect(p.courseLabel).toBeVisible();
    await expect(p.submitBtn).toBeVisible();
  });


  test("กดส่งทั้งที่ยังกรอกไม่ครบ -> ต้องขึ้น Alert เตือน", async ({ page }) => {
    const p = new PageformPage(page);

    await p.submit();

    await expect(p.requiredAlert).toBeVisible({ timeout: 8000 });
    await expect(p.requiredAlert).toContainText("กรุณากรอกข้อมูลให้ครบทุกช่อง");
  });

  
});