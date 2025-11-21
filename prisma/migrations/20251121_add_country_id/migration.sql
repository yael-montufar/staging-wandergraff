-- Add countryId column to Artwork table
ALTER TABLE "Artwork" ADD COLUMN "countryId" TEXT;

-- Create foreign key constraint
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for countryId queries
CREATE INDEX "Artwork_countryId_idx" ON "Artwork" ("countryId");
