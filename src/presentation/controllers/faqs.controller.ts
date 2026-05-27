import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
  CreateFaqUseCase,
  DeleteFaqUseCase,
  GetFaqDetailUseCase,
  ListFaqsUseCase,
  UpdateFaqUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import {
  CreateFaqRequestDto,
  ListFaqsQueryDto,
  UpdateFaqRequestDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('faqs')
@Controller('faqs')
export class FaqsController {
  constructor(
    private readonly createFaqUseCase: CreateFaqUseCase,
    private readonly listFaqsUseCase: ListFaqsUseCase,
    private readonly getFaqDetailUseCase: GetFaqDetailUseCase,
    private readonly updateFaqUseCase: UpdateFaqUseCase,
    private readonly deleteFaqUseCase: DeleteFaqUseCase,
  ) {}

  /** List FAQs with optional filters. Public anonymous route. */
  @Get()
  @ApiOperation({ summary: 'List FAQs' })
  @ApiResponse({ status: 200, description: 'FAQs retrieved.' })
  async listFaqs(@Query() query: ListFaqsQueryDto) {
    return this.listFaqsUseCase.execute(query);
  }

  /** Retrieve FAQ detail by id. Admin only or JWT authorized. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get FAQ detail' })
  @ApiResponse({ status: 200, description: 'FAQ retrieved.' })
  async getFaqDetail(@Param('id') id: string) {
    return this.getFaqDetailUseCase.execute(id);
  }

  /** Create an FAQ as an admin. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create FAQ' })
  @ApiResponse({ status: 201, description: 'FAQ created.' })
  async createFaq(@Body() body: CreateFaqRequestDto) {
    return this.createFaqUseCase.execute(body);
  }

  /** Update an FAQ as an admin. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update FAQ' })
  @ApiResponse({ status: 200, description: 'FAQ updated.' })
  async updateFaq(@Param('id') id: string, @Body() body: UpdateFaqRequestDto) {
    return this.updateFaqUseCase.execute({ id, ...body });
  }

  /** Delete an FAQ as an admin. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete FAQ' })
  @ApiResponse({ status: 204, description: 'FAQ deleted.' })
  async deleteFaq(@Param('id') id: string): Promise<void> {
    await this.deleteFaqUseCase.execute(id);
  }
}
