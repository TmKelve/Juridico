-- CreateTable
CREATE TABLE "FinanceInstallmentPlan" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "clientId" INTEGER,
    "processId" INTEGER,
    "categoryCode" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmountCents" INTEGER NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceInstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FinanceEntry"
ADD COLUMN "installmentPlanId" INTEGER,
ADD COLUMN "installmentNumber" INTEGER;

-- CreateIndex
CREATE INDEX "FinanceEntry_installmentPlanId_installmentNumber_idx" ON "FinanceEntry"("installmentPlanId", "installmentNumber");

-- CreateIndex
CREATE INDEX "FinanceInstallmentPlan_clientId_active_idx" ON "FinanceInstallmentPlan"("clientId", "active");

-- CreateIndex
CREATE INDEX "FinanceInstallmentPlan_processId_active_idx" ON "FinanceInstallmentPlan"("processId", "active");

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "FinanceInstallmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInstallmentPlan" ADD CONSTRAINT "FinanceInstallmentPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInstallmentPlan" ADD CONSTRAINT "FinanceInstallmentPlan_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInstallmentPlan" ADD CONSTRAINT "FinanceInstallmentPlan_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "FinanceCategory"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
