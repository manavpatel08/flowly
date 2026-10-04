import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePriceTierDto,
  UpdatePriceTierDto,
} from './dto/price-tier.dto';
import {
  CreateDishPriceDto,
  UpdateDishPriceDto,
} from './dto/dish-price.dto';
import {
  CreateOptionPriceDto,
  UpdateOptionPriceDto,
} from './dto/option-price.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // PRICE TIERS
  // ==========================================

  async findAllTiers() {
    return this.prisma.priceTier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            dishPrices: true,
            optionPrices: true,
            companies: true,
          },
        },
      },
    });
  }

  async findOneTier(id: string) {
    const tier = await this.prisma.priceTier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dishPrices: true,
            optionPrices: true,
            companies: true,
          },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${id}" not found`);
    }

    return tier;
  }

  async createTier(dto: CreatePriceTierDto) {
    const existing = await this.prisma.priceTier.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Price tier "${dto.name}" already exists`);
    }

    if (dto.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTier.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });

        return tx.priceTier.create({
          data: {
            name: dto.name.trim(),
            isDefault: true,
            isActive: dto.isActive ?? true,
          },
        });
      });
    }

    return this.prisma.priceTier.create({
      data: {
        name: dto.name.trim(),
        isDefault: false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTier(id: string, dto: UpdatePriceTierDto) {
    const existing = await this.prisma.priceTier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Price tier with ID "${id}" not found`);
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.priceTier.findUnique({
        where: { name: dto.name.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`Price tier "${dto.name}" already exists`);
      }
    }

    if (dto.isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTier.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });

        return tx.priceTier.update({
          where: { id },
          data: {
            name: dto.name ? dto.name.trim() : undefined,
            isDefault: true,
            isActive: dto.isActive,
          },
        });
      });
    }

    return this.prisma.priceTier.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================
  // DISH PRICING
  // ==========================================

  async findDishPrices(
    tierId: string,
    query: { page?: number; pageSize?: number; search?: string },
  ) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${tierId}" not found`);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.DishPriceWhereInput = {
      priceTierId: tierId,
    };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.dish = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [dishPrices, total] = await Promise.all([
      this.prisma.dishPrice.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          dish: {
            select: {
              id: true,
              name: true,
              sku: true,
              costInPaise: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          dish: { name: 'asc' },
        },
      }),
      this.prisma.dishPrice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: dishPrices,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async setDishPrice(tierId: string, dto: CreateDishPriceDto) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${tierId}" not found`);
    }

    const dish = await this.prisma.dish.findUnique({ where: { id: dto.dishId } });
    if (!dish) {
      throw new NotFoundException(`Dish with ID "${dto.dishId}" not found`);
    }

    const existing = await this.prisma.dishPrice.findUnique({
      where: {
        dishId_priceTierId: {
          dishId: dto.dishId,
          priceTierId: tierId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Dish price already exists for this tier. Use PATCH to update.',
      );
    }

    return this.prisma.dishPrice.create({
      data: {
        dishId: dto.dishId,
        priceTierId: tierId,
        priceInPaise: dto.priceInPaise,
      },
      include: {
        dish: {
          select: { id: true, name: true, sku: true },
        },
      },
    });
  }

  async updateDishPrice(
    tierId: string,
    dishId: string,
    dto: UpdateDishPriceDto,
  ) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${tierId}" not found`);
    }

    const existing = await this.prisma.dishPrice.findUnique({
      where: {
        dishId_priceTierId: {
          dishId,
          priceTierId: tierId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Dish price not found for dish "${dishId}" in tier "${tierId}"`,
      );
    }

    return this.prisma.dishPrice.update({
      where: {
        dishId_priceTierId: {
          dishId,
          priceTierId: tierId,
        },
      },
      data: {
        priceInPaise: dto.priceInPaise,
      },
      include: {
        dish: {
          select: { id: true, name: true, sku: true },
        },
      },
    });
  }

  // ==========================================
  // OPTION PRICING
  // ==========================================

  async findOptionPrices(tierId: string) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${tierId}" not found`);
    }

    return this.prisma.optionPrice.findMany({
      where: { priceTierId: tierId },
      include: {
        option: {
          select: {
            id: true,
            name: true,
            costInPaise: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        option: { name: 'asc' },
      },
    });
  }

  async setOptionPrice(tierId: string, dto: CreateOptionPriceDto) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${tierId}" not found`);
    }

    const option = await this.prisma.option.findUnique({ where: { id: dto.optionId } });
    if (!option) {
      throw new NotFoundException(`Option with ID "${dto.optionId}" not found`);
    }

    const existing = await this.prisma.optionPrice.findUnique({
      where: {
        optionId_priceTierId: {
          optionId: dto.optionId,
          priceTierId: tierId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Option price already exists for this tier. Use PATCH to update.',
      );
    }

    return this.prisma.optionPrice.create({
      data: {
        optionId: dto.optionId,
        priceTierId: tierId,
        priceInPaise: dto.priceInPaise,
      },
      include: {
        option: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateOptionPrice(
    tierId: string,
    optionId: string,
    dto: UpdateOptionPriceDto,
  ) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      throw new NotFoundException(`Price tier with ID "${tierId}" not found`);
    }

    const existing = await this.prisma.optionPrice.findUnique({
      where: {
        optionId_priceTierId: {
          optionId,
          priceTierId: tierId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Option price not found for option "${optionId}" in tier "${tierId}"`,
      );
    }

    return this.prisma.optionPrice.update({
      where: {
        optionId_priceTierId: {
          optionId,
          priceTierId: tierId,
        },
      },
      data: {
        priceInPaise: dto.priceInPaise,
      },
      include: {
        option: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
