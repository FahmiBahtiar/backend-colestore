generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(BUYER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orders        Order[]
  activityLogs  ActivityLog[] @relation("ActorLogs")
  createdProducts Product[] @relation("CreatedByAdmin")

  @@map("users")
}

enum Role {
  ADMIN
  BUYER
}

model Category {
  id   String @id @default(cuid())
  name String @unique
  slug String @unique

  products Product[]
}

model Product {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  basePrice     Decimal
  isActive      Boolean  @default(true)
  hasVariants   Boolean  @default(false)   // kalau true → pakai variant
  stockQuantity Int?     // hanya untuk single product (null = unlimited)
  digitalFileKey String? // reference MinIO path (opsional, admin upload file template)

  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id])

  createdById   String
  createdBy     User     @relation("CreatedByAdmin", fields: [createdById], references: [id])

  variants      ProductVariant[]
  orderItems    OrderItem[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("products")
}

model ProductVariant {
  id            String   @id @default(cuid())
  name          String   // contoh: "Basic", "Pro", "Enterprise"
  price         Decimal? // override harga dari parent
  stockQuantity Int?     // null = unlimited (digital)

  productId     String
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  orderItems    OrderItem[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("product_variants")
}

model Coupon {
  id              String   @id @default(cuid())
  code            String   @unique // redeem code (misal: DISKON50)
  discountType    DiscountType
  discountValue   Decimal
  minOrderAmount  Decimal  @default(0)
  maxUses         Int?     // null = unlimited
  usedCount       Int      @default(0)
  expiresAt       DateTime?
  isActive        Boolean  @default(true)

  orderItems      OrderItem[] // bisa dipakai di banyak order

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("coupons")
}

enum DiscountType {
  PERCENTAGE
  FIXED
}

model Order {
  id                String      @id @default(cuid())
  userId            String
  user              User        @relation(fields: [userId], references: [id])

  totalAmount       Decimal
  discountAmount    Decimal     @default(0)
  finalAmount       Decimal

  status            OrderStatus @default(PENDING)
  xenditInvoiceId   String?     // dari Xendit
  paymentProof      String?     // JSONB atau string dari webhook

  // Manual fulfillment oleh admin
  deliveredAt       DateTime?
  deliveredById     String?
  deliveredBy       User?       @relation("DeliveredBy", fields: [deliveredById], references: [id])
  deliveryNote      String?     // catatan admin (link download, instruksi, dll)

  couponId          String?
  coupon            Coupon?     @relation(fields: [couponId], references: [id])

  items             OrderItem[]
  activityLogs      ActivityLog[] @relation("OrderLogs")

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@map("orders")
}

enum OrderStatus {
  PENDING
  PAID
  PROCESSING
  DELIVERED
  CANCELLED
  REFUNDED
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  productId   String
  product     Product @relation(fields: [productId], references: [id])

  variantId   String?
  variant     ProductVariant? @relation(fields: [variantId], references: [id])

  quantity    Int     @default(1)     // selalu ada, tapi logic di backend bedakan
  unitPrice   Decimal
  subtotal    Decimal

  @@map("order_items")
}

model ActivityLog {
  id          String      @id @default(cuid())
  category    LogCategory // kategori wajib
  action      String      // contoh: "LOGIN_SUCCESS", "PRODUCT_CREATED", "ORDER_PAID"
  entityType  String?     // "User", "Product", "Order"
  entityId    String?     // ID dari entity yang diubah

  actorId     String?     // user yang melakukan aksi (nullable untuk system)
  actor       User?       @relation("ActorLogs", fields: [actorId], references: [id])

  details     Json?       // SUPER DETAIL: { ip, userAgent, oldValues, newValues, metadata, ... }

  createdAt   DateTime    @default(now())

  // Relasi khusus untuk Order
  orderId     String?
  order       Order?      @relation("OrderLogs", fields: [orderId], references: [id])

  @@map("activity_logs")
  @@index([category])
  @@index([action])
  @@index([entityType, entityId])
}

enum LogCategory {
  AUTH          // login, register, logout
  USER
  PRODUCT
  ORDER
  PAYMENT
  DELIVERY
  COUPON
  SYSTEM
  SECURITY
}