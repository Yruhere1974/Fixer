import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const JORDAN_ID = process.argv[3];
const base = "http://localhost:3000";
const browser = await chromium.launch();

async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await Promise.all([
    page.waitForURL(`${base}/`, { timeout: 10000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}

const results = {};

// 1. Unauthenticated -> redirected to /login
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  results.unauthRedirect = page.url();
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/login.png` });
  await ctx.close();
}

// 2. Founder sees all clients (incl. Jordan)
{
  const { ctx, page } = await login("founder@fixer.local");
  results.founderUrl = page.url();
  results.founderSeesJordan = (await page.content()).includes("Jordan Rivers");
  await page.screenshot({ path: `${OUT}/founder-dashboard.png`, fullPage: true });
  await ctx.close();
}

// 3. Second navigator (unassigned) should NOT see Jordan
{
  const { ctx, page } = await login("navigator2@fixer.local");
  results.nav2SeesJordan = (await page.content()).includes("Jordan Rivers");
  // Direct access to Jordan should be not-found for nav2
  await page.goto(`${base}/clients/${JORDAN_ID}`, { waitUntil: "networkidle" });
  results.nav2DirectAccess = (await page.content()).includes("could not be found")
    ? "not-found"
    : "ALLOWED";
  await page.screenshot({ path: `${OUT}/nav2-denied.png` });
  await ctx.close();
}

// 4. Assigned navigator sees Jordan and the coordination UI (Mark done)
{
  const { ctx, page } = await login("navigator@fixer.local");
  results.navSeesJordan = (await page.content()).includes("Jordan Rivers");
  await page.goto(`${base}/clients/${JORDAN_ID}`, { waitUntil: "networkidle" });
  const html = await page.content();
  results.navCanCoordinate = html.includes("Mark done");
  await page.screenshot({ path: `${OUT}/nav-client.png`, fullPage: true });
  await ctx.close();
}

// 5. Bookkeeper: no client access; read-only (no Mark done) if reached
{
  const { ctx, page } = await login("bookkeeper@fixer.local");
  results.bookkeeperSeesJordan = (await page.content()).includes("Jordan Rivers");
  await page.goto(`${base}/clients/${JORDAN_ID}`, { waitUntil: "networkidle" });
  const html = await page.content();
  results.bookkeeperDirectAccess = html.includes("could not be found") ? "not-found" : "ALLOWED";
  results.bookkeeperCanCoordinate = html.includes("Mark done");
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
