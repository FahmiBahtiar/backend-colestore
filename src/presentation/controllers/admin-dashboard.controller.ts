import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetAdminDashboardUseCase } from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import { AdminDashboardQueryDto } from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('admin')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDashboardController {
  constructor(
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get admin dashboard snapshot' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved.' })
  async getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.getAdminDashboardUseCase.execute(query);
  }
}
