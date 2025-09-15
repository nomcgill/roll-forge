-- CreateTable
CREATE TABLE "public"."RollGroup" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RollGroup_characterId_createdAt_idx" ON "public"."RollGroup"("characterId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."RollGroup" ADD CONSTRAINT "RollGroup_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
