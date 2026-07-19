// Sandbox DB setup for George's hands-on testing session.
// Creates whose_ball_sandbox on the same Neon project and applies all migrations.
// HARD GUARD: every statement after CREATE DATABASE runs only against a URL
// whose pathname is exactly /whose_ball_sandbox (URL API, no sed).
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";

const SANDBOX_DB = "whose_ball_sandbox";
const REPO = "/Users/georgeeastwood/cursor-course/whose-ball";

const envLine = readFileSync(`${REPO}/.env.local`, "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="));
if (!envLine) throw new Error("DATABASE_URL not found in .env.local");
const prodUrl = envLine.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");

const admin = new URL(prodUrl);
if (admin.pathname !== "/neondb") throw new Error(`Expected prod path /neondb, got ${admin.pathname} — refusing`);

const sandbox = new URL(prodUrl);
sandbox.pathname = `/${SANDBOX_DB}`;
if (sandbox.pathname !== `/${SANDBOX_DB}`) throw new Error("sandbox URL guard failed");

const adminSql = neon(admin.href);
// drop + recreate for a clean slate
await adminSql.query(`DROP DATABASE IF EXISTS ${SANDBOX_DB} WITH (FORCE)`);
await adminSql.query(`CREATE DATABASE ${SANDBOX_DB}`);
console.log(`created ${SANDBOX_DB}`);

const sandboxSql = neon(sandbox.href);
const files = readdirSync(`${REPO}/drizzle`).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  const raw = readFileSync(`${REPO}/drizzle/${f}`, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await sandboxSql.query(stmt);
  }
  console.log(`applied ${f} (${statements.length} statements)`);
}

const tables = await sandboxSql.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`
);
console.log("tables:", tables.rows.map((r) => r.table_name).join(", "));
console.log("SANDBOX_URL_PATH_OK");
