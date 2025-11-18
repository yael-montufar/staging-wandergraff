-- CreateEnum
CREATE TYPE "ArtistRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ArtistRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ArtistRequestStatus" NOT NULL DEFAULT 'PENDING',
    "artistName" TEXT,
    "website" TEXT,
    "bio" TEXT,
    "statement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistRequest_userId_idx" ON "ArtistRequest"("userId");

-- CreateIndex
CREATE INDEX "ArtistRequest_status_idx" ON "ArtistRequest"("status");

-- CreateIndex
CREATE INDEX "ArtistRequest_createdAt_idx" ON "ArtistRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistRequest_userId_key" ON "ArtistRequest"("userId");

-- AddForeignKey
ALTER TABLE "ArtistRequest" ADD CONSTRAINT "ArtistRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
