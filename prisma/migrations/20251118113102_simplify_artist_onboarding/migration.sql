/*
  Warnings:

  - You are about to drop the `ArtistRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ArtistRequest" DROP CONSTRAINT "ArtistRequest_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "artistBio" TEXT,
ADD COLUMN     "artistEmail" TEXT,
ADD COLUMN     "artistInstagram" TEXT,
ADD COLUMN     "artistName" TEXT,
ADD COLUMN     "artistTwitter" TEXT,
ADD COLUMN     "artistWebsite" TEXT;

-- DropTable
DROP TABLE "ArtistRequest";

-- DropEnum
DROP TYPE "ArtistRequestStatus";
