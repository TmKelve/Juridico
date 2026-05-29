-- Add area field to Process table
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "area" TEXT;
