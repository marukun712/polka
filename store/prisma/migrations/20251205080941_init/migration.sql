-- CreateTable
CREATE TABLE "Metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "did" TEXT NOT NULL,
    "nsid" TEXT NOT NULL,
    "rpath" TEXT NOT NULL,
    "ptr" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_MetadataToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MetadataToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Metadata" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MetadataToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_MetadataToTag_AB_unique" ON "_MetadataToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_MetadataToTag_B_index" ON "_MetadataToTag"("B");
