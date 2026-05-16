-- CreateTable
CREATE TABLE "Publication" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "publicationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'nova',
    "impact" TEXT NOT NULL DEFAULT 'medio',
    "tribunal" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "relevantText" TEXT NOT NULL,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "convertedToDeadline" BOOLEAN NOT NULL DEFAULT false,
    "derivedDeadlineLabel" TEXT,
    "notes" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
