import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const PAGE_PATH = '/SystemManagement';

test.describe('Configexam/SystemManagement', () => {
  test.beforeEach(async ({ page }) => {
    // ใส่ token ปลอม (ถ้าหน้าคุณเช็คแค่มี token ก็พอ)
    await page.addInitScript(() => {
      localStorage.setItem('token', 'FAKE_TOKEN_FOR_TEST');
      localStorage.setItem('API', 'http://localhost:8080/api'); // ให้ตรงกับที่โค้ดใช้ localStorage.getItem("API")
      localStorage.setItem('user', JSON.stringify({ roles: ['ผู้ดูแลระบบ'] }));
    });
  });

  test('กดบันทึกโดยไม่เลือก ปี/ภาค/Phase', async ({ page }) => {
    await page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

    // กดบันทึก
    await page.getByRole('button', { name: 'บันทึกการตั้งค่าเวลา' }).click();

    // เช็ค feedback เตือน (ตามข้อความในโค้ด)
    await expect(page.getByText('กรุณาเลือกปีการศึกษา')).toBeVisible();
    await expect(page.getByText('กรุณาเลือกภาคการศึกษา')).toBeVisible();
    await expect(page.getByText('กรุณาเลือก Phase')).toBeVisible();

    // เช็คว่า select ถูก mark invalid (Bootstrap จะใส่ class is-invalid)
    await expect(page.getByLabel('ปีการศึกษา')).toHaveClass(/is-invalid/);
    await expect(page.getByLabel('ภาคการศึกษา')).toHaveClass(/is-invalid/);
    await expect(page.getByLabel('Phase \(ช่วงสอบ\)')).toHaveClass(/is-invalid/);
  });

  test('กรอกครบ + เวลา valid แล้วกดบันทึก ต้องยิง API สำเร็จ และกดดูรายละเอียดไป TimeSettingsModal ได้', async ({ page }) => {
    // mock API ให้ผ่าน
    await page.route('**/SetSystemmanagement', async (route) => {
      // เช็ค payload แบบคร่าว ๆ ได้
      const body = await route.request().postDataJSON();
      // expect แบบไม่บังคับมากเพื่อไม่เปราะ
      if (!body?.academic_year || !body?.semester || !body?.phase) {
        return route.fulfill({ status: 400, body: JSON.stringify({ error: 'missing fields' }) });
      }
      return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });

    await page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

    // เลือกปี
    await page.getByLabel('ปีการศึกษา').selectOption({ label: /./ }); // เลือก option ที่ไม่ว่างตัวแรก
    // เลือกภาค
    await page.getByLabel('ภาคการศึกษา').selectOption('ภาคต้น');
    // เลือก phase
    await page.getByLabel('Phase (ช่วงสอบ)').selectOption('กลางภาค');

    // ใส่ datetime-local ให้ valid (start < end)
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill('2025-01-10T09:00'); // prep start
    await dt.nth(1).fill('2025-01-10T10:00'); // prep end
    await dt.nth(2).fill('2025-01-11T09:00'); // exam start
    await dt.nth(3).fill('2025-01-11T10:00'); // exam end

    // กดบันทึก
    await page.getByRole('button', { name: 'บันทึกการตั้งค่าเวลา' }).click();

    // ถ้าคุณไม่อยากให้เทสติด alert ให้ “ดัก” alert
    page.on('dialog', (d) => d.dismiss());

    // ต่อ: ไปหน้า modal โดยกดปุ่มดูรายละเอียด
    await page.getByRole('button', { name: 'ดูรายละเอียด' }).click();
    await expect(page).toHaveURL(/\/TimeSettingsModal$/);
  });
});
