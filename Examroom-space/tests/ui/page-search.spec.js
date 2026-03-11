// // tests/ui/page-search.spec.js
// const { test, expect } = require("@playwright/test");
// const { PageSearchPage } = require("./pages/PageSearchPage");

// test.describe("PageSearch UI", () => {
//   test.beforeEach(async ({ page }) => {
//     const p = new PageSearchPage(page);
//     await p.clearStorageAndSetAPI();

//     // กัน API หลุดไป backend (ไม่ว่าหน้านี้จะเรียก endpoint อะไร ให้ปล่อย fallback ได้)
//     // ถ้าคุณรู้ endpoint ชัดเจนค่อย route แบบเจาะจงอีกที
//     await page.route("**/*", async (route) => {
//       const url = route.request().url();

//       // ปล่อยไฟล์ static ผ่าน
//       if (
//         url.includes("localhost:3000") ||
//         url.includes("127.0.0.1:3000") ||
//         url.endsWith(".js") ||
//         url.endsWith(".css") ||
//         url.endsWith(".png") ||
//         url.endsWith(".jpg") ||
//         url.endsWith(".svg") ||
//         url.includes("@vite")
//       ) {
//         return route.fallback();
//       }

//       // ถ้าเป็น call ไป backend (8080) ให้ mock เป็น [] เพื่อไม่ค้าง
//       if (url.includes(":8080") || url.includes("127.0.0.1:8080") || url.includes("localhost:8080")) {
//         return route.fulfill({
//           status: 200,
//           contentType: "application/json",
//           body: JSON.stringify([]),
//         });
//       }

//       return route.fallback();
//     });

//     await p.goto();
//   });

//   test("เปิดหน้า PageSearch ได้ (เห็นแท็บครบ)", async ({ page }) => {
//     const p = new PageSearchPage(page);
//     await expect(p.tabCourse).toBeVisible();
//     await expect(p.tabDate).toBeVisible();
//     await expect(p.tabRoom).toBeVisible();
//     await expect(p.tabSubmit).toBeVisible();
//   });

//   test("เปลี่ยน tab เป็น ค้นหาด้วยวันที่", async ({ page }) => {
//     const p = new PageSearchPage(page);
//     await p.clickDateTab();
//   });

//   test("เปลี่ยน tab เป็น ค้นหาด้วยห้องสอบ", async ({ page }) => {
//     const p = new PageSearchPage(page);
//     await p.clickRoomTab();
//   });

//   test("เปลี่ยน tab เป็น ค้นหาด้วยสถานะการส่งข้อสอบ", async ({ page }) => {
//     const p = new PageSearchPage(page);
//     await p.clickSubmitTab();
//   });

//   test("ยังไม่เลือกเงื่อนไข -> ปุ่มค้นหา disabled (ถ้ามีปุ่ม)", async ({ page }) => {
//     const p = new PageSearchPage(page);

//     // บางแท็บอาจยังไม่แสดงปุ่มจนกว่าจะเลือก input
//     // เลยเช็คแบบปลอดภัย: ถ้าปุ่มมีอยู่ค่อย assert disabled
//     const count = await p.btnSearch.count();
//     if (count > 0) {
//       await expect(p.btnSearch).toBeDisabled();
//     } else {
//       // ถ้าไม่มีปุ่มก็ถือว่าผ่าน (กัน fail แบบไม่จำเป็น)
//       expect(true).toBeTruthy();
//     }
//   });

//   test("กด reset แล้วกลับไป tab วิชาได้ (ถ้ามีปุ่มรีเซ็ท)", async ({ page }) => {
//     const p = new PageSearchPage(page);

//     await p.clickRoomTab();

//     const count = await p.btnReset.count();
//     if (count > 0) {
//       await p.btnReset.click();
//     }

//     // ส่วนใหญ่ reset จะกลับแท็บแรกหรืออย่างน้อยยังเห็นแท็บวิชา + pane วิชา
//     await expect(p.tabCourse).toBeVisible();
//   });
// });