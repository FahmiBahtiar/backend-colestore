# Colestore API & Frontend Integration Guide

Dokumen ini dibuat untuk tim Frontend yang akan membangun aplikasi Colestore dengan Next.js. Isinya mencakup endpoint backend, format request/response, flow kerja sistem, dan checklist pekerjaan FE.

## 1. Ringkasan

- Backend: NestJS dengan global prefix `/api/v1`.
- Local base URL: `http://localhost:3001/api/v1`.
- Swagger non-production: `http://localhost:3001/docs`.
- Auth: JWT Bearer token, access token + refresh token.
- Role: `BUYER` dan `ADMIN`.
- Produk: digital product, category, variant, stock, dan `digitalFileKey`.
- Order: buyer membuat order, backend membuat Xendit invoice, webhook mengubah status pembayaran.
- Fulfillment: admin memproses, deliver, refund, atau cancel order.

## 2. Konfigurasi FE

Tambahkan env di Next.js:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
API_BASE_URL=http://localhost:3001/api/v1
```

Catatan:

- `NEXT_PUBLIC_API_BASE_URL` dipakai jika request langsung dari browser.
- `API_BASE_URL` dipakai jika request lewat Server Actions atau Route Handler.
- Backend default CORS origin adalah `http://localhost:3000`; sesuaikan jika domain FE berubah.

## 3. Standar Request

Header JSON:

```http
Content-Type: application/json
```

Header auth untuk endpoint private:

```http
Authorization: Bearer <accessToken>
```

Backend memakai strict validation:

- Jangan kirim field yang tidak ada di DTO, karena request akan ditolak.
- Angka harus dikirim sebagai number, bukan string.
- Password minimal 8 karakter.
- `quantity` minimal 1.

## 4. Standar Response

Semua response sukses dibungkus dengan envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-05-23T08:00:00.000Z"
}
```

Response error:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["email must be an email"],
  "timestamp": "2026-05-23T08:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

FE wajib membaca payload utama dari `data`. Untuk error, tampilkan `message` dan detail `errors` jika tersedia. Endpoint `DELETE` yang mengembalikan `204` harus di-handle sebagai empty response.

## 5. Enum Penting

```ts
type Role = 'ADMIN' | 'BUYER';
type DiscountType = 'PERCENTAGE' | 'FIXED';
type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
```

Arti status order:

| Status | Arti | UI FE |
| --- | --- | --- |
| `PENDING` | Order dibuat dan menunggu pembayaran invoice. | Tampilkan CTA bayar. |
| `PAID` | Pembayaran sukses dari webhook Xendit. | Tampilkan menunggu proses admin. |
| `PROCESSING` | Admin sedang memproses order. | Tampilkan sedang diproses. |
| `DELIVERED` | Produk digital sudah dikirim. | Tampilkan selesai dan delivery note. |
| `CANCELLED` | Order dibatalkan, expired, atau gagal bayar. | Tampilkan gagal/dibatalkan. |
| `REFUNDED` | Order direfund. | Tampilkan refund. |

## 6. Query List

List endpoint saat ini memakai query `skip` dan `take`.

```text
GET /products?skip=0&take=20&categoryId=clwcategory123
```

| Query | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `skip` | number | No | Offset data. |
| `take` | number | No | Jumlah data. |
| `categoryId` | string | No | Khusus products. |

## 7. Authentication

Base path: `/auth`

### POST `/auth/register`

Public. Membuat akun buyer.

Request:

```json
{
  "email": "buyer@example.com",
  "password": "StrongPassword123!",
  "name": "Jane Buyer"
}
```

Response `data`:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "clwuser123",
    "email": "buyer@example.com",
    "name": "Jane Buyer",
    "role": "BUYER"
  }
}
```

### POST `/auth/login`

Public. Login user.

Request:

```json
{
  "email": "buyer@example.com",
  "password": "StrongPassword123!"
}
```

Response sama seperti register.

### POST `/auth/refresh`

Public. Refresh token pair.

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response sama seperti login dengan token baru.

### GET `/auth/profile`

Private. Butuh Bearer token.

Response `data` adalah user dari JWT payload:

```json
{
  "id": "clwuser123",
  "email": "buyer@example.com",
  "role": "BUYER"
}
```

Pekerjaan FE:

- Buat login/register form.
- Simpan access token dan refresh token dengan aman.
- Tambahkan refresh-token retry ketika response `401`.
- Redirect berdasarkan role: buyer ke storefront/account, admin ke dashboard admin.

## 8. Categories

Base path: `/categories`

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| GET | `/categories` | No | Public | List kategori. |
| GET | `/categories/:id` | No | Public | Detail kategori. |
| POST | `/categories` | Yes | ADMIN | Buat kategori. |
| PATCH | `/categories/:id` | Yes | ADMIN | Update kategori. |
| DELETE | `/categories/:id` | Yes | ADMIN | Delete kategori, response `204`. |

Create category request:

```json
{
  "name": "Design Assets",
  "slug": "design-assets"
}
```

Update category request, semua field optional:

```json
{
  "name": "Updated Category",
  "slug": "updated-category"
}
```

Pekerjaan FE:

- Public category list untuk filter katalog.
- Admin CRUD kategori.
- Validasi `name` dan `slug` minimal 2 karakter.

## 9. Products

Base path: `/products`

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| GET | `/products` | No | Public | List produk aktif. |
| GET | `/products/:id` | No | Public | Detail produk. |
| POST | `/products` | Yes | ADMIN | Buat produk. |
| PATCH | `/products/:id` | Yes | ADMIN | Update produk. |
| DELETE | `/products/:id` | Yes | ADMIN | Deactivate produk, response `204`. |
| POST | `/products/:id/variants` | Yes | ADMIN | Buat variant produk. |

Create product request:

```json
{
  "name": "Premium Icon Pack",
  "slug": "premium-icon-pack",
  "description": "A curated set of SVG icons.",
  "basePrice": 99000,
  "hasVariants": false,
  "stockQuantity": 100,
  "digitalFileKey": "products/icons.zip",
  "categoryId": "clwcategory123"
}
```

Update product request, semua field optional:

```json
{
  "name": "Premium Icon Pack v2",
  "description": "Updated product description.",
  "basePrice": 129000,
  "isActive": true,
  "stockQuantity": 50,
  "digitalFileKey": "products/icons-v2.zip",
  "categoryId": "clwcategory123"
}
```

Create variant request:

```json
{
  "name": "Commercial License",
  "price": 199000,
  "stockQuantity": 25
}
```

Product response fields penting:

```ts
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
  hasVariants: boolean;
  stockQuantity: number | null;
  digitalFileKey: string | null;
  categoryId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};
```

Pekerjaan FE:

- Public catalog dan product detail.
- Jika `hasVariants === true`, buyer wajib memilih variant sebelum checkout.
- Jika `stockQuantity === 0`, disable checkout.
- Jangan jadikan `digitalFileKey` sebagai URL download publik.
- Admin product form perlu membuat produk dan optional variant.
- Update product belum mendukung update `slug`.

## 10. Orders

Base path: `/orders`

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| POST | `/orders` | Yes | BUYER | Buat order dan invoice Xendit. |
| GET | `/orders/me` | Yes | BUYER | List order user login. |
| GET | `/orders` | Yes | ADMIN | List semua order. |
| GET | `/orders/:id` | Yes | BUYER/ADMIN | Detail order. |
| DELETE | `/orders/:id` | Yes | ADMIN | Cancel order. |

Place order request:

```json
{
  "items": [
    {
      "productId": "clwproduct123",
      "variantId": null,
      "quantity": 1
    }
  ],
  "couponCode": "LAUNCH25"
}
```

Place order response `data`:

```json
{
  "order": {
    "id": "clworder123",
    "userId": "clwuser123",
    "totalAmount": 99000,
    "discountAmount": 24750,
    "finalAmount": 74250,
    "status": "PENDING",
    "xenditInvoiceId": "invoice-id",
    "xenditInvoiceUrl": "https://checkout.xendit.co/web/invoice-id",
    "xenditInvoiceExpiresAt": "2026-05-24T08:00:00.000Z",
    "paymentProof": null,
    "deliveredAt": null,
    "deliveredById": null,
    "deliveryNote": null,
    "couponId": "clwcoupon123",
    "createdAt": "2026-05-23T08:00:00.000Z",
    "updatedAt": "2026-05-23T08:00:00.000Z"
  },
  "invoiceId": "invoice-id",
  "invoiceUrl": "https://checkout.xendit.co/web/invoice-id"
}
```

Cara kerja order:

1. Backend mengambil produk dan memastikan produk bisa dibeli.
2. Jika produk memiliki variant, `variantId` wajib dan harus milik produk tersebut.
3. Harga memakai variant price jika ada, jika tidak memakai `basePrice`.
4. Stok produk/variant dikurangi saat order dibuat.
5. Coupon divalidasi dan discount dihitung jika `couponCode` dikirim.
6. Order dibuat dengan status `PENDING`.
7. Backend membuat Xendit invoice.
8. FE menerima `invoiceUrl` untuk redirect pembayaran.

Pekerjaan FE:

- Validasi cart sebelum submit.
- Redirect buyer ke `invoiceUrl` setelah order sukses.
- Buat halaman order detail/status.
- Poll/refetch order setelah user kembali dari Xendit.
- Tampilkan badge status berdasarkan `OrderStatus`.

## 11. Payments

Base path: `/payments`

### POST `/payments/xendit/webhook`

Endpoint ini untuk Xendit, bukan FE.

Header:

```http
x-callback-token: <xendit-callback-token>
```

Cara kerja:

- Backend memverifikasi callback token.
- Payload webhook diparse oleh payment gateway service.
- Order dicari berdasarkan `xenditInvoiceId`.
- Status `PAID` mengubah order menjadi `PAID`.
- Status `EXPIRED` atau `FAILED` mengubah order menjadi `CANCELLED`.
- Status lain mengembalikan `processed: false`.

Pekerjaan FE:

- Jangan panggil webhook dari browser.
- Gunakan `/orders/:id` atau `/orders/me` untuk mengetahui status pembayaran.

## 12. Coupons

Base path: `/coupons`

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| GET | `/coupons` | Yes | ADMIN | List coupon. |
| GET | `/coupons/:id` | Yes | ADMIN | Detail coupon. |
| POST | `/coupons` | Yes | ADMIN | Buat coupon. |
| PATCH | `/coupons/:id` | Yes | ADMIN | Update coupon. |
| DELETE | `/coupons/:id` | Yes | ADMIN | Delete coupon, response `204`. |
| POST | `/coupons/validate` | Yes | BUYER/ADMIN | Validasi coupon untuk checkout. |

Create coupon request:

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

Validate coupon request:

```json
{
  "code": "LAUNCH25",
  "orderAmount": 250000
}
```

Validate coupon response `data`:

```json
{
  "coupon": {
    "id": "clwcoupon123",
    "code": "LAUNCH25",
    "discountType": "PERCENTAGE",
    "discountValue": 25,
    "minOrderAmount": 100000,
    "maxUses": 100,
    "usedCount": 0,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "isActive": true
  },
  "discountAmount": 62500,
  "finalAmount": 187500
}
```

Pekerjaan FE:

- Checkout memanggil `/coupons/validate` untuk preview diskon.
- Tetap kirim `couponCode` ke `/orders`; backend menghitung ulang discount saat order dibuat.
- Admin CRUD coupon.

## 13. Fulfillment Admin

Base path: `/admin/orders`

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| PATCH | `/admin/orders/:id/processing` | Yes | ADMIN | Mulai proses order. |
| PATCH | `/admin/orders/:id/deliver` | Yes | ADMIN | Tandai order delivered. |
| PATCH | `/admin/orders/:id/refund` | Yes | ADMIN | Refund order. |

Deliver request:

```json
{
  "deliveryNote": "Delivered via email with setup notes."
}
```

Pekerjaan FE:

- Admin order detail harus punya action processing, deliver, refund.
- `deliveryNote` optional, maksimal 2000 karakter.
- Tambahkan confirmation dialog untuk refund.

## 14. Users Admin

Base path: `/users`

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| GET | `/users` | Yes | ADMIN | List users. |
| GET | `/users/:id` | Yes | ADMIN | Detail user. |
| PATCH | `/users/:id` | Yes | ADMIN | Update user. |
| DELETE | `/users/:id` | Yes | ADMIN | Deactivate user, response `204`. |

Update user request:

```json
{
  "name": "Admin Cole",
  "role": "ADMIN",
  "isActive": true
}
```

Pekerjaan FE:

- Admin user list/detail/edit.
- Role select hanya `ADMIN` atau `BUYER`.
- Delete user adalah deactivate, bukan hard delete.

## 15. Flow Utama FE

### 15.1 Auth Flow

1. User register/login.
2. FE menerima `accessToken`, `refreshToken`, dan `user`.
3. FE menyimpan session.
4. Request private memakai Bearer token.
5. Jika `401`, FE memanggil `/auth/refresh`.
6. Jika refresh gagal, hapus session dan redirect ke login.

### 15.2 Buyer Checkout Flow

1. Buyer browse `/categories` dan `/products`.
2. Buyer membuka `/products/:id`.
3. Buyer memilih variant jika produk punya variant.
4. Buyer apply coupon via `/coupons/validate` jika ada.
5. Buyer submit `/orders`.
6. FE redirect ke `invoiceUrl`.
7. Xendit memanggil webhook backend.
8. FE refetch/poll order detail sampai status berubah.
9. Admin memproses dan deliver order.

### 15.3 Admin Flow

1. Admin login dan role dicek `ADMIN`.
2. Admin mengelola categories, products, variants, coupons, users.
3. Admin melihat order di `/orders`.
4. Admin mengubah status via fulfillment endpoint.

## 16. Rekomendasi Struktur Next.js

```text
app/
  (public)/
    page.tsx
    products/page.tsx
    products/[id]/page.tsx
    categories/[slug]/page.tsx
  (auth)/
    login/page.tsx
    register/page.tsx
  (buyer)/
    checkout/page.tsx
    orders/page.tsx
    orders/[id]/page.tsx
  admin/
    page.tsx
    products/page.tsx
    products/new/page.tsx
    products/[id]/edit/page.tsx
    categories/page.tsx
    coupons/page.tsx
    orders/page.tsx
    orders/[id]/page.tsx
    users/page.tsx
```

## 17. API Client FE

Buat envelope type:

```ts
type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: unknown;
  timestamp: string;
  path?: string;
};
```

API client perlu:

- Inject `Authorization` otomatis.
- Parse response envelope.
- Handle empty body untuk `204`.
- Normalize error.
- Retry refresh token untuk `401`.
- Invalidate/refetch data setelah mutation.

## 18. Hal yang Perlu Dikonfirmasi dengan Backend

1. Endpoint upload file digital belum tersedia; saat ini admin hanya mengirim `digitalFileKey`.
2. Endpoint download file digital untuk buyer belum tersedia; jangan expose `digitalFileKey` di FE.
3. Ownership order detail untuk buyer perlu dipastikan di backend.
4. Tidak ada endpoint logout; logout dilakukan FE dengan hapus token/session.
5. Refresh token dikirim lewat body, belum lewat cookie httpOnly dari backend.
6. Update product belum mendukung update `slug`.
7. Stok berkurang saat order `PENDING`; perlu dikonfirmasi apakah stok dikembalikan saat expired/cancelled.
8. Queue order processing masih placeholder.
9. Response list perlu diverifikasi apakah berupa array langsung atau object dengan metadata.

## 19. Checklist Implementasi FE

- [ ] Setup env API base URL.
- [ ] Buat `ApiEnvelope<T>` dan API client wrapper.
- [ ] Implement register, login, refresh token, profile.
- [ ] Implement token/session storage yang aman.
- [ ] Implement route guard buyer dan admin.
- [ ] Implement public products dan categories.
- [ ] Implement product detail dan variant selection.
- [ ] Implement checkout, validate coupon, place order, redirect invoice.
- [ ] Implement order history dan order detail/status polling.
- [ ] Implement admin categories CRUD.
- [ ] Implement admin products CRUD dan variants.
- [ ] Implement admin coupons CRUD.
- [ ] Implement admin users management.
- [ ] Implement admin orders dan fulfillment actions.
- [ ] Implement global loading, empty state, error toast/banner.
- [ ] Implement format Rupiah dan date-time.
- [ ] Konfirmasi endpoint upload/download digital file.
- [ ] Konfirmasi ownership order detail untuk buyer.

## 20. Quick Endpoint Matrix

| Method | Endpoint | Auth | Role | Fungsi |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | No | Public | Register buyer. |
| POST | `/auth/login` | No | Public | Login. |
| POST | `/auth/refresh` | No | Public | Refresh token. |
| GET | `/auth/profile` | Yes | Any | Profile user login. |
| GET | `/categories` | No | Public | List categories. |
| GET | `/categories/:id` | No | Public | Detail category. |
| POST | `/categories` | Yes | ADMIN | Create category. |
| PATCH | `/categories/:id` | Yes | ADMIN | Update category. |
| DELETE | `/categories/:id` | Yes | ADMIN | Delete category. |
| GET | `/products` | No | Public | List active products. |
| GET | `/products/:id` | No | Public | Product detail. |
| POST | `/products` | Yes | ADMIN | Create product. |
| PATCH | `/products/:id` | Yes | ADMIN | Update product. |
| DELETE | `/products/:id` | Yes | ADMIN | Deactivate product. |
| POST | `/products/:id/variants` | Yes | ADMIN | Create variant. |
| POST | `/orders` | Yes | BUYER | Place order. |
| GET | `/orders/me` | Yes | BUYER | My orders. |
| GET | `/orders` | Yes | ADMIN | All orders. |
| GET | `/orders/:id` | Yes | BUYER/ADMIN | Order detail. |
| DELETE | `/orders/:id` | Yes | ADMIN | Cancel order. |
| POST | `/payments/xendit/webhook` | Header token | Xendit | Payment webhook. |
| GET | `/coupons` | Yes | ADMIN | List coupons. |
| GET | `/coupons/:id` | Yes | ADMIN | Detail coupon. |
| POST | `/coupons` | Yes | ADMIN | Create coupon. |
| PATCH | `/coupons/:id` | Yes | ADMIN | Update coupon. |
| DELETE | `/coupons/:id` | Yes | ADMIN | Delete coupon. |
| POST | `/coupons/validate` | Yes | BUYER/ADMIN | Validate coupon. |
| GET | `/admin/dashboard` | Yes | ADMIN | Dashboard snapshot (query: `startDate`, `endDate`, `days`, `topProductsLimit`, `recentOrdersLimit`, `recentActivityLimit`, `lowStockThreshold`). |
| GET | `/admin/activity-logs` | Yes | ADMIN | Activity logs (query: `category`, `skip`, `take`). |
| PATCH | `/admin/orders/:id/processing` | Yes | ADMIN | Start processing. |
| PATCH | `/admin/orders/:id/deliver` | Yes | ADMIN | Deliver order. |
| PATCH | `/admin/orders/:id/refund` | Yes | ADMIN | Refund order. |
| GET | `/users` | Yes | ADMIN | List users. |
| GET | `/users/:id` | Yes | ADMIN | User detail. |
| PATCH | `/users/:id` | Yes | ADMIN | Update user. |
| DELETE | `/users/:id` | Yes | ADMIN | Deactivate user. |