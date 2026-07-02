import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbHost = process.env.DB_HOST || "";
const dbPort = process.env.DB_PORT || "";
const dbName = process.env.DB_NAME || "";
const dbUser = process.env.DB_USER || "";
const dbPassword = process.env.DB_PASSWORD || "";

const databaseUrl =
  process.env.DATABASE_URL ||
  (dbHost && dbPort && dbName && dbUser && dbPassword
    ? `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?schema=public`
    : "");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
