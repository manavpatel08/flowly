import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenStatus } from '@prisma/client';

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. KITCHEN QUEUE & STATIONS
  // ==========================================
  async findAllStations() {
    return this.prisma.kitchenStation.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getQueue(query: { status?: KitchenStatus; stationId?: string }) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: [KitchenStatus.PENDING, KitchenStatus.STARTED] };
    }

    if (query.stationId) {
      if (query.stationId === 'unassigned') {
        where.combination = {
          dish: {
            kitchenStationId: null,
          },
        };
      } else {
        where.combination = {
          dish: {
            kitchenStationId: query.stationId,
          },
        };
      }
    }

    return this.prisma.kitchenUnit.findMany({
      where,
      orderBy: [
        { combination: { order: { deliveryDate: 'asc' } } },
        { combination: { order: { deliveryTime: 'asc' } } },
        { id: 'asc' },
      ],
      include: {
        combination: {
          include: {
            dish: {
              include: {
                kitchenStation: true,
              },
            },
            combinationOptions: true,
            order: {
              select: {
                id: true,
                status: true,
                deliveryDate: true,
                deliveryTime: true,
                kitchenStartedAt: true,
                kitchenReadyAt: true,
                packaging: true,
                driverInstructions: true,
                company: {
                  select: { id: true, name: true },
                },
                employee: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // ==========================================
  // 2. START UNIT
  // ==========================================
  async startUnit(unitId: string) {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.kitchenUnit.findUnique({
        where: { id: unitId },
        include: {
          combination: {
            include: {
              order: true,
            },
          },
        },
      });

      if (!unit) {
        throw new NotFoundException(`Kitchen unit with ID "${unitId}" not found`);
      }

      if (unit.status === KitchenStatus.STARTED) {
        throw new ConflictException('Kitchen unit is already started');
      }

      if (unit.status === KitchenStatus.DONE) {
        throw new ConflictException('Kitchen unit is already completed');
      }

      const now = new Date();

      const updated = await tx.kitchenUnit.update({
        where: { id: unitId },
        data: {
          status: KitchenStatus.STARTED,
          kitchenStartedAt: now,
        },
      });

      // If first unit started for the order, set order.kitchenStartedAt
      if (!unit.combination.order.kitchenStartedAt) {
        await tx.order.update({
          where: { id: unit.combination.order.id },
          data: {
            kitchenStartedAt: now,
          },
        });
      }

      return updated;
    });
  }

  // ==========================================
  // 3. DONE UNIT
  // ==========================================
  async completeUnit(unitId: string) {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.kitchenUnit.findUnique({
        where: { id: unitId },
        include: {
          combination: {
            include: {
              order: true,
            },
          },
        },
      });

      if (!unit) {
        throw new NotFoundException(`Kitchen unit with ID "${unitId}" not found`);
      }

      if (unit.status === KitchenStatus.DONE) {
        throw new ConflictException('Kitchen unit is already completed');
      }

      const now = new Date();

      const updated = await tx.kitchenUnit.update({
        where: { id: unitId },
        data: {
          status: KitchenStatus.DONE,
          kitchenStartedAt: unit.kitchenStartedAt || now,
          kitchenReadyAt: now,
        },
      });

      // If unit was completed without an explicit start, set order.kitchenStartedAt as well
      if (!unit.combination.order.kitchenStartedAt) {
        await tx.order.update({
          where: { id: unit.combination.order.id },
          data: {
            kitchenStartedAt: now,
          },
        });
      }

      // Check if all units for this order are now DONE
      const remainingNonDone = await tx.kitchenUnit.count({
        where: {
          combination: { orderId: unit.combination.orderId },
          status: { not: KitchenStatus.DONE },
        },
      });

      if (remainingNonDone === 0) {
        await tx.order.update({
          where: { id: unit.combination.orderId },
          data: {
            kitchenReadyAt: now,
          },
        });
      }

      return updated;
    });
  }

  // ==========================================
  // 4. FORCE COMPLETE ORDER (ADMIN ONLY)
  // ==========================================
  async forceCompleteOrder(orderId: string, currentUser: any) {
    if (currentUser?.role !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can force-complete kitchen units');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          combinations: {
            include: { kitchenUnit: true },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found`);
      }

      const now = new Date();

      for (const comb of order.combinations) {
        if (comb.kitchenUnit) {
          if (comb.kitchenUnit.status !== KitchenStatus.DONE) {
            await tx.kitchenUnit.update({
              where: { id: comb.kitchenUnit.id },
              data: {
                status: KitchenStatus.DONE,
                kitchenStartedAt: comb.kitchenUnit.kitchenStartedAt || now,
                kitchenReadyAt: now,
              },
            });
          }
        } else {
          await tx.kitchenUnit.create({
            data: {
              combinationId: comb.id,
              status: KitchenStatus.DONE,
              kitchenStartedAt: now,
              kitchenReadyAt: now,
            },
          });
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          kitchenStartedAt: order.kitchenStartedAt || now,
          kitchenReadyAt: now,
        },
      });

      return {
        success: true,
        orderId,
        kitchenStartedAt: updatedOrder.kitchenStartedAt,
        kitchenReadyAt: updatedOrder.kitchenReadyAt,
      };
    });
  }
}
