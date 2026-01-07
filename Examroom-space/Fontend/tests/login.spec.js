// Fontend/tests/login.spec.js
import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    // ตั้งค่า API base ให้หน้า Login 
    await page.addInitScript(() => {
      localStorage.setItem('API', 'http://localhost:8080/api/login'); //  กำหนดว API ที่ชี้ไป
    });
  });

  test('กดล็อกอินทั้งที่ยังไม่กรอก ', async ({ page }) => { //browser page ที่ Playwright เปิด
    await page.goto('http://localhost:3000/'); // หรือ path หน้า login 
    await page.locator('#login_button').click();


    // SweetAlert2 จะสร้าง dialog ขึ้นมา
    await expect(page.getByRole('heading', { name: 'ข้อมูลไม่ครบ' })).toBeVisible();   
    await expect(page.getByText('กรุณากรอกข้อมูลให้ครบทุกช่อง')).toBeVisible();
  });

  test('ล็อคอินโดยอาจารย์ ', async ({ page }) => {
    // mock API อาจารย์ให้ผ่าน 
    await page.route('**/api/login', async (route) => {  
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake-token-123',
          user: { username: 'teacher1', roles: ['อาจารย์'] },
        }),
      });
    });

    await page.goto('http://localhost:3000/'); // หรือ path หน้า login จริง

    await page.getByLabel('บัญชีผู้ใช้').fill('teacher1'); 
    await page.getByLabel('รหัสผ่าน').fill('1234');
    await page.locator('#login_button').click();

    await expect(page).toHaveURL('/Home-Teacher');

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBe('fake-token-123');
  });

  test('ล็อกอินไม่ผ่าน ', async ({ page }) => {
    // mock API /login ให้ผ่าน error
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Name หรือ Password ไม่ถูกต้อง' }),
      });
    });

    await page.goto('http://localhost:3000/');

    await page.getByLabel('บัญชีผู้ใช้').fill('wrong');
    await page.getByLabel('รหัสผ่าน').fill('wrong');
    await page.locator('#login_button').click();

    await expect(page.getByRole('heading', { name: 'ล็อกอินไม่สำเร็จ' })).toBeVisible();
  });

  test('ล็อกอิน admin สำเร็จ ', async ({ page }) => {
    // mock API สำหรับ admin
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake-admin-token',
          user: { username: 'admin', roles: ['ผู้ดูแลระบบ'] },
        }),
      });
    });

    await page.goto('http://localhost:3000/');

    await page.getByLabel('บัญชีผู้ใช้').fill('admin');
    await page.getByLabel('รหัสผ่าน').fill('admin123');
    await page.locator('#login_button').click();

    //  URL ต้องเป็นหน้าที่ admin ถูกพาไป
    await expect(page).toHaveURL('/Home');

    
  });

});

