# 🧪 Colestore Backend — Testing Documentation

> Dokumen ini untuk memverifikasi bahwa **Step 1 (Project Initialization)** dan **Step 2 (Database & Prisma)** sudah berjalan dengan benar.

---

## 📋 Daftar Isi

- [1. Prerequisites](#1-prerequisites)
- [2. Menjalankan Aplikasi](#2-menjalankan-aplikasi)
- [3. Test: Health Check API](#3-test-health-check-api)
- [4. Test: Swagger Documentation](#4-test-swagger-documentation)
- [5. Test: Error Handling & Response Format](#5-test-error-handling--response-format)
- [6. Test: Rate Limiting](#6-test-rate-limiting)
- [7. Test: Security Headers](#7-test-security-headers)
- [8. Test: Database Connection](#8-test-database-connection)
- [9. Test: Prisma Schema & Migration](#9-test-prisma-schema--migration)
- [10. Test: Docker Services](#10-test-docker-services)
- [11. Checklist: Folder Structure](#11-checklist-folder-structure)
- [12. Checklist: Dependencies](#12-checklist-dependencies)
- [13. Checklist: Code Quality Tools](#13-checklist-code-quality-tools)
- [14. Checklist: Repository Interfaces](#14-checklist-repository-interfaces)
- [15. Checklist: Infrastructure Repositories](#15-checklist-infrastructure-repositories)

---

## 1. Prerequisites

Sebelum testing, pastikan services berjalan:

```bash
# 1. Jalankan Docker services (PostgreSQL, Redis, MinIO)
docker compose up -d

# 2. Verifikasi semua container healthy
docker compose ps

# 3. Jalankan Prisma migration (jika belum)
npx prisma migrate dev

# 4. Generate Prisma Client (jika belum)
npx prisma generate
```

**Expected Output `docker compose ps`:**
| Container | Status |
|-----------|--------|
| colestore-postgres | Up (healthy) |
| colestore-redis | Up (healthy) |
| colestore-minio | Up (healthy) |

---

## 2. Menjalankan Aplikasi

```bash
npm run start:dev
```

**✅ Expected Output:**
```
[Nest] XXXX  - ...     LOG [Bootstrap] 📄 Swagger documentation available at http://localhost:3001/docs
[Nest] XXXX  - ...     LOG [RoutesResolver] AppController {/api/v1}: +Xms
[Nest] XXXX  - ...     LOG [RouterExplorer] Mapped {/api/v1/health, GET} route +Xms
[Nest] XXXX  - ...     LOG [PrismaService] Database connection established
[Nest] XXXX  - ...     LOG [NestApplication] Nest application successfully started +Xms
[Nest] XXXX  - ...     LOG [Bootstrap] 🚀 Colestore Backend running on http://localhost:3001/api/v1
[Nest] XXXX  - ...     LOG [Bootstrap] 🌍 Environment: development
```

**❌ Gagal jika:**
- `PrismaClientConstructorValidationError` → Cek apakah `@prisma/adapter-pg` sudah terpasang
- `ECONNREFUSED` pada port 5432 → PostgreSQL belum running
- `DATABASE_URL is not set` → File `.env` belum dikonfigurasi

---

## 3. Test: Health Check API

```bash
curl -s http://localhost:3001/api/v1/health | jq
```

**✅ Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "status": "ok",
    "timestamp": "2026-05-22T05:41:00.000Z"
  },
  "timestamp": "2026-05-22T05:41:00.000Z"
}
```

**Verifikasi:**
- [ ] `success` = `true`
- [ ] `statusCode` = `200`
- [ ] `data.status` = `"ok"`
- [ ] `data.timestamp` berisi ISO 8601 string
- [ ] Outer `timestamp` juga berisi ISO 8601 string (dari TransformInterceptor)

---

## 4. Test: Swagger Documentation

Buka di browser:
```
http://localhost:3001/docs
```

**Verifikasi:**
- [ ] Swagger UI terbuka tanpa error
- [ ] Title: **"Colestore API"**
- [ ] Description: **"Colestore Digital Product E-Commerce Backend API"**
- [ ] Version: **1.0**
- [ ] Tags visible: `health`, `auth`, `users`, `products`, `categories`, `orders`, `coupons`, `admin`
- [ ] Authorize button (JWT-auth Bearer) tersedia
- [ ] Endpoint `GET /api/v1/health` terdaftar di tag `health`

---

## 5. Test: Error Handling & Response Format

### 5a. Route Not Found (404)

```bash
curl -s http://localhost:3001/api/v1/nonexistent | jq
```

**✅ Expected Response:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Cannot GET /api/v1/nonexistent",
  "timestamp": "...",
  "path": "/api/v1/nonexistent"
}
```

**Verifikasi:**
- [ ] `success` = `false`
- [ ] `statusCode` = `404`
- [ ] `message` berisi informasi route yang tidak ditemukan
- [ ] `path` sesuai dengan URL yang di-request

### 5b. Method Not Allowed

```bash
curl -s -X POST http://localhost:3001/api/v1/health | jq
```

**✅ Expected:** Status code `404` (karena POST /health tidak terdaftar)

### 5c. Invalid JSON Body

```bash
curl -s -X POST http://localhost:3001/api/v1/health \
  -H "Content-Type: application/json" \
  -d "invalid json{{{" | jq
```

**✅ Expected:** Error response dengan `success: false`

---

## 6. Test: Rate Limiting

Konfigurasi saat ini: **100 requests per 60 detik**.

```bash
# Test rapid requests (menggunakan loop)
for i in $(seq 1 105); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health)
  if [ "$STATUS" != "200" ]; then
    echo "Request #$i: HTTP $STATUS (Rate Limited!)"
  fi
done
```

> **Note:** Health check endpoint menggunakan `@SkipThrottle()`, jadi rate limiting di-skip untuk endpoint ini. Test rate limiting harus dilakukan pada endpoint lain yang tidak memiliki decorator `@SkipThrottle()`.

**Verifikasi:**
- [ ] Health endpoint tidak kena rate limit (karena `@SkipThrottle()`)
- [ ] ThrottlerGuard terpasang sebagai global guard di `app.module.ts`

---

## 7. Test: Security Headers

```bash
curl -s -I http://localhost:3001/api/v1/health
```

**✅ Expected Headers (dari Helmet):**
```
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=...
Content-Security-Policy: default-src 'self'; ...
```

**Verifikasi:**
- [ ] `X-Content-Type-Options: nosniff` ada
- [ ] `X-Frame-Options` ada (SAMEORIGIN)
- [ ] `X-DNS-Prefetch-Control: off` ada
- [ ] Tidak ada header `X-Powered-By: Express` (diremove oleh Helmet)

### CORS Headers

```bash
curl -s -I -X OPTIONS http://localhost:3001/api/v1/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

**✅ Expected:**
- [ ] `Access-Control-Allow-Origin: http://localhost:3000`
- [ ] `Access-Control-Allow-Credentials: true`

---

## 8. Test: Database Connection

### 8a. Prisma Studio

```bash
npx prisma studio
```

**✅ Expected:** Browser terbuka di `http://localhost:5555` menampilkan semua tabel.

### 8b. Verifikasi Tabel di PostgreSQL

```bash
docker exec -it colestore-postgres psql -U postgres -d colestore_db -c "\dt"
```

**✅ Expected Output:**
```
              List of relations
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+----------
 public | _prisma_migrations | table | postgres
 public | activity_logs     | table | postgres
 public | categories        | table | postgres
 public | coupons           | table | postgres
 public | order_items       | table | postgres
 public | orders            | table | postgres
 public | product_variants  | table | postgres
 public | products          | table | postgres
 public | users             | table | postgres
```

**Verifikasi:**
- [ ] 8 tabel domain + 1 `_prisma_migrations` = **9 tabel total**
- [ ] Semua nama tabel menggunakan snake_case (sesuai `@@map`)

### 8c. Verifikasi Enum Types

```bash
docker exec -it colestore-postgres psql -U postgres -d colestore_db -c "\dT+"
```

**✅ Expected Enums:**
| Enum | Values |
|------|--------|
| `Role` | ADMIN, BUYER |
| `DiscountType` | PERCENTAGE, FIXED |
| `OrderStatus` | PENDING, PAID, PROCESSING, DELIVERED, CANCELLED, REFUNDED |
| `LogCategory` | AUTH, USER, PRODUCT, ORDER, PAYMENT, DELIVERY, COUPON, SYSTEM, SECURITY |

### 8d. Verifikasi Foreign Keys

```bash
docker exec -it colestore-postgres psql -U postgres -d colestore_db -c "
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
"
```

**✅ Expected Foreign Keys (12 total):**
| Table | Column | → Foreign Table |
|-------|--------|-----------------|
| `activity_logs` | `actorId` | `users` |
| `activity_logs` | `orderId` | `orders` |
| `order_items` | `orderId` | `orders` |
| `order_items` | `productId` | `products` |
| `order_items` | `variantId` | `product_variants` |
| `order_items` | `couponId` | `coupons` |
| `orders` | `userId` | `users` |
| `orders` | `deliveredById` | `users` |
| `orders` | `couponId` | `coupons` |
| `products` | `categoryId` | `categories` |
| `products` | `createdById` | `users` |
| `product_variants` | `productId` | `products` |

### 8e. Verifikasi Indexes

```bash
docker exec -it colestore-postgres psql -U postgres -d colestore_db -c "
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname NOT LIKE '%pkey%'
ORDER BY tablename;
"
```

**✅ Expected Indexes:**
| Index | Table |
|-------|-------|
| `activity_logs_category_idx` | `activity_logs` |
| `activity_logs_action_idx` | `activity_logs` |
| `activity_logs_entityType_entityId_idx` | `activity_logs` |
| `users_email_key` | `users` |
| `products_slug_key` | `products` |
| `categories_name_key` | `categories` |
| `categories_slug_key` | `categories` |
| `coupons_code_key` | `coupons` |

---

## 9. Test: Prisma Schema & Migration

### 9a. Prisma Validate

```bash
npx prisma validate
```

**✅ Expected:** `The schema at prisma/schema.prisma is valid 🚀`

### 9b. Migration Status

```bash
npx prisma migrate status
```

**✅ Expected:**
```
1 migration found in prisma/migrations
...
Database schema is up to date!
```

### 9c. Prisma Generate

```bash
npx prisma generate
```

**✅ Expected:** `✔ Generated Prisma Client` tanpa error.

---

## 10. Test: Docker Services

### 10a. PostgreSQL

```bash
docker exec -it colestore-postgres pg_isready -U postgres -d colestore_db
```

**✅ Expected:** `localhost:5432 - accepting connections`

### 10b. Redis

```bash
docker exec -it colestore-redis redis-cli -a redis123 PING
```

**✅ Expected:** `PONG`

### 10c. MinIO

```bash
curl -s http://localhost:9000/minio/health/live
```

**✅ Expected:** HTTP 200 OK

**MinIO Console:**
- Buka browser: `http://localhost:9001`
- Login: `minioadmin` / `minioadmin123`

---

## 11. Checklist: Folder Structure

Jalankan command ini untuk melihat struktur:

```bash
find src -type d | sort
```

**✅ Expected Structure:**
```
src
src/application
src/application/dtos
src/application/interfaces
src/application/mappers
src/application/use-cases
src/common
src/common/constants
src/common/decorators
src/common/utils
src/config
src/domain
src/domain/entities          ← (empty, Step 4)
src/domain/events            ← (empty, Step 4)
src/domain/repositories      ← ✅ 8 files
src/domain/value-objects     ← (empty, Step 4)
src/infrastructure
src/infrastructure/config
src/infrastructure/prisma
src/infrastructure/queue
src/infrastructure/repositories  ← ✅ 9 files
src/infrastructure/services
src/presentation
src/presentation/controllers
src/presentation/decorators
src/presentation/filters
src/presentation/guards
src/presentation/interceptors
src/presentation/pipes
src/prisma
```

**Verifikasi:**
- [ ] `domain/` — entities, events, repositories, value-objects
- [ ] `application/` — dtos, interfaces, mappers, use-cases
- [ ] `infrastructure/` — config, prisma, queue, repositories, services
- [ ] `presentation/` — controllers, decorators, filters, guards, interceptors, pipes
- [ ] `common/` — constants, decorators, utils
- [ ] `config/` — typed configuration

---

## 12. Checklist: Dependencies

Jalankan:
```bash
npm ls --depth=0 2>/dev/null | head -40
```

### Production Dependencies ✅

| Package | Status | Purpose |
|---------|--------|---------|
| `@nestjs/common` | ✅ | NestJS core |
| `@nestjs/core` | ✅ | NestJS core |
| `@nestjs/platform-express` | ✅ | Express adapter |
| `@nestjs/config` | ✅ | Typed configuration |
| `@nestjs/jwt` | ✅ | JWT token management |
| `@nestjs/passport` | ✅ | Passport integration |
| `@nestjs/swagger` | ✅ | OpenAPI/Swagger docs |
| `@nestjs/throttler` | ✅ | Rate limiting |
| `@nestjs/bullmq` | ✅ | BullMQ queue integration |
| `@prisma/client` | ✅ | Database ORM client |
| `@prisma/adapter-pg` | ✅ | PostgreSQL driver adapter |
| `pg` | ✅ | PostgreSQL driver |
| `bcrypt` | ✅ | Password hashing |
| `bullmq` | ✅ | Job queue |
| `class-validator` | ✅ | Input validation |
| `class-transformer` | ✅ | DTO transformation |
| `compression` | ✅ | Response compression |
| `cookie-parser` | ✅ | Cookie parsing |
| `dotenv` | ✅ | Env file loading |
| `helmet` | ✅ | Security headers |
| `ioredis` | ✅ | Redis client |
| `minio` | ✅ | S3-compatible storage |
| `passport` | ✅ | Authentication framework |
| `passport-jwt` | ✅ | JWT strategy |
| `rxjs` | ✅ | Reactive extensions |
| `uuid` | ✅ | UUID generation |
| `xendit-node` | ✅ | Xendit payment SDK |

### Dev Dependencies ✅

| Package | Status | Purpose |
|---------|--------|---------|
| `prisma` | ✅ | Prisma CLI |
| `typescript` | ✅ | TypeScript compiler |
| `eslint` | ✅ | Linting |
| `prettier` | ✅ | Code formatting |
| `husky` | ✅ | Git hooks |
| `lint-staged` | ✅ | Pre-commit lint |
| `@commitlint/cli` | ✅ | Commit message lint |
| `jest` | ✅ | Testing framework |
| `supertest` | ✅ | E2E testing |
| `ts-jest` | ✅ | Jest TypeScript transformer |

---

## 13. Checklist: Code Quality Tools

### 13a. ESLint

```bash
npm run lint
```

**✅ Expected:** Tidak ada error (mungkin ada warnings).

### 13b. Prettier

```bash
npx prettier --check "src/**/*.ts"
```

**✅ Expected:** `All matched files use Prettier code style!`

### 13c. TypeScript Strict Mode

Verifikasi di `tsconfig.json`:
```bash
cat tsconfig.json | grep -E '"strict|Null|Implicit"'
```

**✅ Expected:**
```
"strict": true,
"strictNullChecks": true,
"noImplicitAny": true,
```

### 13d. Commitlint

```bash
echo "invalid commit message" | npx commitlint
```

**✅ Expected:** Error — harus pakai format conventional (`feat:`, `fix:`, dll)

```bash
echo "feat: add new feature" | npx commitlint
```

**✅ Expected:** Pass tanpa error.

### 13e. Build Check

```bash
npm run build
```

**✅ Expected:** Build success tanpa TypeScript error, output di folder `dist/`.

---

## 14. Checklist: Repository Interfaces

Path: `src/domain/repositories/`

| File | Interface | Extends | Domain Methods |
|------|-----------|---------|----------------|
| `base.repository.ts` | `IBaseRepository<T>` | — | `findById`, `findAll`, `create`, `update`, `delete` |
| `user.repository.ts` | `IUserRepository` | `IBaseRepository<UserEntity>` | `findByEmail`, `findActiveUsers` |
| `product.repository.ts` | `IProductRepository` | `IBaseRepository<ProductEntity>` | `findBySlug`, `findActiveProducts` |
| `order.repository.ts` | `IOrderRepository` | `IBaseRepository<OrderEntity>` | `findByUserId`, `findByXenditInvoiceId`, `updateStatus` |
| `coupon.repository.ts` | `ICouponRepository` | `IBaseRepository<CouponEntity>` | `findByCode`, `incrementUsedCount` |
| `category.repository.ts` | `ICategoryRepository` | `IBaseRepository<CategoryEntity>` | `findBySlug` |
| `activity-log.repository.ts` | `IActivityLogRepository` | — (standalone) | `create`, `findByEntityId`, `findByCategory`, `findAll` |
| `index.ts` | barrel export | — | All interfaces + entities |

**Verifikasi:**
- [ ] Setiap interface punya Entity type definition
- [ ] Semua menggunakan `Promise<>` untuk async operations
- [ ] `IBaseRepository` generic dengan pagination support
- [ ] `IActivityLogRepository` standalone (tidak extend IBase, karena log tidak boleh update/delete)

---

## 15. Checklist: Infrastructure Repositories

Path: `src/infrastructure/repositories/`

| File | Class | Implements | Status |
|------|-------|------------|--------|
| `prisma-user.repository.ts` | `PrismaUserRepository` | `IUserRepository` | ✅ |
| `prisma-product.repository.ts` | `PrismaProductRepository` | `IProductRepository` | ✅ |
| `prisma-order.repository.ts` | `PrismaOrderRepository` | `IOrderRepository` | ✅ |
| `prisma-coupon.repository.ts` | `PrismaCouponRepository` | `ICouponRepository` | ✅ |
| `prisma-category.repository.ts` | `PrismaCategoryRepository` | `ICategoryRepository` | ✅ |
| `prisma-activity-log.repository.ts` | `PrismaActivityLogRepository` | `IActivityLogRepository` | ✅ |
| `prisma-product-variant.repository.ts` | `PrismaProductVariantRepository` | `IProductVariantRepository` | ✅ (bonus) |
| `prisma-order-item.repository.ts` | `PrismaOrderItemRepository` | `IOrderItemRepository` | ✅ (bonus) |

**Verifikasi:**
- [ ] Semua repository `@Injectable()`
- [ ] Semua inject `PrismaService` via constructor
- [ ] Semua punya `toEntity()` mapper method
- [ ] Pagination menggunakan `$transaction` untuk consistent count
- [ ] Error handling menggunakan `NotFoundException`

---

## 🎯 Quick Test — All-in-One Script

Buat file `test-setup.sh` dan jalankan:

```bash
#!/bin/bash
echo "═══════════════════════════════════════════"
echo "  🧪 Colestore Backend Setup Verification"
echo "═══════════════════════════════════════════"

echo ""
echo "1️⃣  Docker Services..."
docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "❌ Docker Compose not running"

echo ""
echo "2️⃣  PostgreSQL Connection..."
docker exec colestore-postgres pg_isready -U postgres -d colestore_db 2>/dev/null && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL FAILED"

echo ""
echo "3️⃣  Redis Connection..."
docker exec colestore-redis redis-cli -a redis123 PING 2>/dev/null | grep -q PONG && echo "✅ Redis OK" || echo "❌ Redis FAILED"

echo ""
echo "4️⃣  MinIO Health..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live | grep -q 200 && echo "✅ MinIO OK" || echo "❌ MinIO FAILED"

echo ""
echo "5️⃣  Health Check API..."
RESPONSE=$(curl -s http://localhost:3001/api/v1/health)
echo "$RESPONSE" | grep -q '"status":"ok"' && echo "✅ Health API OK" || echo "❌ Health API FAILED"
echo "   Response: $RESPONSE"

echo ""
echo "6️⃣  Security Headers..."
HEADERS=$(curl -s -I http://localhost:3001/api/v1/health 2>/dev/null)
echo "$HEADERS" | grep -q "x-content-type-options" && echo "✅ Helmet headers present" || echo "❌ Helmet headers MISSING"
echo "$HEADERS" | grep -q "X-Powered-By" && echo "⚠️  X-Powered-By exposed (bad)" || echo "✅ X-Powered-By hidden"

echo ""
echo "7️⃣  Database Tables..."
TABLE_COUNT=$(docker exec colestore-postgres psql -U postgres -d colestore_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')
echo "   Tables found: $TABLE_COUNT"
[ "$TABLE_COUNT" = "9" ] && echo "✅ All 9 tables present" || echo "❌ Expected 9 tables, got $TABLE_COUNT"

echo ""
echo "8️⃣  Prisma Validate..."
npx prisma validate 2>&1 | tail -1

echo ""
echo "9️⃣  TypeScript Build..."
npm run build 2>&1 | tail -1

echo ""
echo "🔟  Folder Structure..."
DIR_COUNT=$(find src -type d | wc -l)
echo "   Directories: $DIR_COUNT"
[ "$DIR_COUNT" -ge 25 ] && echo "✅ Folder structure complete" || echo "⚠️  Some directories may be missing"

echo ""
echo "═══════════════════════════════════════════"
echo "  Verification Complete!"
echo "═══════════════════════════════════════════"
```

**Cara menjalankan:**
```bash
chmod +x test-setup.sh
./test-setup.sh
```

---

## ✅ Summary

| Step | Item | Status |
|------|------|--------|
| **1** | NestJS Project + TypeScript strict | ✅ |
| **1** | ESLint + Prettier + Husky + commitlint | ✅ |
| **1** | Clean Architecture folder structure | ✅ |
| **1** | All packages installed (20+ deps) | ✅ |
| **1** | `.env.example` + `docker-compose.yml` | ✅ |
| **1** | Typed configs (7 namespaces) | ✅ |
| **1** | Global middlewares (helmet, cors, compression, cookies) | ✅ |
| **1** | Global pipes, filters, interceptors | ✅ |
| **1** | Swagger documentation | ✅ |
| **1** | Rate limiting | ✅ |
| **2** | Prisma schema (8 models, 4 enums) | ✅ |
| **2** | Migration applied | ✅ |
| **2** | Repository interfaces (7 interfaces) | ✅ |
| **2** | Concrete Prisma repositories (8 implementations) | ✅ |
| **2** | PrismaService + PrismaModule (global) | ✅ |
| **2** | Driver adapter (@prisma/adapter-pg) | ✅ |

> **Next Step:** Step 3 — Common Layer (ActivityLog service, auto-logging interceptor)
