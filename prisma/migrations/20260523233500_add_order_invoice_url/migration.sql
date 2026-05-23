-- Add persisted Xendit checkout URL metadata for pending order payment recovery.
ALTER TABLE "orders"
ADD COLUMN "xenditInvoiceUrl" TEXT,
ADD COLUMN "xenditInvoiceExpiresAt" TIMESTAMP(3);
