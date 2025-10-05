-- CreateTable
CREATE TABLE "board_shares" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_shares_boardId_idx" ON "board_shares"("boardId");

-- CreateIndex
CREATE INDEX "board_shares_userId_idx" ON "board_shares"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "board_shares_boardId_userId_key" ON "board_shares"("boardId", "userId");

-- AddForeignKey
ALTER TABLE "board_shares" ADD CONSTRAINT "board_shares_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_shares" ADD CONSTRAINT "board_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
