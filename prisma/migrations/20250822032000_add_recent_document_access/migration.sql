-- CreateTable
CREATE TABLE "RecentDocumentAccess" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentDocumentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecentDocumentAccess_userId_accessedAt_idx" ON "RecentDocumentAccess"("userId", "accessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecentDocumentAccess_userId_documentId_key" ON "RecentDocumentAccess"("userId", "documentId");

-- AddForeignKey
ALTER TABLE "RecentDocumentAccess" ADD CONSTRAINT "RecentDocumentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentDocumentAccess" ADD CONSTRAINT "RecentDocumentAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
