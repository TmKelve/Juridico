-- CreateEnum
CREATE TYPE "UserRole" AS ENUM (
  'ADM',
  'ADV',
  'FIN',
  'ATD',
  'company_admin',
  'manager',
  'lawyer',
  'assistant',
  'company_finance',
  'platform_admin',
  'platform_billing',
  'platform_support'
);

-- AlterTable: User.role String -> UserRole
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";

-- AlterTable: CompanyMembership.role String -> UserRole
ALTER TABLE "CompanyMembership" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
