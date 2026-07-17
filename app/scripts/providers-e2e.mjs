import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);

// Directory list with seeded statuses
await page.click('a[href="/providers"]');
await page.waitForURL(`${base}/providers`);
await page.waitForLoadState("networkidle");
const listHtml = await page.content();
await page.screenshot({ path: `${OUT}/providers-list.png`, fullPage: true });

// Create a new provider
await page.click('a[href="/providers/new"]');
await page.waitForURL(`${base}/providers/new`);
await page.fill('[name="name"]', "[E2E] Summit Nutrition");
await page.selectOption('[name="category"]', "NUTRITION");
await page.fill('[name="servicesOffered"]', "Registered dietitian; chronic-condition nutrition planning.");
await Promise.all([
  page.waitForURL(new RegExp(`${base}/providers/[a-z0-9]+$`)),
  page.click('button:has-text("Add provider")'),
]);
const createdHtml = await page.content();
const pendingAfterCreate = createdHtml.includes("Pending verification");

// Verify credentials
await page.fill('[name="verificationSource"]', "College of Dietitians of BC register");
await page.click('button:has-text("Verify credentials")');
await page.waitForSelector("text=Verified", { timeout: 8000 }).catch(() => {});
await page.waitForLoadState("networkidle");
const verifiedHtml = await page.content();
await page.screenshot({ path: `${OUT}/provider-detail.png`, fullPage: true });

// Dashboard exception view
await page.goto(`${base}/`, { waitUntil: "networkidle" });
const dashHtml = await page.content();

console.log(JSON.stringify({
  seededVerified: listHtml.includes("Okanagan Physiotherapy") && listHtml.includes("Verified"),
  seededPending: listHtml.includes("Lakeview Counselling") && listHtml.includes("Pending verification"),
  seededStale: listHtml.includes("HandyDART") && listHtml.includes("Stale"),
  createdPending: pendingAfterCreate,
  verifiedAfterAction: verifiedHtml.includes("Verified") && verifiedHtml.includes("College of Dietitians"),
  dashboardProviderException: dashHtml.includes("Providers to verify / review"),
}, null, 2));

await browser.close();
