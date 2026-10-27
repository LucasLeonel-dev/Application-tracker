-- O schema.prisma ja tinha companies.normalized_name e os dois unique abaixo,
-- mas a migration init nunca os criou. Esta migration fecha essa divergencia.
-- Idempotente (IF NOT EXISTS) para bancos que ja receberam esses objetos via db push.

-- AlterTable: coluna nullable -> backfill -> NOT NULL (nao quebra se ja houver empresas)
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "normalized_name" TEXT;

-- mesma regra do normalizeCompanyName(): trim + maiusculas + remove todos os espacos
UPDATE "companies"
SET "normalized_name" = UPPER(REGEXP_REPLACE(BTRIM("name"), '\s+', '', 'g'))
WHERE "normalized_name" IS NULL;

ALTER TABLE "companies" ALTER COLUMN "normalized_name" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "applications_user_id_company_id_role_title_key" ON "applications"("user_id", "company_id", "role_title");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "companies_user_id_normalized_name_key" ON "companies"("user_id", "normalized_name");
