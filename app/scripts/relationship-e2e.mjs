import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const CLIENT_ID = process.argv[3];
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1300 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/workspace`), page.click('button[type="submit"]')]);

const dashHtml = await page.content();

// Client page
await page.goto(`${base}/clients/${CLIENT_ID}`, { waitUntil: "networkidle" });
const clientHtml = await page.content();

// Record a new promise
const d = page.locator("details", { hasText: "Record a promise to the client" });
await d.locator("summary").first().click();
await d.locator('[name="description"]').fill("Call you Friday with an update, even if there is no news.");
await d.locator('button:has-text("Record promise")').click();
await page.waitForLoadState("networkidle");

// Resolve an open promise as kept
await page.locator('button[name="outcome"][value="KEPT"]').first().click();
await page.waitForLoadState("networkidle");

// Log a contact
await page.locator('form:has-text("Log contact now") button').first().click().catch(() => {});
await page.click('button:has-text("Log contact now")').catch(() => {});
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${OUT}/relationship-client.png`, fullPage: true });

console.log(JSON.stringify({
  dashContactDue: dashHtml.includes("Client contact due"),
  dashPromisesDue: dashHtml.includes("Promises due to clients"),
  backupShown: clientHtml.includes("Second Navigator (fictional)"),
  contactOverdue: clientHtml.includes("overdue"),
  promisesShown: clientHtml.includes("Confirm the physio slot") && clientHtml.includes("Kept"),
}, null, 2));

await browser.close();
