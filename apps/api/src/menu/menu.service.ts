import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
} from './dto/menu-category.dto';
import {
  AddCategoryDishDto,
  UpdateCategoryDishDto,
} from './dto/category-dish.dto';
import { ToggleVisibilityDto } from './dto/company-visibility.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. BASE MENU
  // ==========================================

  async findAllMenus(query?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.MenuWhereInput = {};
    if (query?.search && query.search.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [menus, total] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { categories: true },
          },
        },
      }),
      this.prisma.menu.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: menus,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findOneMenu(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            categoryItems: {
              orderBy: { sortOrder: 'asc' },
              include: {
                dish: {
                  include: {
                    kitchenStation: true,
                    portion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID "${id}" not found`);
    }

    return menu;
  }

  async createMenu(dto: CreateMenuDto) {
    return this.prisma.menu.create({
      data: {
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateMenu(id: string, dto: UpdateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Menu with ID "${id}" not found`);
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================
  // 2. MENU CATEGORIES
  // ==========================================

  async findCategories(menuId: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) {
      throw new NotFoundException(`Menu with ID "${menuId}" not found`);
    }

    return this.prisma.menuCategory.findMany({
      where: { menuId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { categoryItems: true },
        },
      },
    });
  }

  async createCategory(menuId: string, dto: CreateMenuCategoryDto) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) {
      throw new NotFoundException(`Menu with ID "${menuId}" not found`);
    }

    return this.prisma.menuCategory.create({
      data: {
        menuId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(
    menuId: string,
    categoryId: string,
    dto: UpdateMenuCategoryDto,
  ) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    if (category.menuId !== menuId) {
      throw new BadRequestException('Category does not belong to specified menu');
    }

    return this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================
  // 3. CATEGORY DISHES
  // ==========================================

  async findCategoryDishes(menuId: string, categoryId: string) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }
    if (category.menuId !== menuId) {
      throw new BadRequestException('Category does not belong to specified menu');
    }

    return this.prisma.categoryItem.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
      include: {
        dish: {
          include: {
            kitchenStation: true,
            portion: true,
            allergens: { include: { allergen: true } },
            dietaryTags: { include: { dietaryTag: true } },
          },
        },
      },
    });
  }

  async addCategoryDish(
    menuId: string,
    categoryId: string,
    dto: AddCategoryDishDto,
  ) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }
    if (category.menuId !== menuId) {
      throw new BadRequestException('Category does not belong to specified menu');
    }

    const dish = await this.prisma.dish.findUnique({
      where: { id: dto.dishId },
    });
    if (!dish) {
      throw new NotFoundException(`Dish with ID "${dto.dishId}" not found`);
    }
    if (!dish.isActive) {
      throw new BadRequestException('Cannot add an inactive dish to a menu category');
    }

    const existing = await this.prisma.categoryItem.findUnique({
      where: {
        categoryId_dishId: {
          categoryId,
          dishId: dto.dishId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This dish is already in this category');
    }

    return this.prisma.categoryItem.create({
      data: {
        categoryId,
        dishId: dto.dishId,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        dish: true,
      },
    });
  }

  async updateCategoryDish(
    menuId: string,
    categoryId: string,
    dishId: string,
    dto: UpdateCategoryDishDto,
  ) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.menuId !== menuId) {
      throw new BadRequestException('Category does not belong to specified menu');
    }

    const item = await this.prisma.categoryItem.findUnique({
      where: {
        categoryId_dishId: {
          categoryId,
          dishId,
        },
      },
    });
    if (!item) {
      throw new NotFoundException('Dish is not associated with this category');
    }

    return this.prisma.categoryItem.update({
      where: {
        categoryId_dishId: {
          categoryId,
          dishId,
        },
      },
      data: {
        sortOrder: dto.sortOrder,
      },
    });
  }

  // ==========================================
  // 4. COMPANY-SPECIFIC MENU VISIBILITY
  // ==========================================

  async findCompanyCategoriesVisibility(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { hiddenCategories: true },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const hiddenSet = new Set(company.hiddenCategories.map((hc) => hc.categoryId));
    const allCategories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return allCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      menuId: cat.menuId,
      sortOrder: cat.sortOrder,
      isHidden: hiddenSet.has(cat.id),
      isVisible: !hiddenSet.has(cat.id),
    }));
  }

  async setCompanyCategoryVisibility(
    companyId: string,
    categoryId: string,
    dto: ToggleVisibilityDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    const shouldHide = dto.isHidden ?? (dto.isVisible !== undefined ? !dto.isVisible : true);

    if (shouldHide) {
      await this.prisma.companyHiddenCategory.upsert({
        where: {
          companyId_categoryId: {
            companyId,
            categoryId,
          },
        },
        update: {},
        create: {
          companyId,
          categoryId,
        },
      });
      return { companyId, categoryId, isHidden: true, isVisible: false };
    } else {
      await this.prisma.companyHiddenCategory.deleteMany({
        where: {
          companyId,
          categoryId,
        },
      });
      return { companyId, categoryId, isHidden: false, isVisible: true };
    }
  }

  async findCompanyDishesVisibility(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { hiddenDishes: true },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const hiddenSet = new Set(company.hiddenDishes.map((hd) => hd.dishId));
    const allDishes = await this.prisma.dish.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sku: true },
    });

    return allDishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      sku: dish.sku,
      isHidden: hiddenSet.has(dish.id),
      isVisible: !hiddenSet.has(dish.id),
    }));
  }

  async setCompanyDishVisibility(
    companyId: string,
    dishId: string,
    dto: ToggleVisibilityDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
    });
    if (!dish) {
      throw new NotFoundException(`Dish with ID "${dishId}" not found`);
    }

    const shouldHide = dto.isHidden ?? (dto.isVisible !== undefined ? !dto.isVisible : true);

    if (shouldHide) {
      await this.prisma.companyHiddenDish.upsert({
        where: {
          companyId_dishId: {
            companyId,
            dishId,
          },
        },
        update: {},
        create: {
          companyId,
          dishId,
        },
      });
      return { companyId, dishId, isHidden: true, isVisible: false };
    } else {
      await this.prisma.companyHiddenDish.deleteMany({
        where: {
          companyId,
          dishId,
        },
      });
      return { companyId, dishId, isHidden: false, isVisible: true };
    }
  }

  // ==========================================
  // 5. COMPANY MENU RESOLUTION
  // ==========================================

  async resolveCompanyMenu(companyId: string) {
    // 1. Find Company with assigned PriceTier and hidden filters
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        priceTier: true,
        hiddenCategories: true,
        hiddenDishes: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    // 2. Resolve PriceTier (explicit or fallback to system default)
    let priceTier = company.priceTier;
    if (!priceTier) {
      priceTier = await this.prisma.priceTier.findFirst({
        where: { isDefault: true, isActive: true },
      });
    }
    if (!priceTier) {
      priceTier = await this.prisma.priceTier.findFirst({
        where: { isActive: true },
      });
    }
    if (!priceTier) {
      throw new NotFoundException(
        'No valid active PriceTier could be resolved for this company',
      );
    }

    // 3. Find Active Menu
    const menu = await this.prisma.menu.findFirst({
      where: { isActive: true },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            categoryItems: {
              orderBy: { sortOrder: 'asc' },
              include: {
                dish: {
                  include: {
                    kitchenStation: true,
                    portion: true,
                    allergens: { include: { allergen: true } },
                    dietaryTags: { include: { dietaryTag: true } },
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
                },
              },
            },
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException('No active menu found');
    }

    // 4. Load DishPrices and OptionPrices for this PriceTier
    const dishPrices = await this.prisma.dishPrice.findMany({
      where: { priceTierId: priceTier.id },
    });
    const dishPriceMap = new Map<string, number>();
    for (const dp of dishPrices) {
      dishPriceMap.set(dp.dishId, dp.priceInPaise);
    }

    const optionPrices = await this.prisma.optionPrice.findMany({
      where: { priceTierId: priceTier.id },
    });
    const optionPriceMap = new Map<string, number>();
    for (const op of optionPrices) {
      optionPriceMap.set(op.optionId, op.priceInPaise);
    }

    // 5. Visibility sets
    const hiddenCategoryIds = new Set(
      company.hiddenCategories.map((hc) => hc.categoryId),
    );
    const hiddenDishIds = new Set(
      company.hiddenDishes.map((hd) => hd.dishId),
    );

    // 6. Assemble resolved categories and dishes
    const resolvedCategories = [];

    for (const category of menu.categories) {
      if (hiddenCategoryIds.has(category.id)) {
        continue;
      }

      const resolvedDishes = [];

      for (const item of category.categoryItems) {
        const dish = item.dish;

        // Check if dish is hidden by company or inactive
        if (hiddenDishIds.has(dish.id) || !dish.isActive) {
          continue;
        }

        // Check if dish has a price in the resolved tier
        const priceInPaise = dishPriceMap.get(dish.id);
        if (priceInPaise === undefined) {
          // Hide dishes that have NO price in resolved tier
          continue;
        }

        // Resolve Option Groups and Option prices
        const resolvedOptionGroups = [];
        for (const dog of dish.dishOptionGroups) {
          const og = dog.optionGroup;
          if (!og.isActive) continue;

          const resolvedOptions = [];
          for (const ogo of og.optionGroupOptions) {
            const opt = ogo.option;
            if (!opt.isActive) continue;

            const optPrice = optionPriceMap.get(opt.id) ?? opt.costInPaise;
            resolvedOptions.push({
              id: opt.id,
              name: opt.name,
              priceInPaise: optPrice,
            });
          }

          resolvedOptionGroups.push({
            id: og.id,
            name: og.name,
            isRequired: og.isRequired,
            options: resolvedOptions,
          });
        }

        resolvedDishes.push({
          id: dish.id,
          name: dish.name,
          sku: dish.sku,
          description: dish.description,
          priceInPaise,
          kitchenStation: dish.kitchenStation
            ? { id: dish.kitchenStation.id, name: dish.kitchenStation.name }
            : null,
          portion: dish.portion
            ? { id: dish.portion.id, name: dish.portion.name }
            : null,
          allergens: dish.allergens.map((a) => ({
            id: a.allergen.id,
            name: a.allergen.name,
          })),
          dietaryTags: dish.dietaryTags.map((t) => ({
            id: t.dietaryTag.id,
            name: t.dietaryTag.name,
          })),
          optionGroups: resolvedOptionGroups,
        });
      }

      resolvedCategories.push({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        dishes: resolvedDishes,
      });
    }

    return {
      company: {
        id: company.id,
        name: company.name,
      },
      priceTier: {
        id: priceTier.id,
        name: priceTier.name,
        isDefault: priceTier.isDefault,
      },
      menu: {
        id: menu.id,
        name: menu.name,
      },
      categories: resolvedCategories,
    };
  }

  // ==========================================
  // 6. EMPLOYEE MENU RESOLUTION
  // ==========================================

  async resolveEmployeeMenu(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        company: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID "${employeeId}" not found`);
    }

    return this.resolveCompanyMenu(employee.companyId);
  }
}
