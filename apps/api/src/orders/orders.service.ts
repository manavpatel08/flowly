import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. CREATE ORDER
  // ==========================================
  async createOrder(dto: CreateOrderDto) {
    // 1. Validate employee exists and is active
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: { company: true },
    });

    if (!employee || !employee.isActive) {
      throw new BadRequestException('Employee does not exist or is inactive');
    }

    // 2. Resolve employee -> company
    const company = employee.company;
    if (!company || !company.isActive) {
      throw new BadRequestException('Company is invalid or inactive');
    }

    // 3. Resolve address
    let address;
    if (dto.companyAddressId) {
      address = await this.prisma.companyAddress.findFirst({
        where: { id: dto.companyAddressId, companyId: company.id, isActive: true },
      });
      if (!address) {
        throw new BadRequestException('Selected company address is invalid or inactive');
      }
    } else {
      address = await this.prisma.companyAddress.findFirst({
        where: { companyId: company.id, isDefault: true, isActive: true },
      });
      if (!address) {
        address = await this.prisma.companyAddress.findFirst({
          where: { companyId: company.id, isActive: true },
        });
      }
      if (!address) {
        throw new BadRequestException('No active delivery address found for company');
      }
    }

    // 4. Resolve company -> price tier
    let priceTier;
    if (company.priceTierId) {
      priceTier = await this.prisma.priceTier.findFirst({
        where: { id: company.priceTierId, isActive: true },
      });
    }
    if (!priceTier) {
      priceTier = await this.prisma.priceTier.findFirst({
        where: { isDefault: true, isActive: true },
      });
    }
    if (!priceTier) {
      throw new BadRequestException('No valid price tier resolved for order');
    }

    // 5. Resolve active company menu
    const menu = await this.prisma.menu.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    if (!menu) {
      throw new BadRequestException('No active menu configured');
    }

    // 6. Resolve hidden categories and dishes for company
    const hiddenCategories = await this.prisma.companyHiddenCategory.findMany({
      where: { companyId: company.id },
    });
    const hiddenCategoryIds = new Set(hiddenCategories.map((c) => c.categoryId));

    const hiddenDishes = await this.prisma.companyHiddenDish.findMany({
      where: { companyId: company.id },
    });
    const hiddenDishIds = new Set(hiddenDishes.map((d) => d.dishId));

    // 7. Validate items, dishes, prices, and options
    let calculatedTotalInPaise = 0;
    const preparedCombinations = [];

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      const dish = await this.prisma.dish.findUnique({
        where: { id: item.dishId },
        include: {
          categoryItems: {
            include: {
              category: true,
            },
          },
          dishOptionGroups: {
            include: {
              optionGroup: {
                include: {
                  optionGroupOptions: {
                    include: {
                      option: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!dish || !dish.isActive) {
        throw new BadRequestException(`Dish with ID "${item.dishId}" is not available`);
      }

      // Check dish belongs to an active menu category
      const activeMenuItems = dish.categoryItems.filter(
        (ci) => ci.category.isActive,
      );
      if (activeMenuItems.length === 0) {
        throw new BadRequestException(`Dish "${dish.name}" is not in an active menu`);
      }

      // Check dish is not hidden for company
      if (hiddenDishIds.has(dish.id)) {
        throw new BadRequestException(`Dish "${dish.name}" is unavailable for your company`);
      }

      // Check category is not hidden
      const visibleCategoryItems = activeMenuItems.filter(
        (ci) => !hiddenCategoryIds.has(ci.categoryId),
      );
      if (visibleCategoryItems.length === 0) {
        throw new BadRequestException(`Dish "${dish.name}" category is unavailable for your company`);
      }

      // Validate dish is priced in resolved tier
      const dishPrice = await this.prisma.dishPrice.findUnique({
        where: {
          dishId_priceTierId: {
            dishId: dish.id,
            priceTierId: priceTier.id,
          },
        },
      });

      if (!dishPrice) {
        throw new BadRequestException(
          `Dish "${dish.name}" is not priced in tier "${priceTier.name}"`,
        );
      }

      const dishUnitPriceInPaise = dishPrice.priceInPaise;

      // Validate options and required option groups
      const availableOptionMap = new Map<string, { option: any; group: any }>();
      const requiredGroups = [];

      for (const dog of dish.dishOptionGroups) {
        const og = dog.optionGroup;
        if (!og.isActive) continue;
        if (og.isRequired) {
          requiredGroups.push(og);
        }
        for (const ogo of og.optionGroupOptions) {
          if (ogo.option.isActive) {
            availableOptionMap.set(ogo.option.id, { option: ogo.option, group: og });
          }
        }
      }

      const selectedOptionIds = item.optionIds ?? [];
      const selectedGroupIds = new Set<string>();
      const preparedOptions = [];

      for (const optId of selectedOptionIds) {
        const optionEntry = availableOptionMap.get(optId);
        if (!optionEntry) {
          throw new BadRequestException(
            `Option "${optId}" does not belong to dish "${dish.name}" or is inactive`,
          );
        }

        selectedGroupIds.add(optionEntry.group.id);

        // Resolve option price in tier
        const optPriceRecord = await this.prisma.optionPrice.findUnique({
          where: {
            optionId_priceTierId: {
              optionId: optId,
              priceTierId: priceTier.id,
            },
          },
        });

        const optPrice = optPriceRecord
          ? optPriceRecord.priceInPaise
          : optionEntry.option.costInPaise;

        preparedOptions.push({
          optionId: optId,
          optionNameSnapshot: optionEntry.option.name,
          priceInPaise: optPrice,
        });
      }

      // Check required option groups are satisfied
      for (const reqGroup of requiredGroups) {
        if (!selectedGroupIds.has(reqGroup.id)) {
          throw new BadRequestException(
            `Required option group "${reqGroup.name}" is missing a selection for dish "${dish.name}"`,
          );
        }
      }

      const optionsTotal = preparedOptions.reduce((sum, o) => sum + o.priceInPaise, 0);
      const unitTotal = dishUnitPriceInPaise + optionsTotal;
      calculatedTotalInPaise += unitTotal * item.quantity;

      preparedCombinations.push({
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        quantity: item.quantity,
        unitPriceInPaise: dishUnitPriceInPaise,
        notes: item.notes?.trim() || null,
        options: preparedOptions,
      });
    }

    const initialStatus = dto.status ?? OrderStatus.DRAFT;

    // 8. Create Order in transaction
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          employeeId: employee.id,
          companyId: company.id,
          companyAddressId: address.id,
          deliveryDate: new Date(dto.deliveryDate),
          deliveryTime: dto.deliveryTime.trim(),
          packaging: dto.packaging?.trim() || null,
          driverInstructions: dto.driverInstructions?.trim() || null,
          status: initialStatus,
          totalInPaise: calculatedTotalInPaise,
          addressLabelSnapshot: address.label,
          addressLine1Snapshot: address.addressLine1,
          addressLine2Snapshot: address.addressLine2 || null,
          citySnapshot: address.city,
          pincodeSnapshot: address.pincode,
          timelines: {
            create: {
              status: initialStatus,
            },
          },
        },
      });

      for (const combData of preparedCombinations) {
        const comb = await tx.combination.create({
          data: {
            orderId: order.id,
            dishId: combData.dishId,
            dishNameSnapshot: combData.dishNameSnapshot,
            quantity: combData.quantity,
            unitPriceInPaise: combData.unitPriceInPaise,
            notes: combData.notes,
            combinationOptions: {
              create: combData.options.map((opt) => ({
                optionId: opt.optionId,
                optionNameSnapshot: opt.optionNameSnapshot,
                priceInPaise: opt.priceInPaise,
              })),
            },
          },
        });

        // If order created as CONFIRMED, create KitchenUnit immediately
        if (initialStatus === OrderStatus.CONFIRMED) {
          await tx.kitchenUnit.create({
            data: {
              combinationId: comb.id,
              status: 'PENDING',
            },
          });
        }
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          employee: true,
          company: true,
          companyAddress: true,
          combinations: {
            include: {
              combinationOptions: true,
              kitchenUnit: true,
            },
          },
          timelines: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  // ==========================================
  // 2. FIND ORDERS
  // ==========================================
  async findAllOrders(query: {
    status?: OrderStatus;
    companyId?: string;
    employeeId?: string;
    deliveryDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.companyId) where.companyId = query.companyId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.deliveryDate) where.deliveryDate = new Date(query.deliveryDate);

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, email: true },
          },
          company: {
            select: { id: true, name: true },
          },
          companyAddress: true,
          combinations: {
            include: {
              combinationOptions: true,
              kitchenUnit: true,
            },
          },
          timelines: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        employee: true,
        company: true,
        companyAddress: true,
        combinations: {
          include: {
            combinationOptions: true,
            kitchenUnit: true,
          },
        },
        timelines: {
          orderBy: { createdAt: 'asc' },
        },
        dropOrder: {
          include: {
            drop: {
              include: {
                driver: {
                  select: { id: true, email: true },
                },
              },
            },
          },
        },
        invoiceOrder: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  // ==========================================
  // 3. UPDATE ORDER
  // ==========================================
  async updateOrder(id: string, dto: UpdateOrderDto) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (dto.status && dto.status !== existing.status) {
      return this.transitionStatus(id, dto.status);
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        packaging: dto.packaging !== undefined ? dto.packaging.trim() : undefined,
        driverInstructions:
          dto.driverInstructions !== undefined ? dto.driverInstructions.trim() : undefined,
        companyAddressId: dto.companyAddressId || undefined,
      },
      include: {
        combinations: {
          include: {
            combinationOptions: true,
            kitchenUnit: true,
          },
        },
        timelines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // ==========================================
  // 4. TRANSITIONS
  // ==========================================
  async placeOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order with ID "${id}" not found`);
      }
      if (order.status === OrderStatus.PLACED) {
        throw new ConflictException('Order is already PLACED');
      }
      if (order.status !== OrderStatus.DRAFT) {
        throw new ConflictException(
          `Cannot place order in status "${order.status}". Order must be in DRAFT.`,
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.PLACED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: OrderStatus.PLACED,
        },
      });

      return updated;
    });
  }

  async cancelOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order with ID "${id}" not found`);
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictException('Order is already CANCELLED');
      }
      if (order.status !== OrderStatus.DRAFT && order.status !== OrderStatus.PLACED) {
        throw new BadRequestException(`Cannot cancel order in status "${order.status}"`);
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: OrderStatus.CANCELLED,
        },
      });

      return updated;
    });
  }

  async confirmOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { combinations: { include: { kitchenUnit: true } } },
      });
      if (!order) {
        throw new NotFoundException(`Order with ID "${id}" not found`);
      }
      if (order.status === OrderStatus.CONFIRMED) {
        return order;
      }
      if (order.status !== OrderStatus.PLACED) {
        throw new ConflictException(
          `Cannot confirm order with status "${order.status}". Order must be PLACED.`,
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CONFIRMED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: OrderStatus.CONFIRMED,
        },
      });

      for (const comb of order.combinations) {
        if (!comb.kitchenUnit) {
          await tx.kitchenUnit.create({
            data: {
              combinationId: comb.id,
              status: 'PENDING',
            },
          });
        }
      }

      return updated;
    });
  }

  async transitionStatus(id: string, targetStatus: OrderStatus) {
    switch (targetStatus) {
      case OrderStatus.PLACED:
        return this.placeOrder(id);
      case OrderStatus.CANCELLED:
        return this.cancelOrder(id);
      case OrderStatus.CONFIRMED:
        return this.confirmOrder(id);
      case OrderStatus.DELIVERED:
        return this.deliverOrder(id);
      case OrderStatus.REJECTED:
        return this.rejectOrder(id);
      default:
        throw new BadRequestException(`Unsupported transition to status "${targetStatus}"`);
    }
  }

  async deliverOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order with ID "${id}" not found`);
      }
      if (order.status === OrderStatus.DELIVERED) {
        return order;
      }
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new ConflictException(
          `Cannot deliver order in status "${order.status}". Order must be CONFIRMED.`,
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.DELIVERED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: OrderStatus.DELIVERED,
        },
      });

      return updated;
    });
  }

  async rejectOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order with ID "${id}" not found`);
      }
      if (order.status === OrderStatus.REJECTED) {
        return order;
      }
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new ConflictException(
          `Cannot reject order in status "${order.status}". Order must be CONFIRMED.`,
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.REJECTED },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status: OrderStatus.REJECTED,
        },
      });

      return updated;
    });
  }
}
