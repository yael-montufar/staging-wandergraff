-- Add gallery management fields to Artwork model
ALTER TABLE "Artwork" ADD COLUMN "galleryPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Artwork" ADD COLUMN "galleryPreset" TEXT NOT NULL DEFAULT 'preset_1';
ALTER TABLE "Artwork" ADD COLUMN "galleryImageOrder" JSONB NOT NULL DEFAULT '[]';
