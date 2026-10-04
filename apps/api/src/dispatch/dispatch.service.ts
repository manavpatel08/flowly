import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupDropsDto } from './dto/group-drops.dto';
import { CompleteDropDto } from './dto/complete-drop.dto';
import { DropStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. GROUP ORDERS INTO DROPS
  // ==========================================
  async groupOrdersIntoDrops(dto?: GroupDropsDto) {
    const where: any = {
      status: OrderStatus.CONFIRMED,
      dropOrder: null, // Only orders not already assigned to a drop
    };

    if (dto?.date) {
      where.deliveryDate = new Date(dto.date);
    }
    if (dto?.companyId) {
      where.companyId = dto.companyId;
    }
    if (dto?.orderIds && dto.orderIds.length > 0) {
      where.id = { in: dto.orderIds };
    }

    const unassignedOrders = await this.prisma.order.findMany({
      where,
      include: { companyAddress: true },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
    });

    if (unassignedOrders.length === 0) {
      return {
        message: 'No eligible unassigned confirmed orders found to group',
        createdDropCount: 0,
        drops: [],
      };
    }

    // Group by companyId + companyAddressId + deliveryDate + deliveryTime
    const groups = new Map<string, typeof unassignedOrders>();

    for (const order of unassignedOrders) {
      const dateKey = order.deliveryDate.toISOString().split('T')[0];
      const key = `${order.companyId}___${order.companyAddressId}___${dateKey}___${order.deliveryTime}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(order);
    }

    const createdDrops = [];

    for (const [, orders] of groups.entries()) {
      const first = orders[0];

      const drop = await this.prisma.$transaction(async (tx) => {
        const created = await tx.drop.create({
          data: {
            companyId: first.companyId,
            companyAddressId: first.companyAddressId,
            deliveryDate: first.deliveryDate,
            deliveryTime: first.deliveryTime,
            status: DropStatus.KITCHEN_READY,
          },
        });

        for (const o of orders) {
          await tx.dropOrder.create({
            data: {
              dropId: created.id,
              orderId: o.id,
            },
          });
        }

        return tx.drop.findUnique({
          where: { id: created.id },
          include: {
            company: { select: { id: true, name: true } },
            companyAddress: true,
            driver: { select: { id: true, email: true } },
            dropOrders: {
              include: {
                order: {
                  select: {
                    id: true,
                    totalInPaise: true,
                    employee: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        });
      });

      if (drop) {
        createdDrops.push(drop);
      }
    }

    return {
      message: `Successfully created ${createdDrops.length} drops from ${unassignedOrders.length} orders`,
      createdDropCount: createdDrops.length,
      drops: createdDrops,
    };
  }

  // ==========================================
  // 2. FIND DROPS
  // ==========================================
  async findAllDrops(query: {
    status?: DropStatus;
    deliveryDate?: string;
    companyId?: string;
    driverId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.companyId) where.companyId = query.companyId;
    if (query.driverId) where.driverId = query.driverId;
    if (query.deliveryDate) where.deliveryDate = new Date(query.deliveryDate);

    const [items, total] = await Promise.all([
      this.prisma.drop.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ deliveryDate: 'desc' }, { deliveryTime: 'asc' }],
        include: {
          company: { select: { id: true, name: true } },
          companyAddress: true,
          driver: { select: { id: true, email: true } },
          dropOrders: {
            include: {
              order: {
                select: {
                  id: true,
                  status: true,
                  totalInPaise: true,
                  packaging: true,
                  driverInstructions: true,
                  employee: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.drop.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOneDrop(id: string) {
    const drop = await this.prisma.drop.findUnique({
      where: { id },
      include: {
        company: true,
        companyAddress: true,
        driver: { select: { id: true, email: true } },
        dropOrders: {
          include: {
            order: {
              include: {
                employee: true,
                combinations: {
                  include: {
                    combinationOptions: true,
                  },
                },
                timelines: { orderBy: { createdAt: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!drop) {
      throw new NotFoundException(`Drop with ID "${id}" not found`);
    }

    return drop;
  }

  // ==========================================
  // 3. DRIVERS & ASSIGNMENT
  // ==========================================
  async findActiveDrivers() {
    return this.prisma.user.findMany({
      where: {
        role: { name: 'DRIVER' },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  async assignDriver(dropId: string, driverId: string) {
    const drop = await this.prisma.drop.findUnique({ where: { id: dropId } });
    if (!drop) {
      throw new NotFoundException(`Drop with ID "${dropId}" not found`);
    }

    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      include: { role: true },
    });

    if (!driver || !driver.isActive) {
      throw new BadRequestException('Driver user not found or inactive');
    }

    if (driver.role?.name !== 'DRIVER') {
      throw new BadRequestException('Assigned user must have the DRIVER role');
    }

    return this.prisma.drop.update({
      where: { id: dropId },
      data: { driverId: driver.id },
      include: {
        driver: { select: { id: true, email: true } },
        company: true,
        companyAddress: true,
      },
    });
  }

  // ==========================================
  // 4. TRANSITIONS
  // ==========================================
  async markDispatchReady(dropId: string) {
    const drop = await this.prisma.drop.findUnique({ where: { id: dropId } });
    if (!drop) {
      throw new NotFoundException(`Drop with ID "${dropId}" not found`);
    }

    if (drop.status === DropStatus.DISPATCH_READY) {
      throw new ConflictException('Drop is already DISPATCH_READY');
    }

    if (drop.status !== DropStatus.KITCHEN_READY) {
      throw new BadRequestException(
        `Cannot move to DISPATCH_READY from status "${drop.status}". Must be KITCHEN_READY.`,
      );
    }

    return this.prisma.drop.update({
      where: { id: dropId },
      data: { status: DropStatus.DISPATCH_READY },
      include: {
        company: true,
        companyAddress: true,
        driver: { select: { id: true, email: true } },
      },
    });
  }

  async markOutForDelivery(dropId: string) {
    const drop = await this.prisma.drop.findUnique({ where: { id: dropId } });
    if (!drop) {
      throw new NotFoundException(`Drop with ID "${dropId}" not found`);
    }

    if (drop.status === DropStatus.OUT_FOR_DELIVERY) {
      throw new ConflictException('Drop is already OUT_FOR_DELIVERY');
    }

    if (drop.status !== DropStatus.DISPATCH_READY) {
      throw new BadRequestException(
        `Cannot move to OUT_FOR_DELIVERY from status "${drop.status}". Must be DISPATCH_READY.`,
      );
    }

    if (!drop.driverId) {
      throw new BadRequestException('Cannot move to OUT_FOR_DELIVERY without an assigned driver');
    }

    return this.prisma.drop.update({
      where: { id: dropId },
      data: { status: DropStatus.OUT_FOR_DELIVERY },
      include: {
        company: true,
        companyAddress: true,
        driver: { select: { id: true, email: true } },
      },
    });
  }

  async markDelivered(dropId: string, dto?: CompleteDropDto, driverId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const drop = await tx.drop.findUnique({
        where: { id: dropId },
        include: {
          dropOrders: true,
        },
      });

      if (!drop) {
        throw new NotFoundException(`Drop with ID "${dropId}" not found`);
      }

      if (driverId && drop.driverId !== driverId) {
        throw new ForbiddenException('You can only mark drops assigned to you as delivered');
      }

      if (drop.status === DropStatus.DELIVERED) {
        throw new ConflictException('Drop is already DELIVERED');
      }

      if (
        drop.status !== DropStatus.OUT_FOR_DELIVERY &&
        drop.status !== DropStatus.DISPATCH_READY &&
        drop.status !== DropStatus.KITCHEN_READY
      ) {
        throw new BadRequestException(
          `Cannot mark DELIVERED from status "${drop.status}". Must be active drop.`,
        );
      }

      const now = new Date();
      const finalNote =
        dto?.deliveryNote?.trim() ||
        dto?.notes?.trim() ||
        (dto?.recipientName ? `Received by: ${dto.recipientName}` : null);

      const updatedDrop = await tx.drop.update({
        where: { id: dropId },
        data: {
          status: DropStatus.DELIVERED,
          deliveredAt: now,
          deliveryNote: finalNote,
          photoUrl: dto?.photoUrl?.trim() || null,
        },
        include: {
          company: true,
          companyAddress: true,
          driver: { select: { id: true, email: true } },
        },
      });

      // Update all contained orders to DELIVERED and add timeline entry
      for (const dropOrder of drop.dropOrders) {
        await tx.order.update({
          where: { id: dropOrder.orderId },
          data: { status: OrderStatus.DELIVERED },
        });

        await tx.orderTimeline.create({
          data: {
            orderId: dropOrder.orderId,
            status: OrderStatus.DELIVERED,
          },
        });
      }

      return updatedDrop;
    });
  }

  // ==========================================
  // 5. DRIVER SPECIFIC
  // ==========================================
  async getDriverDropsToday(driverId: string) {
    return this.prisma.drop.findMany({
      where: {
        driverId,
      },
      orderBy: [{ deliveryDate: 'asc' }, { deliveryTime: 'asc' }],
      include: {
        company: { select: { id: true, name: true } },
        companyAddress: true,
        dropOrders: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                totalInPaise: true,
                packaging: true,
                driverInstructions: true,
                employee: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }
}
