/*
  Warnings:

  - You are about to drop the `RollTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."RollTemplate" DROP CONSTRAINT "RollTemplate_characterId_fkey";

-- DropTable
DROP TABLE "public"."RollTemplate";

-- CreateTable
CREATE TABLE "public"."Action" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" VARCHAR(25) NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "factorsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActionModifier" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" VARCHAR(25) NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "factorsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionModifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Action_characterId_idx" ON "public"."Action"("characterId");

-- CreateIndex
CREATE INDEX "ActionModifier_characterId_idx" ON "public"."ActionModifier"("characterId");

-- AddForeignKey
ALTER TABLE "public"."Action" ADD CONSTRAINT "Action_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActionModifier" ADD CONSTRAINT "ActionModifier_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
