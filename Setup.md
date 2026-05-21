You are a **senior NestJS architect** with 10+ years of experience, expert in Clean Architecture, Domain-Driven Design (DDD) principles, Clean Code, and production-grade TypeScript applications.

We are going to build the **backend** of a complex digital product e-commerce platform (similar to Tokopedia but single-vendor). Only two roles exist: **Buyer (User)** and **Admin**. All products are digital, and fulfillment is done manually by the admin (no automatic license keys or download links).

### PROJECT REQUIREMENTS
- **Tech Stack**:
  - NestJS (latest stable) + TypeScript (strict mode)
  - Prisma + PostgreSQL
  - Redis + BullMQ (for queues & background jobs)
  - MinIO (S3-compatible) for digital file storage
  - Xendit official Node SDK for payments
  - JWT + Refresh Token authentication
  - Clean Architecture (Domain / Application / Infrastructure / Presentation layers)
  - ESLint + Prettier + Husky + lint-staged + commitlint
  - Docker + Docker Compose ready for production

- **Key Features** (must be implemented in order):
  1. User management (Buyer & Admin) with role-based access
  2. Comprehensive Activity Logging (super detailed, categorized)
  3. Product + ProductVariant management (with conditional quantity logic)
  4. Coupon / Redeem Code / Voucher system
  5. Order + OrderItem + Xendit payment integration + webhook
  6. Manual fulfillment by Admin (delivery notes, proof, status)
  7. Admin dashboard metrics (total sales, recent orders, etc.)

### CLEAN ARCHITECTURE STRUCTURE (MANDATORY)
Follow this exact folder structure:
/src
/domain          ← Entities, Value Objects, Domain Events, Repository Interfaces
/application     ← Use Cases / Application Services, DTOs, Mappers
/infrastructure  ← Prisma repositories, external services (Xendit, MinIO, Redis, BullMQ), config
/presentation    ← Controllers, Guards, Pipes, Decorators, Exception Filters
/common          ← Shared utilities, constants, decorators
/config
/prisma


### YOUR TASK (WORK STEP-BY-STEP)

Follow this exact sequence and **never skip a step**. After completing each step, output a clear summary and wait for my confirmation before continuing.

**Step 1: Project Initialization**
- Create a new NestJS project with strict TypeScript, ESLint, Prettier, and Husky.
- Set up Clean Architecture folder structure exactly as specified above.
- Install all necessary packages (Prisma, @nestjs/bullmq, ioredis, xendit-node, @nestjs/config, class-validator, class-transformer, passport, etc.).
- Configure `.env.example` and `docker-compose.yml` (PostgreSQL, Redis, MinIO, app).

**Step 2: Database & Prisma**
- Use the exact Prisma schema I will provide in the next message (already normalized).
- Run prisma generate + db push / migrate.
- Create all Repository Interfaces in `/domain/repositories`.

**Step 3: Common Layer**
- Create global exception filter, validation pipe, logging interceptor, and ActivityLog service (must log automatically on every important action using Prisma middleware or interceptor).

**Step 4: Domain Layer**
- Implement all Domain Entities (User, Product, ProductVariant, Order, OrderItem, Coupon, ActivityLog) with proper validation and business rules.

**Step 5: Application Layer**
- Create Use Cases for every major operation (CreateProductUseCase, PlaceOrderUseCase, ProcessXenditWebhookUseCase, etc.).

**Step 6: Infrastructure Layer**
- Implement concrete repositories using Prisma.
- Create XenditService, MinIOService, BullMQ processors.

**Step 7: Presentation Layer**
- Create all controllers with proper guards (RolesGuard, JwtAuthGuard).
- Implement Xendit webhook endpoint.

**Step 8: Testing & Documentation**
- Write unit tests for Use Cases and integration tests for controllers.
- Add Swagger documentation (NestJS Swagger).

**Additional Rules (MUST FOLLOW)**:
- Use **Clean Code** principles: meaningful names, small functions, single responsibility.
- All business logic must stay in Domain/Application layer. Controllers must be thin.
- Use **Dependency Injection** everywhere.
- All public methods must have proper JSDoc.
- Every response must follow consistent API response format.
- Rate limiting, security headers, and CORS must be configured.

Start now with **Step 1: Project Initialization**.

Once you finish each step, reply with:
"✅ Step X completed. Summary: ..."
Then wait for my confirmation before proceeding to the next step.

Do you understand the requirements? If yes, start with Step 1.