import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const CLIENT_ID = process.argv[3];
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/workspace`), page.click('button[type="submit"]')]);

// Handoff page
await page.goto(`${base}/clients/${CLIENT_ID}/handoff`, { waitUntil: "networkidle" });
const pageHtml = await page.content();
await page.screenshot({ path: `${OUT}/handoff-page.png`, fullPage: true });

// Markdown export via the route (with session cookie)
const cookies = await ctx.cookies();
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
const res = await ctx.request.get(`${base}/clients/${CLIENT_ID}/handoff/export`, {
  headers: { cookie: cookieHeader },
});
const body = await res.text();
const disposition = res.headers()["content-disposition"] || "";

console.log(JSON.stringify({
  pageHasOutcome: pageHtml.includes("Desired outcome") && pageHtml.includes("Handoff summary"),
  pageHasGuidance: pageHtml.includes("physiotherapy sessions"),
  exportStatus: res.status(),
  exportIsMarkdown: (res.headers()["content-type"] || "").includes("text/markdown"),
  exportIsAttachment: disposition.includes("attachment") && disposition.includes(".md"),
  exportHasHeading: body.startsWith("# Handoff summary"),
}, null, 2));

await browser.close();
