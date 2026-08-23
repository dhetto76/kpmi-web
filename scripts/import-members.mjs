import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const REQUIRED_HEADERS = [
  "Username",
  "Display Name",
  "E-mail",
  "Date Registered",
  "Account status",
  "Korwil",
  "Kota/Kabupaten",
  "Alamat Lengkap",
  "Alamat Domisili",
  "Nomor HP",
];

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (quoted) throw new Error("CSV ends inside a quoted field");
  return rows;
}

function clean(value) {
  const result = value?.trim();
  return result ? result : null;
}

function normalizeRow(headers, values, rowNumber) {
  const source = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  const email = clean(source["E-mail"])?.toLowerCase();
  const username = clean(source.Username);
  const fullName = clean(source["Display Name"]) ?? username;
  const registeredAt = clean(source["Date Registered"]);
  const rawStatus = clean(source["Account status"])?.toLowerCase();
  const status = rawStatus === "approved" ? "approved" :
    rawStatus === "pending" || rawStatus === "pending review" ? "pending" : null;

  const errors = [];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("invalid email");
  if (!fullName) errors.push("missing display name and username");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(registeredAt ?? "")) errors.push("invalid registration date");
  if (!status) errors.push(`unknown status: ${source["Account status"]}`);
  if (values.length !== headers.length) errors.push(`expected ${headers.length} fields, found ${values.length}`);

  return {
    rowNumber,
    errors,
    email,
    username,
    fullName,
    registeredAt,
    status,
    korwil: clean(source.Korwil),
    city: clean(source["Kota/Kabupaten"]),
    address: clean(source["Alamat Lengkap"]),
    domicileAddress: clean(source["Alamat Domisili"]),
    phone: clean(source["Nomor HP"]),
  };
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function retry(operation, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** (attempt - 1))));
      }
    }
  }
  throw lastError;
}

async function listUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await retry(async () => {
      const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function mapLimit(items, limit, worker) {
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : command;
    const executableArgs = process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;
    const child = spawn(executable, executableArgs, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

function buildImportSql(rows, sourceName) {
  const statements = [
    "begin;",
    "set local lock_timeout = '10s';",
    "alter table public.profiles disable trigger profiles_no_escalation;",
  ];

  for (const batch of chunks(rows, 400)) {
    const values = batch.map(({ row, userId }) => `(
      ${sqlLiteral(userId)}::uuid,
      ${sqlLiteral(row.fullName)},
      ${sqlLiteral(row.phone)},
      ${sqlLiteral(row.city)},
      ${sqlLiteral(row.korwil)},
      ${sqlLiteral(row.status)}::approval_status,
      (${sqlLiteral(row.registeredAt)}::timestamp at time zone 'Asia/Jakarta')
    )`).join(",\n");
    statements.push(`
      insert into public.profiles (id, full_name, phone, city, korwil, status, created_at)
      values ${values}
      on conflict (id) do update set
        full_name = excluded.full_name,
        phone = excluded.phone,
        city = excluded.city,
        korwil = excluded.korwil,
        status = excluded.status,
        created_at = excluded.created_at;
    `);
  }

  for (const batch of chunks(rows, 400)) {
    const values = batch.map(({ row, userId }) => `(
      ${sqlLiteral(userId)}::uuid,
      ${sqlLiteral(row.username)},
      ${sqlLiteral(row.address)},
      ${sqlLiteral(row.domicileAddress)},
      ${sqlLiteral(row.registeredAt)}::timestamp,
      ${sqlLiteral(sourceName)}
    )`).join(",\n");
    statements.push(`
      insert into public.member_private_details
        (profile_id, legacy_username, address, domicile_address, legacy_registered_at, import_source)
      values ${values}
      on conflict (profile_id) do update set
        legacy_username = excluded.legacy_username,
        address = excluded.address,
        domicile_address = excluded.domicile_address,
        legacy_registered_at = excluded.legacy_registered_at,
        import_source = excluded.import_source,
        imported_at = now();
    `);
  }

  statements.push(
    "alter table public.profiles enable trigger profiles_no_escalation;",
    "commit;",
  );
  return statements.join("\n");
}

const apply = process.argv.includes("--apply");
const checkLive = process.argv.includes("--check-live");
const csvPath = process.argv.find((argument) => !argument.startsWith("--") && argument !== process.argv[0] && argument !== process.argv[1]);
if (!csvPath) throw new Error("Usage: node scripts/import-members.mjs [--apply] <members.csv>");

const rawRows = parseCsv(await readFile(csvPath, "utf8"));
const headers = rawRows.shift()?.map((header) => header.replace(/^\uFEFF/, ""));
if (!headers || headers.join("\n") !== REQUIRED_HEADERS.join("\n")) {
  throw new Error(`Unexpected CSV headers: ${headers?.join(", ")}`);
}

const rows = rawRows
  .filter((values) => values.some((value) => value.trim() !== ""))
  .map((values, index) => normalizeRow(headers, values, index + 2));
const invalid = rows.filter((row) => row.errors.length > 0);
const duplicateGroups = Map.groupBy(rows, (row) => row.email);
const duplicates = [...duplicateGroups.entries()].filter(([, group]) => group.length > 1);
const statusCounts = Object.fromEntries(
  [...Map.groupBy(rows, (row) => row.status).entries()].map(([status, group]) => [status, group.length]),
);

console.log(JSON.stringify({
  mode: apply ? "apply" : checkLive ? "check-live" : "dry-run",
  rows: rows.length,
  statuses: statusCounts,
  invalidRows: invalid.map((row) => ({ row: row.rowNumber, errors: row.errors })),
  duplicateEmails: duplicates.map(([email, group]) => ({ email, rows: group.map((row) => row.rowNumber) })),
}, null, 2));

if (invalid.length || duplicates.length) {
  throw new Error("CSV validation failed; no database changes were made");
}
if (!apply && !checkLive) process.exit(0);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply");

const sourceName = basename(csvPath);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const existingUsers = await listUsers(supabase);
const usersByEmail = new Map(existingUsers.map((user) => [user.email?.toLowerCase(), user]));
const preexisting = [];
const resumable = [];
const toCreate = [];

for (const row of rows) {
  const user = usersByEmail.get(row.email);
  if (!user) toCreate.push(row);
  else if (user.user_metadata?.import_source === sourceName) resumable.push({ row, userId: user.id });
  else preexisting.push({ row: row.rowNumber, email: row.email });
}

console.log(JSON.stringify({ existingAccountsSkipped: preexisting.length, resumable: resumable.length, accountsToCreate: toCreate.length }, null, 2));
if (!apply) process.exit(0);
const imported = [...resumable];
const failures = [];

await mapLimit(toCreate, 10, async (row, index) => {
  const password = `${randomBytes(32).toString("base64url")}aA1!`;
  const { data, error } = await supabase.auth.admin.createUser({
    email: row.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: row.fullName,
      legacy_username: row.username,
      import_source: sourceName,
    },
  });
  if (error || !data.user) {
    failures.push({ row: row.rowNumber, email: row.email, error: error?.message ?? "No user returned" });
  } else {
    imported.push({ row, userId: data.user.id });
  }
  if ((index + 1) % 100 === 0 || index + 1 === toCreate.length) {
    console.log(`Auth accounts processed: ${index + 1}/${toCreate.length}; failures: ${failures.length}`);
  }
});

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  throw new Error("Auth account creation had failures. Re-run to resume safely.");
}

const sqlPath = join(tmpdir(), `kpmi-member-import-${process.pid}.sql`);
try {
  await writeFile(sqlPath, buildImportSql(imported, sourceName), { encoding: "utf8", mode: 0o600 });
  await run(process.platform === "win32" ? "npx.cmd" : "npx", ["supabase", "db", "query", "--linked", "--file", sqlPath]);
} finally {
  await unlink(sqlPath).catch(() => {});
}

console.log(JSON.stringify({ imported: imported.length, existingAccountsSkipped: preexisting.length, failures: 0 }, null, 2));
