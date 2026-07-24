import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config(); // Load .env before checking environment variables

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Add SSL params to URL if not present
const dbUrl = process.env.DATABASE_URL.includes("sslmode=")
  ? process.env.DATABASE_URL
  : process.env.DATABASE_URL + "?sslmode=require&connect_timeout=30";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: "require",
  },
});
