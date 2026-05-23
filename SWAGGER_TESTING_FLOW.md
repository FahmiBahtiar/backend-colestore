# Swagger Testing Flow

Panduan ini berisi urutan testing manual lewat Swagger UI dari register sampai order dan pembayaran.

## 0. Persiapan

1. Jalankan dependency dan aplikasi backend.
   ```bash
   docker compose up -d postgres redis minio
   npm run start:dev
   ```
2. Buka Swagger UI.
   ```text
   http://localhost:3001/docs
   ```
3. Siapkan dua akun:
   - Buyer: dibuat lewat endpoint register.
   - Admin: register dulu sebagai buyer, lalu ubah role di database menjadi `ADMIN`.

## 1. Register Buyer

Endpoint: `POST /api/v1/auth/register`

Body:
```json
{
  "email": "buyer@example.com",
  "password": "StrongPassword123!",
  "name": "Jane Buyer"
}
```

Simpan dari response:
- `accessToken` sebagai `BUYER_ACCESS_TOKEN`
- `refreshToken` bila ingin test refresh token
- `user.id` sebagai `BUYER_ID`

## 2. Register Admin Candidate

Endpoint: `POST /api/v1/auth/register`

Body:
```json
{
  "email": "admin@example.com",
  "password": "StrongPassword123!",
  "name": "Admin Cole"
}
```

User baru tetap dibuat sebagai `BUYER`. Ubah role-nya menjadi admin di database:
```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'admin@example.com';
```

Alternatif via Prisma Studio:
```bash
npm run prisma:studio
```
Lalu buka tabel `users` dan ubah `role` dari `BUYER` ke `ADMIN`.

## 3. Login Admin

Endpoint: `POST /api/v1/auth/login`

Body:
```json
{
  "email": "admin@example.com",
  "password": "StrongPassword123!"
}
```

Simpan `accessToken` sebagai `ADMIN_ACCESS_TOKEN`.

Di Swagger, klik `Authorize`, masukkan:
```text
Bearer ADMIN_ACCESS_TOKEN
```

## 4. Create Category

Role: Admin

Endpoint: `POST /api/v1/categories`

Body:
```json
{
  "name": "Design Assets",
  "slug": "design-assets"
}
```

Simpan `id` dari response sebagai `CATEGORY_ID`.

## 5. Create Product Tanpa Variant

Role: Admin

Endpoint: `POST /api/v1/products`

Body:
```json
{
  "name": "Premium Icon Pack",
  "slug": "premium-icon-pack",
  "description": "A curated set of SVG icons.",
  "basePrice": 99000,
  "hasVariants": false,
  "stockQuantity": 100,
  "digitalFileKey": "products/icons.zip",
  "categoryId": "CATEGORY_ID"
}
```

Simpan `id` sebagai `PRODUCT_ID_NO_VARIANT`.

## 6. Create Product Dengan Variant

Role: Admin

Endpoint: `POST /api/v1/products`

Body:
```json
{
  "name": "Template Bundle",
  "slug": "template-bundle",
  "description": "Digital template bundle with multiple licenses.",
  "basePrice": 149000,
  "hasVariants": true,
  "digitalFileKey": "products/template-bundle.zip",
  "categoryId": "CATEGORY_ID"
}
```

Catatan:
- Untuk product dengan `hasVariants: true`, jangan kirim `stockQuantity` di product.
- Stock dikelola di variant.

Simpan `id` sebagai `PRODUCT_ID_WITH_VARIANT`.

## 7. Create Product Variant

Role: Admin

Endpoint: `POST /api/v1/products/{PRODUCT_ID_WITH_VARIANT}/variants`

Body:
```json
{
  "name": "Commercial License",
  "price": 249000,
  "stockQuantity": 25
}
```

Simpan `id` dari response sebagai `VARIANT_ID`.

## 8. Create Coupon Opsional

Role: Admin

Endpoint: `POST /api/v1/coupons`

Body:
```json
{
  "code": "LAUNCH25",
  "discountType": "PERCENTAGE",
  "discountValue": 25,
  "minOrderAmount": 100000,
  "maxUses": 100,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "isActive": true
}
```

## 9. Login Buyer dan Authorize Swagger

Endpoint: `POST /api/v1/auth/login`

Body:
```json
{
  "email": "buyer@example.com",
  "password": "StrongPassword123!"
}
```

Simpan `accessToken` sebagai `BUYER_ACCESS_TOKEN`.

Di Swagger, klik `Authorize`, ganti token menjadi:
```text
Bearer BUYER_ACCESS_TOKEN
```

## 10. Place Order Untuk Product Tanpa Variant

Role: Buyer

Endpoint: `POST /api/v1/orders`

Body:
```json
{
  "items": [
    {
      "productId": "PRODUCT_ID_NO_VARIANT",
      "quantity": 1
    }
  ],
  "couponCode": "LAUNCH25"
}
```

Catatan:
- Jangan kirim `variantId` untuk product tanpa variant.
- Simpan response:
  - `order.id` sebagai `ORDER_ID`
  - `invoiceId` sebagai `XENDIT_INVOICE_ID`
  - `invoiceUrl` untuk membuka halaman pembayaran Xendit bila Xendit aktif.

## 11. Place Order Untuk Product Dengan Variant

Role: Buyer

Endpoint: `POST /api/v1/orders`

Body:
```json
{
  "items": [
    {
      "productId": "PRODUCT_ID_WITH_VARIANT",
      "variantId": "VARIANT_ID",
      "quantity": 1
    }
  ]
}
```

Catatan:
- `variantId` wajib untuk product dengan `hasVariants: true`.
- Gunakan ID variant dari response `POST /products/{id}/variants`.
- Jangan gunakan placeholder seperti `clwvariant123` kecuali ID tersebut benar-benar ada di database.

## 12. Cek Order Buyer

Role: Buyer

Endpoint: `GET /api/v1/orders/me`

Query opsional:
```text
skip=0&take=20
```

Endpoint detail:
```text
GET /api/v1/orders/{ORDER_ID}
```

## 13. Simulasi Pembayaran Via Xendit Webhook

Endpoint: `POST /api/v1/payments/xendit/webhook`

Header:
```text
x-callback-token: XENDIT_WEBHOOK_TOKEN
```

Body untuk menandai invoice sebagai paid:
```json
{
  "id": "XENDIT_INVOICE_ID",
  "status": "PAID",
  "payment_method": "BANK_TRANSFER"
}
```

Alternatif field invoice yang juga diterima:
```json
{
  "invoice_id": "XENDIT_INVOICE_ID",
  "status": "PAID",
  "payment_method": "EWALLET"
}
```

Expected result:
```json
{
  "orderId": "ORDER_ID",
  "status": "PAID",
  "processed": true
}
```

Catatan:
- Jika `.env` mengisi `XENDIT_WEBHOOK_TOKEN`, header `x-callback-token` wajib sama.
- Jika token salah, response akan `401 Invalid Xendit webhook token`.
- Jika invoice ID tidak cocok dengan order, response akan `404 Order not found for invoice`.

## 14. Admin Mulai Fulfillment

Login admin lagi dan authorize Swagger dengan `ADMIN_ACCESS_TOKEN`.

Endpoint: `PATCH /api/v1/fulfillment/{ORDER_ID}/processing`

Body tidak diperlukan bila Swagger tidak meminta body.

Expected order status: `PROCESSING`.

## 15. Admin Deliver Order

Role: Admin

Endpoint: `PATCH /api/v1/fulfillment/{ORDER_ID}/deliver`

Body:
```json
{
  "deliveryNote": "File sudah dikirim via email buyer.",
  "paymentProof": "Manual delivery proof or admin note"
}
```

Expected order status: `DELIVERED`.

## 16. Admin Cek Semua Order

Role: Admin

Endpoint: `GET /api/v1/orders`

Query opsional:
```text
skip=0&take=20
```

## Troubleshooting

### Error `order_items_variantId_fkey`

Penyebab umum:
- Mengirim `variantId` untuk product tanpa variant.
- Mengirim `variantId` placeholder yang tidak ada di database.
- Mengirim `variantId` yang bukan milik `productId` tersebut.
- Belum membuat variant lewat `POST /products/{id}/variants`.

Solusi:
- Untuk product tanpa variant, hapus field `variantId` dari body order.
- Untuk product dengan variant, pakai `VARIANT_ID` asli dari response create variant.

### Error `Product does not support variants`

Product dibuat dengan `hasVariants: false`, tapi order mengirim `variantId`.

### Error `Variant is required for this product`

Product dibuat dengan `hasVariants: true`, tapi order tidak mengirim `variantId`.

### Error `Product variant not found`

`variantId` yang dikirim tidak ada di tabel `product_variants`.

### Error `Product variant does not belong to product`

Variant ada, tapi milik product lain.