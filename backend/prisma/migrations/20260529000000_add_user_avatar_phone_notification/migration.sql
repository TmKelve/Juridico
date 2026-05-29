-- Add avatarUrl and phone fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Create Notification table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "recipientUserId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_recipientUserId_fkey'
      AND table_name = 'Notification'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_recipientUserId_fkey"
      FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
