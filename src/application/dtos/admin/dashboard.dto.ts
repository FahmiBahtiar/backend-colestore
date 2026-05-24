import type { LogCategory, OrderStatus } from '../../../domain/entities';

export interface AdminDashboardPeriodDto {
  startDate: Date;
  endDate: Date;
  days: number;
}

export interface AdminDashboardSummaryDto {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  activeProducts: number;
  totalCoupons: number;
  activeCoupons: number;
  lowStockProducts: number;
  ordersByStatus: Record<OrderStatus, number>;
}

export interface SalesByDayDto {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProductDto {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface RecentOrderDto {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  status: OrderStatus;
  finalAmount: number;
  createdAt: Date;
}

export interface RecentActivityDto {
  id: string;
  category: LogCategory;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  orderId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AdminDashboardResponseDto {
  period: AdminDashboardPeriodDto;
  summary: AdminDashboardSummaryDto;
  salesByDay: SalesByDayDto[];
  topProducts: TopProductDto[];
  recentOrders: RecentOrderDto[];
  recentActivity: RecentActivityDto[];
}

export interface GetAdminDashboardInputDto {
  startDate?: Date;
  endDate?: Date;
  days?: number;
  topProductsLimit?: number;
  recentOrdersLimit?: number;
  recentActivityLimit?: number;
  lowStockThreshold?: number;
}
