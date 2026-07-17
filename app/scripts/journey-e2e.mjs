import { chromium } from "playwright";

const OUT = process.argv[2] || "/tmp/shots";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

async function settle() {
  await page.waitForLoadState("networkidle");
}
async function openEditor(label) {
  const d = page.locator("details", { hasText: label });
  await d.locator("summary").first().click();
  return d;
}

// 1. Login as founder
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "founder@fixer.local");
await page.fill('input[name="password"]', "password123");
await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);

// 2. New engagement
await page.click('a[href="/clients/new"]');
await page.waitForURL(`${base}/clients/new`);
await page.fill('[name="displayName"]', "[E2E] Riley Quinn");
await page.fill('[name="source"]', "Website enquiry");
await page.fill('[name="generalReason"]', "Overwhelmed coordinating supports.");
await page.fill('[name="objectiveFacts"]', "No immediate concern reported.");
await Promise.all([
  page.waitForURL(new RegExp(`${base}/clients/[a-z0-9]+$`)),
  page.click('button:has-text("Create engagement")'),
]);
const clientUrl = page.url();

// 3. Agreement
{
  const d = await openEditor("Record / update agreement");
  await d.locator('[name="servicePackage"]').fill("Clarity Session");
  await d.locator('button:has-text("Save agreement")').click();
  await settle();
}
// 4. Intake
{
  const d = await openEditor("Edit intake");
  await d.locator('[name="serviceObjective"]').fill("Organize appointments into one plan.");
  await d.locator('[name="doNotShare"]').fill("No financial details with family.");
  await d.locator('button:has-text("Save intake")').click();
  await settle();
}
// 5. Approved contact
{
  const d = await openEditor("Add approved contact");
  await d.locator('[name="name"]').fill("Sam Quinn");
  await d.locator('[name="relationship"]').fill("Son");
  await d.getByRole("checkbox", { name: "Scheduling" }).check();
  await d.getByRole("checkbox", { name: "Email" }).check();
  await d.locator('button:has-text("Add contact")').click();
  await settle();
}
// 6. Consent (family update, scheduling, email, recipient Sam)
{
  const d = await openEditor("Record consent");
  await d.locator('[name="grantedByName"]').fill("Riley Quinn");
  await d.locator('[name="purpose"]').fill("Keep son informed of logistics.");
  await d.getByRole("checkbox", { name: "Scheduling" }).check();
  await d.getByRole("checkbox", { name: "Email" }).check();
  await d.getByRole("checkbox", { name: "Sam Quinn" }).check();
  await d.locator('button:has-text("Record consent")').click();
  await settle();
}
// 7. Action plan + item
{
  await page.locator('[name="desiredOutcome"]').fill("A clear, approved plan.");
  await page.locator('button:has-text("Create plan")').click();
  await settle();
  const d = await openEditor("Add action");
  await d.locator('[name="title"]').fill("Shortlist physiotherapists.");
  await d.locator('button:has-text("Add action")').click();
  await settle();
}
// 8. Family-update disclosure through the guard (should be permitted)
{
  await page.selectOption('select[name="recipientContactId"]', { index: 1 });
  await page.selectOption('select[name="category"]', "SCHEDULING");
  await page.selectOption('select[name="channel"]', "EMAIL");
  await page.fill('input[name="infoSummary"]', "Physio appointment Tuesday 2pm.");
  await page.click('button:has-text("Check & record")');
  await page.waitForSelector("text=Permitted", { timeout: 8000 }).catch(() => {});
}

await page.screenshot({ path: `${OUT}/journey-client.png`, fullPage: true });

const html = await page.content();
const results = {
  clientUrl,
  agreement: html.includes("Clarity Session"),
  intake: html.includes("Organize appointments into one plan."),
  doNotShare: html.includes("No financial details with family."),
  consentActive: html.includes("Share updates with family"),
  contact: html.includes("Sam Quinn"),
  planItem: html.includes("Shortlist physiotherapists."),
  disclosurePermitted: html.includes("Permitted"),
  disclosureSentRow: html.includes("Sent"),
};
console.log(JSON.stringify(results, null, 2));

await browser.close();
