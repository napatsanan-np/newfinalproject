const { test, expect } = require("@playwright/test");
const { ExamstatPage } = require("./pages/ExamstatPage");

test.describe("Examstat Page", () => {
  test.beforeEach(async ({ page }) => {
    const p = new ExamstatPage(page);
    await p.bootstrap();

    await page.route("**/select_data/exam_config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { academic_year: "2567", semester: "1", phase: "Midterm" },
        ]),
      });
    });

    await page.route("**/select_data/departments_group", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id_dept_code: "101", id_dept: "CS" },
        ]),
      });
    });

    await page.route("**/select_data/departments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id_dept: "CS", name_th: "วิทยาการคอมพิวเตอร์" },
        ]),
      });
    });

    await page.route("**/reports/exam-submissions/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          submissions: [
            {
              department_code: "101",
              submitted: 5,
              pending: 2,
              total_exams: 7,
              courses: [
                {
                  course_code: "SC101",
                  lecturer: "Dr A",
                  submit_status: "ส่งแล้ว",
                  submission_date: "2025-10-01",
                },
                {
                  course_code: "SC102",
                  lecturer: "Dr B",
                  submit_status: "ยังไม่ส่ง",
                  submission_date: null,
                },
              ],
            },
          ],
        }),
      });
    });

    await p.goto();
  });

  test("เปิดหน้า examstat ได้", async ({ page }) => {
    await expect(page.getByText("รายงานสถิติการส่งข้อสอบ")).toBeVisible();
  });

  test("เลือก config และโหลดข้อมูลได้", async ({ page }) => {
    const p = new ExamstatPage(page);

    await p.selectYear("ปีการศึกษา 2567");
    await p.selectSemester("1");
    await p.selectPhase("Midterm");

    await p.clickShow();

    await expect(p.chart).toBeVisible();
  });

  test("แสดง summary statistics", async ({ page }) => {
    const p = new ExamstatPage(page);

    await p.selectYear("ปีการศึกษา 2567");
    await p.selectSemester("1");
    await p.selectPhase("Midterm");

    await p.clickShow();

    await expect(p.total).toBeVisible();
    await expect(p.submitted).toBeVisible();
    await expect(p.pending).toBeVisible();
  });
});