import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1050 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);

// Incidents list (seeded privacy event present)
await page.click('a[href="/incidents"]');
await page.waitForURL(`${base}/incidents`);
await page.waitForLoadState("networkidle");
const listHtml = await page.content();
await page.screenshot({ path: `${OUT}/incidents-list.png`, fullPage: true });

// Report a new incident
await page.click('a[href="/incidents/new"]');
await page.waitForURL(`${base}/incidents/new`);
await page.selectOption('[name="type"]', "COMPLAINT");
await page.fill('[name="reportedByName"]', "Founder (fictional)");
await page.fill('textarea[name="description"]', "Client reported a delayed appointment confirmation.");
await Promise.all([
  page.waitForURL(new RegExp(`${base}/incidents/[a-z0-9]+$`)),
  page.click('button:has-text("Report")'),
]);

// Investigate
await page.selectOption('select[name="status"]', "UNDER_REVIEW");
await page.fill('[name="findings"]', "Confirmation was queued but not sent due to a manual step being missed.");
await page.fill('[name="correctiveActions"]', "Add a same-day confirmation check to the coordination checklist.");
await page.fill('[name="correctiveOwner"]', "Founder (fictional)");
await page.click('button:has-text("Save investigation")');
await page.waitForLoadState("networkidle");

// Try to close before verifying (button should be disabled), then verify + close
const closeDisabledBefore = await page.locator('button:has-text("Close (approve)")').isDisabled();
await page.click('button:has-text("Verify corrective action")');
await page.waitForLoadState("networkidle");
await page.click('button:has-text("Close (approve)")');
await page.waitForLoadState("networkidle");
const afterClose = await page.content();
await page.screenshot({ path: `${OUT}/incident-detail.png`, fullPage: true });

// Dashboard exception
await page.goto(`${base}/`, { waitUntil: "networkidle" });
const dashHtml = await page.content();

console.log(JSON.stringify({
  seededPrivacyEvent: listHtml.includes("Privacy event") && listHtml.includes("overdue"),
  closeDisabledBeforeVerify: closeDisabledBefore,
  closedAfterVerify: afterClose.includes("Closed") && afterClose.includes("approved by"),
  dashboardIncidentException: dashHtml.includes("Incidents to review / correct"),
}, null, 2));

await browser.close();
