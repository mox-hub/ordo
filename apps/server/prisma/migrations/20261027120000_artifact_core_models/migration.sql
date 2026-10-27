-- 产物管理双表（CAP-A-32，2026-10-27）：统一产物层 Artifact + ArtifactVersion。
-- 手插迁移（本仓迁移历史不可重放，migrate dev 不可用，沿 baseline+探针后的既定三步法）；
-- SQL 由 prisma migrate diff（from dev.db → to schema）精选本批对象，勿夹带存量漂移。
-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "issueId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'upload',
    "name" TEXT NOT NULL,
    "logicalPath" TEXT,
    "documentId" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "createdBy" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArtifactVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artifactId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "storagePath" TEXT,
    "executionId" TEXT,
    "commitSha" TEXT,
    "diffStat" JSONB,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "documentVersionId" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtifactVersion_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_artifacts_project_id" ON "Artifact"("projectId");

-- CreateIndex
CREATE INDEX "idx_artifacts_issue_id" ON "Artifact"("issueId");

-- CreateIndex
CREATE INDEX "idx_artifacts_kind" ON "Artifact"("kind");

-- CreateIndex
CREATE INDEX "idx_artifacts_document_id" ON "Artifact"("documentId");

-- CreateIndex
CREATE INDEX "idx_artifacts_is_deleted" ON "Artifact"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_projectId_logicalPath_kind_key" ON "Artifact"("projectId", "logicalPath", "kind");

-- CreateIndex
CREATE INDEX "idx_artifact_versions_execution_id" ON "ArtifactVersion"("executionId");

-- CreateIndex
CREATE INDEX "idx_artifact_versions_artifact_id" ON "ArtifactVersion"("artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactVersion_artifactId_version_key" ON "ArtifactVersion"("artifactId", "version");
