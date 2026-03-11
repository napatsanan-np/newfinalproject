const { test, expect } = require("@playwright/test");
const { ReportPage } = require("./pages/ReportPage");

test.describe("Report Page", () => {
  test.beforeEach(async ({ page }) => {
    const p = new ReportPage(page);
    await p.bootstrap();

    await page.route("**/select_data/exam_config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            academic_year: "2567",
            semester: "1",
            phase: "Midterm",
          },
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

    await page.route("**/reports/paper-usage/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paper_usage: [
            {
              department_code: "101",
              total_pages: 200,
              courses: [
                {
                  course_code: "SC101",
                  pages: 4,
                  students: 50,
                  total_papers: 200,
                },
              ],
            },
          ],
        }),
      });
    });

    await p.goto();
  });

  test("เปิดหน้า Report ได้", async ({ page }) => {
    await expect(page.locator(".basic-select").first()).toBeVisible();
  });

  test("เลือก year / semester / phase แล้วโหลด report", async ({ page }) => {
    const p = new ReportPage(page);

    await p.selectYear("ปีการศึกษา 2567");
    await p.selectSemester("1");
    await p.selectPhase("Midterm");

    await expect(p.chart).toBeVisible();
  });

  test("แสดง summary statistics", async ({ page }) => {
    const p = new ReportPage(page);

    await p.selectYear("ปีการศึกษา 2567");
    await p.selectSemester("1");
    await p.selectPhase("Midterm");

    await expect(p.totalPages).toBeVisible();
    await expect(p.totalCourses).toBeVisible();
    await expect(p.totalDepartments).toBeVisible();
  });
});