import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const CLIENT_ID = process.argv[3];
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1400 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/workspace`), page.click('button[type="submit"]')]);
const dashHtml = await page.content();

await page.goto(`${base}/clients/${CLIENT_ID}`, { waitUntil: "networkidle" });
const clientHtml = await page.content();

// Add an appointment
{
  const d = page.locator("details", { hasText: "Add an appointment" });
  await d.locator("summary").first().click();
  await d.locator('[name="purpose"]').fill("Counselling appointment");
  await d.locator('[name="location"]').fill("Kelowna");
  await d.locator('button:has-text("Add appointment")').click();
  await page.waitForLoadState("networkidle");
}
// Complete the seeded warm handoff
await page.click('button:has-text("Save & complete")');
await page.waitForLoadState("networkidle");
// Resolve the seeded service recovery
await page.fill('input[name="recoveryPlan"]', "Called the client, apologised, and rebooked the call.");
await page.click('button:has-text("Save & resolve")');
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${OUT}/tier2-client.png`, fullPage: true });

console.log(JSON.stringify({
  dashUpcomingAppts: dashHtml.includes("Upcoming appointments (7 days)"),
  dashOpenRecovery: dashHtml.includes("Open service recovery"),
  apptShown: clientHtml.includes("Physiotherapy appointment") && clientHtml.includes("HandyDART booked"),
  handoffShown: clientHtml.includes("To Bookkeeper (fictional)"),
  recoveryShown: clientHtml.includes("Missed callback"),
}, null, 2));

await browser.close();
