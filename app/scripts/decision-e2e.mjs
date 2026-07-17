import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const CLIENT_ID = process.argv[3];
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/workspace`), page.click('button[type="submit"]')]);

await page.goto(`${base}/clients/${CLIENT_ID}`, { waitUntil: "networkidle" });
const seededHtml = await page.content();

// Record a new decision
const d = page.locator("details", { hasText: "Record a decision" });
await d.locator("summary").first().click();
await d.locator('[name="question"]').fill("Should we book the first appointment for a morning slot?");
await d.locator('[name="decision"]').fill("Yes — book the earliest available morning slot.");
await d.locator('[name="decisionMaker"]').fill("Jordan Rivers");
await d.locator('button:has-text("Record decision")').click();
await page.waitForLoadState("networkidle");
const afterHtml = await page.content();
await page.screenshot({ path: `${OUT}/decision-client.png`, fullPage: true });

console.log(JSON.stringify({
  seededDecision: seededHtml.includes("Which physiotherapy option should we pursue first?"),
  recordedDecision: afterHtml.includes("Should we book the first appointment for a morning slot?"),
  auditHasDecision: afterHtml.includes("Recorded decision"),
}, null, 2));

await browser.close();
