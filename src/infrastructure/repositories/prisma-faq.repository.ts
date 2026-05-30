import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  IFaqRepository,
  FaqEntity,
} from '../../domain/repositories/faq.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of IFaqRepository.
 * Handles all FAQ-related database operations.
 */
@Injectable()
export class PrismaFaqRepository implements IFaqRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find an FAQ by ID */
  async findById(id: string): Promise<FaqEntity | null> {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    return faq ?? null;
  }

  /** Find all FAQs with optional pagination and filters */
  async findAll(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
    search?: string;
  }): Promise<PaginatedResult<FaqEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const whereClause: Prisma.FaqWhereInput = {};
    if (params?.isActive !== undefined) {
      whereClause.isActive = params.isActive;
    }
    if (params?.search) {
      whereClause.OR = [
        { question: { contains: params.search, mode: 'insensitive' } },
        { answer: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [faqs, total] = await this.prisma.$transaction([
      this.prisma.faq.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.faq.count({ where: whereClause }),
    ]);

    return buildPaginatedResult(faqs, total, Math.floor(skip / take) + 1, take);
  }

  /** Create a new FAQ */
  async create(data: Partial<FaqEntity>): Promise<FaqEntity> {
    return this.prisma.faq.create({
      data: {
        question: data.question!,
        answer: data.answer!,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  /** Update an existing FAQ */
  async update(id: string, data: Partial<FaqEntity>): Promise<FaqEntity> {
    const existing = await this.prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    return this.prisma.faq.update({
      where: { id },
      data: {
        ...(data.question !== undefined && { question: data.question }),
        ...(data.answer !== undefined && { answer: data.answer }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /** Delete an FAQ by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    await this.prisma.faq.delete({ where: { id } });
  }
}
