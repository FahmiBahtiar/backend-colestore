-- CreateTable
CREATE TABLE "product_checkout_fields" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_checkout_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_checkout_answers" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "checkoutFieldId" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_checkout_answers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_checkout_fields" ADD CONSTRAINT "product_checkout_fields_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_checkout_answers" ADD CONSTRAINT "order_item_checkout_answers_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_checkout_answers" ADD CONSTRAINT "order_item_checkout_answers_checkoutFieldId_fkey" FOREIGN KEY ("checkoutFieldId") REFERENCES "product_checkout_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
