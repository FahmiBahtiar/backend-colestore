import type { LogCategory, OrderStatus } from '../entities';

export interface AdminDashboardQuery {
  startDate: Date;
  endDate: Date;
  days: number;
  topProductsLimit: number;
  recentOrdersLimit: number;
  recentActivityLimit: number;
  lowStockThreshold: number;
}

export interface AdminDashboardSnapshot {
  period: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    activeProducts: number;
    totalCoupons: number;
    activeCoupons: number;
    lowStockProducts: number;
    ordersByStatus: Record<OrderStatus, number>;
  };
  salesByDay: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  recentOrders: {
    id: string;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    status: OrderStatus;
    finalAmount: number;
    createdAt: Date;
  }[];
  recentActivity: {
    id: string;
    category: LogCategory;
    action: string;
    entityType: string | null;
    entityId: string | null;
    actorId: string | null;
    orderId: string | null;
    details: Record<string, unknown> | null;
    createdAt: Date;
  }[];
}

export interface IAdminDashboardRepository {
  getSnapshot(query: AdminDashboardQuery): Promise<AdminDashboardSnapshot>;
}
