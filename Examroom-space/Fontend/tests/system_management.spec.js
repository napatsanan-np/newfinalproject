import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const PAGE_PATH = '/SystemManagement';

test.describe('Configexam/SystemManagement', () => {//
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'FAKE_TOKEN_FOR_TEST');
      localStorage.setItem('API', 'http://localhost:8080/api');// กำหนด API หลัก
      localStorage.setItem('user', JSON.stringify({ roles: ['ผู้ดูแลระบบ'] }));
    });
  });

  test('กดบันทึกโดยไม่เลือก ปี/ภาค/Phase', async ({ page }) => {
    await page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'บันทึกการตั้งค่าเวลา' }).click();

    await expect(page.getByText('กรุณาเลือกปีการศึกษา')).toBeVisible();
    await expect(page.getByText('กรุณาเลือกภาคการศึกษา')).toBeVisible();
    await expect(page.getByText('กรุณาเลือก Phase')).toBeVisible();

    await expect(page.getByLabel('ปีการศึกษา')).toHaveClass(/is-invalid/);
    await expect(page.getByLabel('ภาคการศึกษา')).toHaveClass(/is-invalid/);
    await expect(page.getByLabel('Phase \(ช่วงสอบ\)')).toHaveClass(/is-invalid/);
  });

  test('กรอกข้อมูลครบ', async ({ page }) => {
    // mock API ให้ผ่าน
    await page.route('**/SetSystemmanagement', async (route) => {
      const body = await route.request().postDataJSON();

      if (!body?.academic_year || !body?.semester || !body?.phase) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'missing fields' }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

    // เลือกปี (เลือก option ที่ไม่ใช่ว่างตัวแรก)
    await page.getByLabel('ปีการศึกษา').selectOption({ index: 1 });

    // เลือกภาค
    await page.getByLabel('ภาคการศึกษา').selectOption('ภาคต้น');

    // เลือก phase (สำคัญ: label ต้องตรงกับ aria-label ที่หน้าใช้)
    await page.getByLabel('Phase (ช่วงสอบ)').selectOption('กลางภาค');

    // ใส่ datetime-local ให้ valid (start < end)
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill('2025-01-10T09:00'); // prep start
    await dt.nth(1).fill('2025-01-10T10:00'); // prep end
    await dt.nth(2).fill('2025-01-11T09:00'); // exam start
    await dt.nth(3).fill('2025-01-11T10:00'); // exam end

    // ✅ ดัก alert ให้ทัน (ต้องตั้งก่อนคลิก)
    const dialogPromise = page.waitForEvent('dialog');

    await page.getByRole('button', { name: 'บันทึกการตั้งค่าเวลา' }).click();

    

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('การตั้งค่าช่วงเวลาถูกบันทึกเรียบร้อยแล้ว');
    await dialog.accept();

    // ไปหน้า TimeSettingsModal ผ่านปุ่ม "ดูรายละเอียด"
    await page.getByRole('button', { name: 'ดูรายละเอียด' }).click();
    await expect(page).toHaveURL(/\/TimeSettingsModal$/);
  });
});
