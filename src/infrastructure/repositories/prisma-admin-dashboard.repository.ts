import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AdminDashboardQuery,
  AdminDashboardSnapshot,
  IAdminDashboardRepository,
} from '../../domain/repositories/admin-dashboard.repository';
import type { OrderStatus } from '../../domain/entities';
import { PrismaService } from '../prisma/prisma.service';

const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'DELIVERED'];
const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

interface SalesByDayRow {
  date: Date;
  orders: number;
  revenue: Prisma.Decimal | number | string | null;
}

interface TopProductRow {
  productId: string;
  name: string;
  quantity: number;
  revenue: Prisma.Decimal | number | string | null;
}

@Injectable()
export class PrismaAdminDashboardRepository implements IAdminDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(
    query: AdminDashboardQuery,
  ): Promise<AdminDashboardSnapshot> {
    const {
      startDate,
      endDate,
      days,
      topProductsLimit,
      recentOrdersLimit,
      recentActivityLimit,
      lowStockThreshold,
    } = query;

    const rangeWhere = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [
      totalOrders,
      revenueAggregate,
      ordersByStatusRaw,
      totalCustomers,
      totalProducts,
      activeProducts,
      totalCoupons,
      activeCoupons,
      lowStockProducts,
      recentOrders,
      recentActivity,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: rangeWhere }),
      this.prisma.order.aggregate({
        where: { ...rangeWhere, status: { in: PAID_STATUSES } },
        _sum: { finalAmount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: rangeWhere,
        orderBy: { status: 'asc' },
        _count: true,
      }),
      this.prisma.user.count({ where: { role: 'BUYER' } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.coupon.count(),
      this.prisma.coupon.count({ where: { isActive: true } }),
      this.prisma.product.count({
        where: {
          isActive: true,
          stockQuantity: { not: null, lte: lowStockThreshold },
        },
      }),
      this.prisma.order.findMany({
        where: rangeWhere,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: recentOrdersLimit,
      }),
      this.prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: recentActivityLimit,
      }),
    ]);

    const salesByDayRows = await this.prisma.$queryRaw<SalesByDayRow[]>(
      Prisma.sql`
        SELECT
          DATE_TRUNC('day', o."createdAt") AS "date",
          COUNT(*)::int AS "orders",
          COALESCE(SUM(o."finalAmount"), 0) AS "revenue"
        FROM "orders" o
        WHERE o."status" IN (${Prisma.join(PAID_STATUSES)})
          AND o."createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY 1
        ORDER BY 1
      `,
    );

    const topProductRows = await this.prisma.$queryRaw<TopProductRow[]>(
      Prisma.sql`
        SELECT
          oi."productId" AS "productId",
          p."name" AS "name",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."subtotal"), 0) AS "revenue"
        FROM "order_items" oi
        JOIN "orders" o ON o."id" = oi."orderId"
        JOIN "products" p ON p."id" = oi."productId"
        WHERE o."status" IN (${Prisma.join(PAID_STATUSES)})
          AND o."createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY oi."productId", p."name"
        ORDER BY "revenue" DESC
        LIMIT ${topProductsLimit}
      `,
    );

    const ordersByStatus = ORDER_STATUSES.reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<OrderStatus, number>,
    );

    for (const row of ordersByStatusRaw) {
      ordersByStatus[row.status] =
        typeof row._count === 'number' ? row._count : 0;
    }

    return {
      period: {
        startDate,
        endDate,
        days,
      },
      summary: {
        totalRevenue: this.toNumber(revenueAggregate._sum.finalAmount),
        totalOrders,
        totalCustomers,
        totalProducts,
        activeProducts,
        totalCoupons,
        activeCoupons,
        lowStockProducts,
        ordersByStatus,
      },
      salesByDay: this.buildDailySeries(salesByDayRows, startDate, endDate),
      topProducts: topProductRows.map((row) => ({
        productId: row.productId,
        name: row.name,
        quantity: row.quantity,
        revenue: this.toNumber(row.revenue),
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        userId: order.userId,
        userEmail: order.user?.email ?? null,
        userName: order.user?.name ?? null,
        status: order.status,
        finalAmount: this.toNumber(order.finalAmount),
        createdAt: order.createdAt,
      })),
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        category: log.category,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorId: log.actorId,
        orderId: log.orderId,
        details: log.details as Record<string, unknown> | null,
        createdAt: log.createdAt,
      })),
    };
  }

  private buildDailySeries(
    rows: SalesByDayRow[],
    startDate: Date,
    endDate: Date,
  ): AdminDashboardSnapshot['salesByDay'] {
    const byDate = new Map<string, SalesByDayRow>();
    for (const row of rows) {
      const key = this.toDateKey(row.date);
      byDate.set(key, row);
    }

    const series: AdminDashboardSnapshot['salesByDay'] = [];
    const current = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
    const end = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
      ),
    );

    while (current <= end) {
      const key = this.toDateKey(current);
      const row = byDate.get(key);
      series.push({
        date: key,
        orders: row?.orders ?? 0,
        revenue: this.toNumber(row?.revenue),
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return series;
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toNumber(
    value: Prisma.Decimal | number | string | null | undefined,
  ): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return Number(value);
  }
}
