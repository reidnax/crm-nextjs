-- CreateTable
CREATE TABLE "public"."KpiDepartments" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiDepartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KpiGoals" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "level" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "periodLabel" TEXT NOT NULL,
    "target" TEXT,
    "actual" TEXT,
    "actualNumeric" DECIMAL(18,4),
    "status" TEXT,
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enteredBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiGoals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KpiActionItems" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target" TEXT,
    "actual" TEXT,
    "owner" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiActionItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiDepartments_key_key" ON "public"."KpiDepartments"("key");

-- CreateIndex
CREATE INDEX "KpiGoals_departmentId_level_periodLabel_idx" ON "public"."KpiGoals"("departmentId", "level", "periodLabel");

-- CreateIndex
CREATE INDEX "KpiGoals_parentId_idx" ON "public"."KpiGoals"("parentId");

-- CreateIndex
CREATE INDEX "KpiActionItems_goalId_idx" ON "public"."KpiActionItems"("goalId");

-- AddForeignKey
ALTER TABLE "public"."KpiGoals" ADD CONSTRAINT "KpiGoals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."KpiDepartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KpiGoals" ADD CONSTRAINT "KpiGoals_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."KpiGoals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KpiGoals" ADD CONSTRAINT "KpiGoals_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KpiActionItems" ADD CONSTRAINT "KpiActionItems_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."KpiGoals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KpiActionItems" ADD CONSTRAINT "KpiActionItems_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
