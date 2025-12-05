/*
  Warnings:

  - Added the required column `updatedAt` to the `Metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "did" TEXT NOT NULL,
    "nsid" TEXT NOT NULL,
    "rpath" TEXT NOT NULL,
    "sig" TEXT NOT NULL,
    "ptr" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Metadata" ("did", "id", "nsid", "ptr", "rpath", "sig") SELECT "did", "id", "nsid", "ptr", "rpath", "sig" FROM "Metadata";
DROP TABLE "Metadata";
ALTER TABLE "new_Metadata" RENAME TO "Metadata";
CREATE TABLE "new_Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tag" ("id", "name") SELECT "id", "name" FROM "Tag";
DROP TABLE "Tag";
ALTER TABLE "new_Tag" RENAME TO "Tag";
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
