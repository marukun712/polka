-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "did" TEXT NOT NULL,
    "nsid" TEXT NOT NULL,
    "rpath" TEXT NOT NULL,
    "sig" TEXT NOT NULL,
    "ptr" TEXT
);
INSERT INTO "new_Metadata" ("did", "id", "nsid", "ptr", "rpath", "sig") SELECT "did", "id", "nsid", "ptr", "rpath", "sig" FROM "Metadata";
DROP TABLE "Metadata";
ALTER TABLE "new_Metadata" RENAME TO "Metadata";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
