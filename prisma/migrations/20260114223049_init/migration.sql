-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "googleId" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "visaEmail" TEXT NOT NULL,
    "visaPassword" TEXT NOT NULL,
    "currentDate" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL DEFAULT '25',
    "notEarlierThan" TEXT,
    "status" TEXT NOT NULL,
    "processId" INTEGER,
    "lastCheck" DATETIME,
    "lastMessage" TEXT,
    "foundDates" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "successDate" TEXT,
    "successTime" TEXT,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
