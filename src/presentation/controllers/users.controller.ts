import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  DeactivateUserUseCase,
  GetUserDetailUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import { ListUsersQueryDto, UpdateUserRequestDto } from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserDetailUseCase: GetUserDetailUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
  ) {}

  /** List users for admin management. */
  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Users retrieved.' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.listUsersUseCase.execute(query);
  }

  /** Retrieve user detail by id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get user detail' })
  @ApiResponse({ status: 200, description: 'User retrieved.' })
  async getUserDetail(@Param('id') id: string) {
    return this.getUserDetailUseCase.execute(id);
  }

  /** Update user role, profile, or active status as an admin. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserRequestDto,
  ) {
    return this.updateUserUseCase.execute({ id, ...body });
  }

  /** Deactivate a user as a safe delete operation. */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 204, description: 'User deactivated.' })
  async deactivateUser(@Param('id') id: string): Promise<void> {
    await this.deactivateUserUseCase.execute(id);
  }
}
