import { applySeed } from "emdash/seed";
import { createDialect } from "emdash/db/sqlite";
import { readFileSync } from "node:fs";
import { Kysely } from "kysely";

const dialect = createDialect({ url: "file:./data.db" });
const db = new Kysely({ dialect });
const seed = JSON.parse(readFileSync("./seed/seed.json", "utf-8"));

console.log("Applying seed to database...");
const result = await applySeed(db, seed, { includeContent: true });
console.log("Seed result:", JSON.stringify(result, null, 2));

await db.destroy();
