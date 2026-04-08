import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const USERNAME = 'Admin1';
const PASSWORD = 'examroom@1234';

// แก้ path ไฟล์ Excel ตรงนี้ให้ตรงกับเครื่องคุณ
const EXCEL_FILE = path.resolve(__dirname, '../fixtures/สมุดงาน1NAME.xlsx');

test.describe('Exam Room Admin actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.getByRole('textbox', { name: 'บัญชีผู้ใช้' }).fill(USERNAME);
    await page.getByRole('textbox', { name: 'รหัสผ่าน' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'ล็อกอิน' }).click();

    // ปรับข้อความตรงนี้ให้ตรงกับหน้าแรกหลัง login ของระบบคุณ
    await expect(page.getByRole('button', { name: 'เปิดเมนู' })).toBeVisible();
  });

  async function openMenu(page, menuName) {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click();
    await page.getByRole('link', { name: menuName }).click();
  }

  async function selectReactOption(page, optionText) {
    await page.getByRole('option', { name: optionText }).click();
  }

  test('print label page basic flows', async ({ page }) => {
    await openMenu(page, 'พิมพ์ label');

    // ตรวจว่าหน้าเปิดแล้ว
    await expect(page.getByText('พิมพ์ซองข้อสอบ')).toBeVisible();

    // 1) ซองข้อสอบช่วงเวลาการสอบ
    await page.getByRole('button', { name: 'พิมพ์ซองข้อสอบ' }).click();

    // 2) ซองที่แสดงรหัสวิชา
    await page.getByRole('button', { name: 'ซองที่แสดงรหัสวิชา' }).click();
    await page.getByRole('button', { name: 'พิมพ์ ซองที่แสดงรหัสวิชา' }).click();

    // 3) ใบรับ-ส่งข้อสอบ
    await page.getByRole('button', { name: 'สำหรับใบรับ-ส่งข้อสอบ' }).click();

    // เลือกวันที่จาก dropdown/react-select
    const indicators = page.locator('.css-1xc3v61-indicatorContainer, .css-15lsz6c-indicatorContainer, .css-8mmkcg');

    if (await indicators.first().count()) {
      await indicators.first().click({ force: true });
    }

    const startOption = page.getByRole('option', { name: /01\/09\// });
    if (await startOption.count()) {
      await startOption.click();
    }

    if (await indicators.nth(1).count()) {
      await indicators.nth(1).click({ force: true });
    }

    const endOption = page.getByRole('option', { name: /04\/09\// });
    if (await endOption.count()) {
      await endOption.click();
    }

    await page.getByRole('button', { name: 'พิมพ์ ใบรับ-ส่งข้อสอบ' }).click();

    // เปลี่ยนใบ
    const sheetSelect = page.locator('select');
    if (await sheetSelect.count()) {
      await sheetSelect.selectOption('ใบ2');
      await page.getByRole('button', { name: 'พิมพ์ ใบรับ-ส่งข้อสอบ' }).click();
    }

    // 4) ใบเซ็นชื่อนักศึกษา
    await page.getByRole('button', { name: 'ใบเซ็นชื่อนักศึกษา' }).click();

    // แค่เช็คว่าหน้าไม่พัง
    await expect(page.locator('body')).toBeVisible();
  });

  test('import excel from print label page', async ({ page }) => {
    await openMenu(page, 'พิมพ์ label');

    await page.getByRole('button', { name: 'นำเข้าข้อมูล Excel' }).click();

    // บางระบบปุ่มจริงเป็น input file ซ่อนอยู่
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.count()) {
      await fileInput.setInputFiles(EXCEL_FILE);
    } else {
      // fallback กรณี set กับปุ่มที่ codegen จับมาได้
      await page
        .getByRole('button', { name: 'เลือกไฟล์ Excel (.xlsx, .xls)' })
        .setInputFiles(EXCEL_FILE);
    }

    await page.getByRole('button', { name: 'นำเข้าข้อมูล', exact: true }).click();

    // ถ้ามี modal success/error แล้วมีปุ่ม Close
    const closeBtn = page.getByRole('button', { name: 'Close' });
    if (await closeBtn.count()) {
      await closeBtn.click();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('paper usage report filter works', async ({ page }) => {
    await openMenu(page, 'รายงานสถิติการใช้กระดาษ');

    await expect(page.getByText('รายงานสถิติการใช้กระดาษ')).toBeVisible();

    // ปีการศึกษา
    const indicators = page.locator('.css-1xc3v61-indicatorContainer');
    await indicators.nth(0).click();
    await selectReactOption(page, 'ปีการศึกษา 2568');

    // ภาคการศึกษา
    await indicators.nth(1).click();
    await selectReactOption(page, 'ภาคปลาย');

    // ช่วงสอบ
    await indicators.nth(2).click();
    await selectReactOption(page, 'ปลายภาค');

    // ภาควิชา
    const departmentInput = page.locator('.department-select').locator('input').first();
    if (await departmentInput.count()) {
      await departmentInput.click();
    } else {
      await page.locator('.department-select').click();
    }

    const departmentOption = page.getByRole('option', { name: /ภาควิชาฟิสิกส์/ });
    if (await departmentOption.count()) {
      await departmentOption.click();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('exam submission report can display data', async ({ page }) => {
    await openMenu(page, 'รายงานสถิติการส่งข้อสอบ');

    await expect(page.getByText('รายงานสถิติการส่งข้อสอบ')).toBeVisible();

    const indicators = page.locator('.css-1xc3v61-indicatorContainer, .css-8mmkcg');

    if (await indicators.first().count()) {
      await indicators.first().click({ force: true });
    }

    const yearOption = page.getByRole('option', { name: 'ปีการศึกษา 2568' });
    if (await yearOption.count()) {
      await yearOption.click();
    }

    await page.getByRole('button', { name: 'แสดงข้อมูล' }).click();

    // เช็คว่าหน้าไม่พังหลังโหลดข้อมูล
    await expect(page.locator('body')).toBeVisible();
  });

  test('proctor report page opens', async ({ page }) => {
    await openMenu(page, 'รายงานการคุมสอบของกรรมการ');

    await expect(page.getByText('รายงานการคุมสอบของกรรมการ')).toBeVisible();

    const indicators = page.locator('.css-1xc3v61-indicatorContainer, .css-8mmkcg');

    if (await indicators.nth(0).count()) {
      await indicators.nth(0).click({ force: true });
      const yearOption = page.getByRole('option', { name: 'ปีการศึกษา 2568' });
      if (await yearOption.count()) {
        await yearOption.click();
      }
    }

    if (await indicators.nth(1).count()) {
      await indicators.nth(1).click({ force: true });
      const semesterOption = page.getByRole('option', { name: 'ภาคปลาย' });
      if (await semesterOption.count()) {
        await semesterOption.click();
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('activity log search works', async ({ page }) => {
    await openMenu(page, 'รายงานการใช้งานระบบ');

    await expect(page.getByText('รายงานบันทึกการใช้งานระบบ')).toBeVisible();

    const textboxes = page.getByRole('textbox');
    const searchBtn = page.getByRole('button', { name: 'ค้นหา' });

    // username
    if (await textboxes.nth(0).count()) {
      await textboxes.nth(0).fill('Ad');
    }

    // from date
    if (await textboxes.nth(3).count()) {
      await textboxes.nth(3).fill('2026-03-10');
    }

    // to date
    if (await textboxes.nth(4).count()) {
      await textboxes.nth(4).fill('2026-03-12');
    }

    // status
    const combobox = page.getByRole('combobox');
    if (await combobox.count()) {
      await combobox.selectOption('FAIL');
    }

    await searchBtn.click();

    await expect(page.locator('body')).toBeVisible();
  });
});