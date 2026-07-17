import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const base = "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/dashboard.png`, fullPage: true });

const href = await page.getAttribute('a[href^="/clients/"]', "href");
await page.goto(`${base}${href}`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/client.png`, fullPage: true });

await browser.close();
console.log("shots written to", OUT, "client:", href);
