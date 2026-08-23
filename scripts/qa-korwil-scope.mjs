/**
 * Verifies admin_korwil regional scoping against the live deployment.
 *
 * This is the one behaviour the migration could never verify from the server
 * side: the escalation trigger correctly refuses to grant a role over the REST
 * API, so no throwaway korwil admin could be created. Driving a real browser
 * as an existing Admin Korwil is the way to close it.
 *
 * Read-only. It signs in, reads pages, and asserts what is visible. It never
 * saves, approves, deletes, or changes a role.
 *
 *   node scripts/qa-korwil-scope.mjs
 *
 * Credentials come from the environment so they stay out of the repo:
 *   QA_URL, QA_EMAIL, QA_PASSWORD
 */
import { chromium } from "playwright";

const BASE = process.env.QA_URL ?? "https://kpmi-web-production.up.railway.app";
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set QA_EMAIL and QA_PASSWORD.");
  process.exit(2);
}

/** Expected scope for this account, derived from the database beforehand. */
const REGION = "Surabaya";
const EXPECTED_MEMBERS = 150;
const ALL_MEMBERS = 3722;
const EXPECTED_BUSINESS = "Surya Mandiri Teknik";

const results = [];
const check = (name, pass, detail = "") =>
  results.push({ name, pass, detail });

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  /* ------------------------------------------------------------- sign in */
  await page.goto(`${BASE}/masuk`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/masuk"), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  check("sign in succeeds", true, `landed on ${new URL(page.url()).pathname}`);

  /* ------------------------------------------------------ 1. role badge */
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const badge = (await page.locator("header").innerText()).replace(/\s+/g, " ");
  check(
    "1. header badge names the region",
    badge.includes(`Admin Korwil ${REGION}`),
    badge.trim(),
  );

  /* -------------------------------------------- 2. member list is scoped */
  await page.goto(`${BASE}/admin/anggota`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();

  // "Menampilkan 1–50 dari 150 anggota"
  const totalMatch = body.match(/dari\s+([\d.,]+)\s+anggota/i);
  const shown = totalMatch ? Number(totalMatch[1].replace(/[.,]/g, "")) : null;
  check(
    "2. member count is regional, not platform-wide",
    shown === EXPECTED_MEMBERS,
    `saw ${shown ?? "no count"} (expected ${EXPECTED_MEMBERS}, all-members is ${ALL_MEMBERS})`,
  );

  // Every korwil cell on the page must read the admin's own region.
  const korwilCells = await page
    .locator("table tbody tr td:nth-child(3)")
    .allInnerTexts();
  const foreign = [...new Set(korwilCells.map((c) => c.trim()))].filter(
    (c) => c && c !== "—" && c !== REGION,
  );
  check(
    "2b. no member from another korwil is listed",
    foreign.length === 0,
    foreign.length ? `LEAKED: ${foreign.join(", ")}` : `all rows read "${REGION}"`,
  );

  /* ------------------------------------------ 3. korwil filter is locked */
  const korwilSelect = page.locator('select[name="korwil"]');
  check(
    "3. korwil filter is disabled",
    await korwilSelect.isDisabled(),
    `value="${await korwilSelect.inputValue()}"`,
  );

  /* ------------------------------------------- 4. no role-granting column */
  const headers = await page.locator("table thead th").allInnerTexts();
  check(
    "4. no Peran column (cannot grant roles)",
    !headers.some((h) => h.trim().toLowerCase() === "peran"),
    `columns: ${headers.map((h) => h.trim()).join(" | ")}`,
  );

  /* ------------------------------------------- 5. business list is scoped */
  await page.goto(`${BASE}/admin/bisnis`, { waitUntil: "networkidle" });
  const bizRows = await page.locator("table tbody tr").count();
  const bizText = await page.locator("body").innerText();
  check(
    "5. only businesses owned by the region",
    bizRows === 1 && bizText.includes(EXPECTED_BUSINESS),
    `${bizRows} row(s); expected 1 ("${EXPECTED_BUSINESS}")`,
  );

  /* --------------------------------------- 6. reference lists read-only */
  await page.goto(`${BASE}/admin/korwil`, { waitUntil: "networkidle" });
  const korwilPage = await page.locator("body").innerText();
  const hasAddBox = (await page.locator('input[placeholder*="baru"]').count()) > 0;
  check(
    "6. korwil list is read-only for a korwil admin",
    !hasAddBox && korwilPage.includes("Hanya Super Admin"),
    hasAddBox ? "ADD BOX PRESENT" : "no add box; super-admin notice shown",
  );

  /* ------------------------------------------- 7. settings are read-only */
  await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[name="org_email"]');
  const saveButtons = await page.locator('button[type="submit"]').count();
  check(
    "7. settings are read-only",
    (await emailInput.isDisabled()) && saveButtons === 0,
    `org_email disabled=${await emailInput.isDisabled()}, submit buttons=${saveButtons}`,
  );

  /* ------------------------- bonus: the member search fix, as this admin */
  await page.goto(`${BASE}/admin/anggota`, { waitUntil: "networkidle" });
  const firstName = (
    await page.locator("table tbody tr td:nth-child(2)").first().innerText()
  )
    .split("\n")[0]
    .trim();
  const term = firstName.split(" ")[0];
  await page.fill('input[name="q"]', term);
  // Wait for the navigation the submit triggers, not just the URL change —
  // the URL updates before the new document has rendered, and reading too
  // early sees the previous page's count.
  await Promise.all([
    page.waitForURL(/[?&]q=/, { timeout: 20000 }).catch(() => {}),
    page.press('input[name="q"]', "Enter"),
  ]);
  await page.waitForLoadState("networkidle");
  const searched = page.url();
  const afterText = await page.locator("body").innerText();
  const afterMatch = afterText.match(/dari\s+([\d.,]+)\s+anggota/i);
  const afterCount = afterMatch ? Number(afterMatch[1].replace(/[.,]/g, "")) : null;
  check(
    "8. member search updates the URL and narrows results",
    /[?&]q=/.test(searched) && afterCount !== null && afterCount < EXPECTED_MEMBERS,
    `q="${term}" -> ${afterCount} of ${EXPECTED_MEMBERS}; url=${searched.replace(BASE, "")}`,
  );
} catch (error) {
  check("harness completed without error", false, String(error).split("\n")[0]);
} finally {
  await browser.close();
}

/* ------------------------------------------------------------- report */
let failed = 0;
console.log("\nKorwil scoping — live check\n");
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  if (r.detail) console.log(`        ${r.detail}`);
}
console.log(
  `\n${results.length - failed}/${results.length} passed${failed ? " — SCOPING NOT SAFE" : ""}\n`,
);
process.exit(failed ? 1 : 0);
