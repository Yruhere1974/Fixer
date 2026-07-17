import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1050 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);

// Privacy list (seeded overdue access request)
await page.click('a[href="/privacy"]');
await page.waitForURL(`${base}/privacy`);
await page.waitForLoadState("networkidle");
const listHtml = await page.content();
await page.screenshot({ path: `${OUT}/privacy-list.png`, fullPage: true });

// Log a new request
await page.click('a[href="/privacy/new"]');
await page.waitForURL(`${base}/privacy/new`);
await page.selectOption('[name="type"]', "CORRECTION");
await page.fill('[name="requesterName"]', "Alex Rivers");
await page.fill('textarea[name="scope"]', "Correct a phone number on file.");
await Promise.all([
  page.waitForURL(new RegExp(`${base}/privacy/[a-z0-9]+$`)),
  page.click('button:has-text("Log request")'),
]);

// Complete should be disabled before identity verification
const completeDisabledBefore = await page.locator('button:has-text("Mark completed")').isDisabled();

// Verify identity
await page.fill('[name="verificationMethod"]', "Government photo ID checked in person");
await page.click('button:has-text("Verify identity")');
await page.waitForLoadState("networkidle");

// Record handling + complete
await page.selectOption('select[name="status"]', "IN_PROGRESS");
await page.fill('textarea[name="outcome"]', "Phone number corrected; prior value preserved in history.");
await page.click('button:has-text("Save handling")');
await page.waitForLoadState("networkidle");
await page.click('button:has-text("Mark completed")');
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${OUT}/privacy-detail.png`, fullPage: true });

await page.goto(`${base}/`, { waitUntil: "networkidle" });
const dashHtml = await page.content();

console.log(JSON.stringify({
  seededOverdue: listHtml.includes("Access") && listHtml.includes("overdue"),
  completeDisabledBeforeVerify: completeDisabledBefore,
  dashboardPrivacyException: dashHtml.includes("Privacy requests overdue"),
}, null, 2));

await browser.close();
