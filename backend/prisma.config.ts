// Prisma config canônico do backend. Executado com working-directory=backend/.
// Paths relativos resolvem para backend/prisma/schema.prisma e backend/prisma/migrations/.
// Para rodar do workspace root, use o prisma.config.ts da raiz (que aponta para os mesmos arquivos).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
