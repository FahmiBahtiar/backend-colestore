-- Add persisted Xendit checkout URL metadata for pending order payment recovery.
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "xenditInvoiceUrl" TEXT,
ADD COLUMN IF NOT EXISTS "xenditInvoiceExpiresAt" TIMESTAMP(3);