const { test, expect } = require("@playwright/test");
const { ProctorPage } = require("./pages/ProctorPage");

test("ค้นหากรรมการ", async ({ page }) => {

  const proctor = new ProctorPage(page);

  await proctor.goto();

  await proctor.search("ณัฐโชติ พรหมฤทธิ์");

  await expect(proctor.table).toBeVisible({ timeout: 30000 });

});