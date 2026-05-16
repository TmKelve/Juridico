-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "legalArea" TEXT NOT NULL,
    "pieceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "official" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "autoFill" BOOLEAN NOT NULL DEFAULT false,
    "phase" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "updatedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "placeholders" JSONB NOT NULL,
    "preview" TEXT NOT NULL,
    "versionsJson" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);
