// // tests/ui/pages/PageSearchPage.js
// const { expect } = require("@playwright/test");

// class PageSearchPage {
//   constructor(page) {
//     this.page = page;

//     // Tabs (React-Bootstrap NavLink)
//     this.tabCourse = page.locator('.nav-link:has-text("ค้นหาด้วยวิชา")').first();
//     this.tabDate = page.locator('.nav-link:has-text("ค้นหาด้วยวันที่")').first();
//     this.tabRoom = page.locator('.nav-link:has-text("ค้นหาด้วยห้องสอบ")').first();
//     this.tabSubmit = page.locator('.nav-link:has-text("ค้นหาด้วยสถานะการส่งข้อสอบ")').first();

//     // Active pane (กันปุ่มซ้ำหลายแท็บ)
//     this.activePane = page.locator(".tab-content .tab-pane.active");

//     this.btnSearch = this.activePane.locator('button:has-text("ค้นหา")').first();
//     this.btnReset = this.activePane.locator('button:has-text("รีเซ็ท")').first();

//     // Headings ใน pane (h3) — ชัวร์กว่า getByRole(heading) เพราะบางทีมันไม่ใช่ heading role
//     this.h3Course = this.activePane.locator('h3:has-text("ค้นหาด้วยวิชา")').first();
//     this.h3Date = this.activePane.locator('h3:has-text("ค้นหาด้วยวันที่")').first();
//     this.h3Room = this.activePane.locator('h3:has-text("ค้นหาด้วยห้องสอบ")').first();
//     this.h3Submit = this.activePane.locator('h3:has-text("ค้นหาด้วยสถานะการส่งข้อสอบ")').first();
//   }

//   async clearStorageAndSetAPI() {
//     // สำคัญ: ทำก่อน navigate
//     await this.page.addInitScript(() => {
//       localStorage.clear();

//       // ให้ตรงกับที่ระบบใช้จริง
//       localStorage.setItem("API", "http://127.0.0.1:8080/api");

//       // ให้ผ่าน ProtectRoutes
//       localStorage.setItem("token", "mock-token");
//       localStorage.setItem("roles", JSON.stringify(["Admin"]));
//       localStorage.setItem("user", JSON.stringify({ username: "Admin1", roles: ["Admin"] }));

//       // บางโปรเจคเช็ค window.User ด้วย
//       window.User = { username: "Admin1", roles: ["Admin"] };
//     });
//   }

//   async goto() {
//     await this.page.goto("/PageSearch", { waitUntil: "domcontentloaded" });

//     // ถ้าโดนเด้งกลับ login จะจับได้ตรงนี้
//     await expect(this.page).toHaveURL(/\/PageSearch/i, { timeout: 10000 });

//     // รอให้แท็บขึ้นจริง
//     await expect(this.tabCourse).toBeVisible({ timeout: 10000 });
//   }

//   async clickCourseTab() {
//     await this.tabCourse.click();
//     await expect(this.h3Course).toBeVisible({ timeout: 5000 });
//   }

//   async clickDateTab() {
//     await this.tabDate.click();
//     await expect(this.h3Date).toBeVisible({ timeout: 5000 });
//   }

//   async clickRoomTab() {
//     await this.tabRoom.click();
//     await expect(this.h3Room).toBeVisible({ timeout: 5000 });
//   }

//   async clickSubmitTab() {
//     await this.tabSubmit.click();
//     await expect(this.h3Submit).toBeVisible({ timeout: 5000 });
//   }
// }

// module.exports = { PageSearchPage };