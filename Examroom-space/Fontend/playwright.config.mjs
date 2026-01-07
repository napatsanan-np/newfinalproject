// Fontend/playwright.config.mjs
import { defineConfig } from '@playwright/test';

//เป็นการประกาศไฟล์ตั้งค่าของ Playwright
export default defineConfig({
  testDir: './tests', //กำหนดตำแหน่งของไฟล์ทดสอบระบบ
  timeout: 60_000, //1 case ใช้เวลาได้ไม่เกิน 60 วินาที
  expect: { timeout: 10_000 }, //ป้องกันไม่ให้ test ค้างหรือรอไม่สิ้นสุด
  use: {
    baseURL: 'http://localhost:3000', 
    headless: true,
    screenshot: 'only-on-failure', //ถ้า test ผ่านจะไม่เก็บภาพหน้าจอ แต่ถ้า fail จะเก็บภาพหน้าจอไว้
    video: 'retain-on-failure', //ถ้า test ผ่านจะไม่เก็บวิดีโอ แต่ถ้า fail จะเก็บวิดีโอไว้
    trace: 'on-first-retry', 
  },

  // ให้ Playwright สตาร์ทเว็บเอง 
  webServer: {
    command: 'npm run dev -- --host --port 3000', //คำสั่งสตาร์ทเว็บ
    url: 'http://localhost:3000', //URL ที่เว็บจะรัน
    reuseExistingServer: true, 
    timeout: 120_000, 
  },
});
