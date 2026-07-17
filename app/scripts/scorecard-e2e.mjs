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

await page.click('a[href="/scorecard"]');
await page.waitForURL(`${base}/scorecard`);
await page.waitForLoadState("networkidle");
const sc = await page.content();
await page.screenshot({ path: `${OUT}/scorecard.png`, fullPage: true });

await page.goto(`${base}/clients/${CLIENT_ID}`, { waitUntil: "networkidle" });
const cl = await page.content();

console.log(JSON.stringify({
  scorecardRenders: sc.includes("White-glove scorecard") && sc.includes("Promises kept") && sc.includes("Warm handoffs completed"),
  hasPercentages: /\d+%/.test(sc),
  termsShown: cl.includes("contact every 7d") && cl.includes("proactive contacts"),
}, null, 2));

await browser.close();
