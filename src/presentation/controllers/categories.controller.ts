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
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryDetailUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import {
  CreateCategoryRequestDto,
  ListCategoriesQueryDto,
  UpdateCategoryRequestDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryDetailUseCase: GetCategoryDetailUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
  ) {}

  /** List categories with optional pagination. */
  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved.' })
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.listCategoriesUseCase.execute(query);
  }

  /** Retrieve category detail by id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get category detail' })
  @ApiResponse({ status: 200, description: 'Category retrieved.' })
  async getCategoryDetail(@Param('id') id: string) {
    return this.getCategoryDetailUseCase.execute(id);
  }

  /** Create a category as an admin. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created.' })
  async createCategory(@Body() body: CreateCategoryRequestDto) {
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    return this.createCategoryUseCase.execute({ ...body, slug });
  }

  /** Update a category as an admin. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated.' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryRequestDto,
  ) {
    return this.updateCategoryUseCase.execute({ id, ...body });
  }

  /** Delete a category as an admin. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 204, description: 'Category deleted.' })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.deleteCategoryUseCase.execute(id);
  }
}
