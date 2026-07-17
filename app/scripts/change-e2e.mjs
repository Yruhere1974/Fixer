import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const CLIENT_ID = process.argv[3];
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();

async function openEditor(label) {
  const d = page.locator("details", { hasText: label });
  await d.locator("summary").first().click();
  return d;
}

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/workspace`), page.click('button[type="submit"]')]);

// Open the seeded client directly
await page.goto(`${base}/clients/${CLIENT_ID}`, { waitUntil: "networkidle" });

// Log a change request
{
  const d = await openEditor("Log a scope / cost change");
  await d.locator('[name="requestedByName"]').fill("Jordan Rivers");
  await d.locator('[name="description"]').fill("Add weekly transport coordination.");
  await d.locator('[name="costImpact"]').fill("+$60 / week");
  await d.locator('button:has-text("Log change request")').click();
  await page.waitForLoadState("networkidle");
}
const afterCreate = await page.content();

// Approve it
await page.fill('input[name="decisionNote"]', "Approved within budget.");
await page.click('button[name="decision"][value="APPROVED"]');
await page.waitForLoadState("networkidle");
const afterApprove = await page.content();
await page.screenshot({ path: `${OUT}/change-client.png`, fullPage: true });

console.log(JSON.stringify({
  createdPending: afterCreate.includes("Add weekly transport coordination.") && afterCreate.includes("Pending"),
  approved: afterApprove.includes("Approved by Founder (fictional)") || afterApprove.includes("Approved within budget."),
  auditHasChange: afterApprove.includes("change request"),
}, null, 2));

await browser.close();
