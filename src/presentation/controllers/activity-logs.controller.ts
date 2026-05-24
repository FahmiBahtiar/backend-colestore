import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetActivityLogsUseCase } from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import { ActivityLogQueryDto } from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('activity-logs')
@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ActivityLogsController {
  constructor(
    private readonly getActivityLogsUseCase: GetActivityLogsUseCase,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get activity log entries' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved.' })
  async getActivityLogs(@Query() query: ActivityLogQueryDto) {
    return this.getActivityLogsUseCase.execute(query);
  }
}
