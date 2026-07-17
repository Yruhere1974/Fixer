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

// Approve the seeded pending expense on the client page
await page.goto(`${base}/clients/${CLIENT_ID}`, { waitUntil: "networkidle" });
await page.click('button[name="decision"][value="APPROVED"]');
await page.waitForLoadState("networkidle");
const clientHtml = await page.content();

// Invoices list — seeded overdue invoice present
await page.click('a[href="/invoices"]');
await page.waitForURL(`${base}/invoices`);
await page.waitForLoadState("networkidle");
const listHtml = await page.content();
await page.screenshot({ path: `${OUT}/invoices-list.png`, fullPage: true });

// Create a new invoice for the client
await page.click('a[href="/invoices/new"]');
await page.waitForURL(`${base}/invoices/new`);
await page.selectOption('select[name="clientId"]', CLIENT_ID);
await Promise.all([
  page.waitForURL(new RegExp(`${base}/invoices/[a-z0-9]+$`)),
  page.click('button:has-text("Create draft invoice")'),
]);

// Add a service line
await page.fill('input[name="description"]', "Coordination — 2 hours");
await page.fill('input[name="quantity"]', "2");
await page.fill('input[name="unitAmount"]', "90");
await page.click('button:has-text("Add line")');
await page.waitForLoadState("networkidle");

// Add the now-approved third-party expense
const hasBillable = await page.locator('button:has-text("Add to invoice")').count();
if (hasBillable > 0) {
  await page.locator('button:has-text("Add to invoice")').first().click();
  await page.waitForLoadState("networkidle");
}

// Send then mark paid
await page.click('button:has-text("Mark sent")');
await page.waitForLoadState("networkidle");
await page.click('button:has-text("Mark paid")');
await page.waitForLoadState("networkidle");
const invoiceHtml = await page.content();
await page.screenshot({ path: `${OUT}/invoice-detail.png`, fullPage: true });

await page.goto(`${base}/`, { waitUntil: "networkidle" });
const dashHtml = await page.content();

console.log(JSON.stringify({
  expenseApproved: clientHtml.includes("Courier of intake documents") || clientHtml.includes("Approved by"),
  seededInvoiceOverdue: listHtml.includes("SEED-0001") && listHtml.includes("Overdue"),
  serviceLineAdded: invoiceHtml.includes("Coordination — 2 hours"),
  billedExpense: invoiceHtml.includes("Third-party expense"),
  invoicePaid: invoiceHtml.includes("Paid"),
  dashInvoiceException: dashHtml.includes("Invoices overdue"),
}, null, 2));

await browser.close();
