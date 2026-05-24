import { Inject, Injectable } from '@nestjs/common';
import {
  AdminDashboardResponseDto,
  GetAdminDashboardInputDto,
} from '../../dtos';
import { ADMIN_DASHBOARD_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  AdminDashboardQuery,
  IAdminDashboardRepository,
} from '../../../domain/repositories/admin-dashboard.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    @Inject(ADMIN_DASHBOARD_REPOSITORY)
    private readonly adminDashboardRepository: IAdminDashboardRepository,
  ) {}

  async execute(
    input: GetAdminDashboardInputDto = {},
  ): Promise<AdminDashboardResponseDto> {
    const days = input.days ?? 30;
    const endDate = input.endDate ?? new Date();
    const startDate =
      input.startDate ?? new Date(endDate.getTime() - (days - 1) * DAY_MS);

    const normalized = this.normalizeRange(startDate, endDate);

    const query: AdminDashboardQuery = {
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      days: normalized.days,
      topProductsLimit: input.topProductsLimit ?? 5,
      recentOrdersLimit: input.recentOrdersLimit ?? 10,
      recentActivityLimit: input.recentActivityLimit ?? 10,
      lowStockThreshold: input.lowStockThreshold ?? 5,
    };

    return this.adminDashboardRepository.getSnapshot(query);
  }

  private normalizeRange(
    startDate: Date,
    endDate: Date,
  ): {
    startDate: Date;
    endDate: Date;
    days: number;
  } {
    let start = new Date(startDate);
    let end = new Date(endDate);

    if (start > end) {
      [start, end] = [end, start];
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const days = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
    );

    return { startDate: start, endDate: end, days };
  }
}
