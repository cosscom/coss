import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.HUB_DATABASE_URL;
if (!url) throw new Error("HUB_DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: fileURLToPath(new URL("../../migrations", import.meta.url)),
  });
  console.info(`Migrated ${new URL(url).pathname.slice(1)}`);
} finally {
  await pool.end();
}
