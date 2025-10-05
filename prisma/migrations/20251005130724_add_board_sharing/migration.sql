-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "shareWithOrganization" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "shareAllBoardsByDefault" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "board_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_members_userId_idx" ON "board_members"("userId");

-- CreateIndex
CREATE INDEX "board_members_boardId_idx" ON "board_members"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "board_members_userId_boardId_key" ON "board_members"("userId", "boardId");

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
