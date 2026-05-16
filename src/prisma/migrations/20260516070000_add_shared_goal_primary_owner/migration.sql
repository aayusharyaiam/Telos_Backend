ALTER TABLE "SharedGoal"
ADD COLUMN IF NOT EXISTS "primaryOwnerId" TEXT;

ALTER TABLE "SharedGoal"
ADD CONSTRAINT "SharedGoal_primaryOwnerId_fkey"
FOREIGN KEY ("primaryOwnerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SharedGoal_primaryOwnerId_idx"
ON "SharedGoal"("primaryOwnerId");
