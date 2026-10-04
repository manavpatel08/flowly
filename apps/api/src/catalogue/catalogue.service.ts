import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStationDto,
  UpdateStationDto,
} from './dto/station.dto';
import {
  CreatePortionDto,
  UpdatePortionDto,
  CreateAllergenDto,
  UpdateAllergenDto,
  CreateDietaryTagDto,
  UpdateDietaryTagDto,
} from './dto/attribute.dto';
import {
  CreateOptionDto,
  UpdateOptionDto,
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
} from './dto/option.dto';
import {
  CreateDishDto,
  UpdateDishDto,
} from './dto/dish.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. KITCHEN STATIONS
  // ==========================================

  async findAllStations() {
    return this.prisma.kitchenStation.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createStation(dto: CreateStationDto) {
    const existing = await this.prisma.kitchenStation.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Kitchen station "${dto.name}" already exists`);
    }

    return this.prisma.kitchenStation.create({
      data: {
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateStation(id: string, dto: UpdateStationDto) {
    const existing = await this.prisma.kitchenStation.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Kitchen station with ID "${id}" not found`);
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.kitchenStation.findUnique({
        where: { name: dto.name.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`Kitchen station "${dto.name}" already exists`);
      }
    }

    return this.prisma.kitchenStation.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================
  // 2. PORTIONS
  // ==========================================

  async findAllPortions() {
    return this.prisma.portion.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createPortion(dto: CreatePortionDto) {
    const existing = await this.prisma.portion.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Portion "${dto.name}" already exists`);
    }

    return this.prisma.portion.create({
      data: {
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePortion(id: string, dto: UpdatePortionDto) {
    const existing = await this.prisma.portion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Portion with ID "${id}" not found`);
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.portion.findUnique({
        where: { name: dto.name.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`Portion "${dto.name}" already exists`);
      }
    }

    return this.prisma.portion.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================
  // 3. ALLERGENS
  // ==========================================

  async findAllAllergens() {
    return this.prisma.allergen.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createAllergen(dto: CreateAllergenDto) {
    const existing = await this.prisma.allergen.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Allergen "${dto.name}" already exists`);
    }

    return this.prisma.allergen.create({
      data: { name: dto.name.trim() },
    });
  }

  async updateAllergen(id: string, dto: UpdateAllergenDto) {
    const existing = await this.prisma.allergen.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Allergen with ID "${id}" not found`);
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.allergen.findUnique({
        where: { name: dto.name.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`Allergen "${dto.name}" already exists`);
      }
    }

    return this.prisma.allergen.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
      },
    });
  }

  // ==========================================
  // 4. DIETARY TAGS
  // ==========================================

  async findAllDietaryTags() {
    return this.prisma.dietaryTag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createDietaryTag(dto: CreateDietaryTagDto) {
    const existing = await this.prisma.dietaryTag.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Dietary tag "${dto.name}" already exists`);
    }

    return this.prisma.dietaryTag.create({
      data: { name: dto.name.trim() },
    });
  }

  async updateDietaryTag(id: string, dto: UpdateDietaryTagDto) {
    const existing = await this.prisma.dietaryTag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dietary tag with ID "${id}" not found`);
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.dietaryTag.findUnique({
        where: { name: dto.name.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`Dietary tag "${dto.name}" already exists`);
      }
    }

    return this.prisma.dietaryTag.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
      },
    });
  }

  // ==========================================
  // 5. OPTIONS
  // ==========================================

  async findAllOptions(query?: { search?: string; isActive?: boolean | string }) {
    const where: Prisma.OptionWhereInput = {};

    if (query?.search && query.search.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }
    if (query?.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === true || query.isActive === 'true';
    }

    return this.prisma.option.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOneOption(id: string) {
    const option = await this.prisma.option.findUnique({ where: { id } });
    if (!option) {
      throw new NotFoundException(`Option with ID "${id}" not found`);
    }
    return option;
  }

  async createOption(dto: CreateOptionDto) {
    return this.prisma.option.create({
      data: {
        name: dto.name.trim(),
        costInPaise: dto.costInPaise,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateOption(id: string, dto: UpdateOptionDto) {
    const existing = await this.prisma.option.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Option with ID "${id}" not found`);
    }

    return this.prisma.option.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        costInPaise: dto.costInPaise,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================
  // 6. OPTION GROUPS
  // ==========================================

  async findAllOptionGroups() {
    return this.prisma.optionGroup.findMany({
      include: {
        optionGroupOptions: {
          include: {
            option: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneOptionGroup(id: string) {
    const og = await this.prisma.optionGroup.findUnique({
      where: { id },
      include: {
        optionGroupOptions: {
          include: {
            option: true,
          },
        },
      },
    });

    if (!og) {
      throw new NotFoundException(`Option group with ID "${id}" not found`);
    }

    return og;
  }

  async createOptionGroup(dto: CreateOptionGroupDto) {
    if (dto.optionIds && dto.optionIds.length > 0) {
      const distinctOptionIds = [...new Set(dto.optionIds)];
      const foundOptions = await this.prisma.option.findMany({
        where: { id: { in: distinctOptionIds } },
      });
      if (foundOptions.length !== distinctOptionIds.length) {
        throw new NotFoundException('One or more selected options do not exist');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.optionGroup.create({
        data: {
          name: dto.name.trim(),
          isRequired: dto.isRequired ?? false,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.optionIds && dto.optionIds.length > 0) {
        const distinctOptionIds = [...new Set(dto.optionIds)];
        await tx.optionGroupOption.createMany({
          data: distinctOptionIds.map((optId) => ({
            optionGroupId: group.id,
            optionId: optId,
          })),
        });
      }

      return tx.optionGroup.findUnique({
        where: { id: group.id },
        include: {
          optionGroupOptions: {
            include: { option: true },
          },
        },
      });
    });
  }

  async updateOptionGroup(id: string, dto: UpdateOptionGroupDto) {
    const existing = await this.prisma.optionGroup.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Option group with ID "${id}" not found`);
    }

    if (dto.optionIds !== undefined && dto.optionIds.length > 0) {
      const distinctOptionIds = [...new Set(dto.optionIds)];
      const foundOptions = await this.prisma.option.findMany({
        where: { id: { in: distinctOptionIds } },
      });
      if (foundOptions.length !== distinctOptionIds.length) {
        throw new NotFoundException('One or more selected options do not exist');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.optionGroup.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          isRequired: dto.isRequired,
          isActive: dto.isActive,
        },
      });

      if (dto.optionIds !== undefined) {
        await tx.optionGroupOption.deleteMany({
          where: { optionGroupId: id },
        });

        if (dto.optionIds.length > 0) {
          const distinctOptionIds = [...new Set(dto.optionIds)];
          await tx.optionGroupOption.createMany({
            data: distinctOptionIds.map((optId) => ({
              optionGroupId: id,
              optionId: optId,
            })),
          });
        }
      }

      return tx.optionGroup.findUnique({
        where: { id },
        include: {
          optionGroupOptions: {
            include: { option: true },
          },
        },
      });
    });
  }

  // ==========================================
  // 7. DISHES
  // ==========================================

  async findAllDishes(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    stationId?: string;
    isActive?: boolean | string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.DishWhereInput = {};

    if (query.stationId && query.stationId.trim()) {
      where.kitchenStationId = query.stationId.trim();
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === true || query.isActive === 'true';
    }

    const [dishes, total] = await Promise.all([
      this.prisma.dish.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          kitchenStation: true,
          portion: true,
          allergens: {
            include: { allergen: true },
          },
          dietaryTags: {
            include: { dietaryTag: true },
          },
          dishOptionGroups: {
            include: {
              optionGroup: {
                include: {
                  optionGroupOptions: {
                    include: { option: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.dish.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: dishes,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findOneDish(id: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      include: {
        kitchenStation: true,
        portion: true,
        allergens: {
          include: { allergen: true },
        },
        dietaryTags: {
          include: { dietaryTag: true },
        },
        dishOptionGroups: {
          include: {
            optionGroup: {
              include: {
                optionGroupOptions: {
                  include: { option: true },
                },
              },
            },
          },
        },
      },
    });

    if (!dish) {
      throw new NotFoundException(`Dish with ID "${id}" not found`);
    }

    return dish;
  }

  async createDish(dto: CreateDishDto) {
    // 1. Validate SKU uniqueness
    const existingSku = await this.prisma.dish.findUnique({
      where: { sku: dto.sku.trim() },
    });
    if (existingSku) {
      throw new ConflictException(`A dish with SKU "${dto.sku}" already exists`);
    }

    // 2. Validate Kitchen Station if supplied
    if (dto.kitchenStationId) {
      const station = await this.prisma.kitchenStation.findUnique({
        where: { id: dto.kitchenStationId },
      });
      if (!station) {
        throw new NotFoundException(`Kitchen station with ID "${dto.kitchenStationId}" not found`);
      }
    }

    // 3. Validate Portion if supplied
    if (dto.portionId) {
      const portion = await this.prisma.portion.findUnique({
        where: { id: dto.portionId },
      });
      if (!portion) {
        throw new NotFoundException(`Portion with ID "${dto.portionId}" not found`);
      }
    }

    // 4. Validate Allergens if supplied
    if (dto.allergenIds && dto.allergenIds.length > 0) {
      const distinctAllergenIds = [...new Set(dto.allergenIds)];
      const foundAllergens = await this.prisma.allergen.findMany({
        where: { id: { in: distinctAllergenIds } },
      });
      if (foundAllergens.length !== distinctAllergenIds.length) {
        throw new NotFoundException('One or more selected allergens do not exist');
      }
    }

    // 5. Validate Dietary Tags if supplied
    if (dto.dietaryTagIds && dto.dietaryTagIds.length > 0) {
      const distinctTagIds = [...new Set(dto.dietaryTagIds)];
      const foundTags = await this.prisma.dietaryTag.findMany({
        where: { id: { in: distinctTagIds } },
      });
      if (foundTags.length !== distinctTagIds.length) {
        throw new NotFoundException('One or more selected dietary tags do not exist');
      }
    }

    // 6. Validate Option Groups if supplied
    if (dto.optionGroupIds && dto.optionGroupIds.length > 0) {
      const distinctGroupIds = [...new Set(dto.optionGroupIds)];
      const foundGroups = await this.prisma.optionGroup.findMany({
        where: { id: { in: distinctGroupIds } },
      });
      if (foundGroups.length !== distinctGroupIds.length) {
        throw new NotFoundException('One or more selected option groups do not exist');
      }
    }

    // 7. Transaction to create Dish and relations
    return this.prisma.$transaction(async (tx) => {
      const dish = await tx.dish.create({
        data: {
          name: dto.name.trim(),
          sku: dto.sku.trim(),
          description: dto.description?.trim(),
          costInPaise: dto.costInPaise ?? 0,
          kitchenStationId: dto.kitchenStationId,
          portionId: dto.portionId,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.allergenIds && dto.allergenIds.length > 0) {
        const distinctAllergenIds = [...new Set(dto.allergenIds)];
        await tx.dishAllergen.createMany({
          data: distinctAllergenIds.map((allergenId) => ({
            dishId: dish.id,
            allergenId,
          })),
        });
      }

      if (dto.dietaryTagIds && dto.dietaryTagIds.length > 0) {
        const distinctTagIds = [...new Set(dto.dietaryTagIds)];
        await tx.dishDietaryTag.createMany({
          data: distinctTagIds.map((dietaryTagId) => ({
            dishId: dish.id,
            dietaryTagId,
          })),
        });
      }

      if (dto.optionGroupIds && dto.optionGroupIds.length > 0) {
        const distinctGroupIds = [...new Set(dto.optionGroupIds)];
        await tx.dishOptionGroup.createMany({
          data: distinctGroupIds.map((optionGroupId) => ({
            dishId: dish.id,
            optionGroupId,
          })),
        });
      }

      return tx.dish.findUnique({
        where: { id: dish.id },
        include: {
          kitchenStation: true,
          portion: true,
          allergens: { include: { allergen: true } },
          dietaryTags: { include: { dietaryTag: true } },
          dishOptionGroups: {
            include: {
              optionGroup: {
                include: {
                  optionGroupOptions: { include: { option: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  async updateDish(id: string, dto: UpdateDishDto) {
    const existing = await this.prisma.dish.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dish with ID "${id}" not found`);
    }

    if (dto.sku && dto.sku.trim() !== existing.sku) {
      const duplicate = await this.prisma.dish.findUnique({
        where: { sku: dto.sku.trim() },
      });
      if (duplicate) {
        throw new ConflictException(`A dish with SKU "${dto.sku}" already exists`);
      }
    }

    if (dto.kitchenStationId !== undefined && dto.kitchenStationId !== null) {
      const station = await this.prisma.kitchenStation.findUnique({
        where: { id: dto.kitchenStationId },
      });
      if (!station) {
        throw new NotFoundException(`Kitchen station with ID "${dto.kitchenStationId}" not found`);
      }
    }

    if (dto.portionId !== undefined && dto.portionId !== null) {
      const portion = await this.prisma.portion.findUnique({
        where: { id: dto.portionId },
      });
      if (!portion) {
        throw new NotFoundException(`Portion with ID "${dto.portionId}" not found`);
      }
    }

    if (dto.allergenIds !== undefined && dto.allergenIds.length > 0) {
      const distinctAllergenIds = [...new Set(dto.allergenIds)];
      const foundAllergens = await this.prisma.allergen.findMany({
        where: { id: { in: distinctAllergenIds } },
      });
      if (foundAllergens.length !== distinctAllergenIds.length) {
        throw new NotFoundException('One or more selected allergens do not exist');
      }
    }

    if (dto.dietaryTagIds !== undefined && dto.dietaryTagIds.length > 0) {
      const distinctTagIds = [...new Set(dto.dietaryTagIds)];
      const foundTags = await this.prisma.dietaryTag.findMany({
        where: { id: { in: distinctTagIds } },
      });
      if (foundTags.length !== distinctTagIds.length) {
        throw new NotFoundException('One or more selected dietary tags do not exist');
      }
    }

    if (dto.optionGroupIds !== undefined && dto.optionGroupIds.length > 0) {
      const distinctGroupIds = [...new Set(dto.optionGroupIds)];
      const foundGroups = await this.prisma.optionGroup.findMany({
        where: { id: { in: distinctGroupIds } },
      });
      if (foundGroups.length !== distinctGroupIds.length) {
        throw new NotFoundException('One or more selected option groups do not exist');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.dish.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          sku: dto.sku ? dto.sku.trim() : undefined,
          description: dto.description !== undefined ? dto.description?.trim() : undefined,
          costInPaise: dto.costInPaise !== undefined ? dto.costInPaise : undefined,
          kitchenStationId: dto.kitchenStationId,
          portionId: dto.portionId,
          isActive: dto.isActive,
        },
      });

      if (dto.allergenIds !== undefined) {
        await tx.dishAllergen.deleteMany({ where: { dishId: id } });
        if (dto.allergenIds.length > 0) {
          const distinctAllergenIds = [...new Set(dto.allergenIds)];
          await tx.dishAllergen.createMany({
            data: distinctAllergenIds.map((allergenId) => ({
              dishId: id,
              allergenId,
            })),
          });
        }
      }

      if (dto.dietaryTagIds !== undefined) {
        await tx.dishDietaryTag.deleteMany({ where: { dishId: id } });
        if (dto.dietaryTagIds.length > 0) {
          const distinctTagIds = [...new Set(dto.dietaryTagIds)];
          await tx.dishDietaryTag.createMany({
            data: distinctTagIds.map((dietaryTagId) => ({
              dishId: id,
              dietaryTagId,
            })),
          });
        }
      }

      if (dto.optionGroupIds !== undefined) {
        await tx.dishOptionGroup.deleteMany({ where: { dishId: id } });
        if (dto.optionGroupIds.length > 0) {
          const distinctGroupIds = [...new Set(dto.optionGroupIds)];
          await tx.dishOptionGroup.createMany({
            data: distinctGroupIds.map((optionGroupId) => ({
              dishId: id,
              optionGroupId,
            })),
          });
        }
      }

      return tx.dish.findUnique({
        where: { id },
        include: {
          kitchenStation: true,
          portion: true,
          allergens: { include: { allergen: true } },
          dietaryTags: { include: { dietaryTag: true } },
          dishOptionGroups: {
            include: {
              optionGroup: {
                include: {
                  optionGroupOptions: { include: { option: true } },
                },
              },
            },
          },
        },
      });
    });
  }
}
