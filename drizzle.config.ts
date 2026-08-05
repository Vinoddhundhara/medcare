import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config(); // Load .env before checking environment variables

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const dbUrl = process.env.DATABASE_URL;

// Only add SSL params for remote (non-local) databases
const isLocalDb =
  dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

const finalUrl =
  isLocalDb
    ? dbUrl
    : dbUrl.includes("sslmode=")
    ? dbUrl
    : dbUrl + "?sslmode=require&connect_timeout=30";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: finalUrl,
    ...(isLocalDb ? {} : { ssl: "require" }),
  },
});
