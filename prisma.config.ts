// Root Prisma config delegates to the backend sovereign schema and migration history.
// Use the delegated package scripts from the workspace root or backend package.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
