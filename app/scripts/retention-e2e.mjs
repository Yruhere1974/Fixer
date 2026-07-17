import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);

await page.click('a[href="/retention"]');
await page.waitForURL(`${base}/retention`);
await page.waitForLoadState("networkidle");
const before = await page.content();
await page.screenshot({ path: `${OUT}/retention-before.png`, fullPage: true });

// Destroy the eligible record
await page.click('button:has-text("Destroy record")');
await page.waitForLoadState("networkidle");
const after = await page.content();
await page.screenshot({ path: `${OUT}/retention-after.png`, fullPage: true });

console.log(JSON.stringify({
  eligibleShown: before.includes("Past Client (retention due)") && before.includes("Destroy record"),
  onHoldShown: before.includes("Held Client (legal hold)") && before.includes("Legal hold"),
  destroyedGone: !after.includes("Past Client (retention due)"),
  tombstoneLogged: after.includes("Client coordination record"),
  heldStillPreserved: after.includes("Held Client (legal hold)"),
}, null, 2));

await browser.close();
