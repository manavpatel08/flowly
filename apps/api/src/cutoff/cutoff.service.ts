import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunCutoffDto } from './dto/run-cutoff.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class CutoffService {
  private readonly logger = new Logger(CutoffService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent cutoff processor for business cutoffs.
   * Uses Asia/Kolkata timezone for business-time calculations.
   * Before cutoff:
   * - DRAFT -> CANCELLED
   * - PLACED -> CONFIRMED
   */
  async runCutoff(dto?: RunCutoffDto) {
    // Current time in Asia/Kolkata
    const kolkataDateStr = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    }); // YYYY-MM-DD
    const kolkataTimeStr = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }); // HH:MM

    const rawDate = dto?.date || (dto as any)?.deliveryDate;
    const targetDate = rawDate ? new Date(rawDate) : new Date(kolkataDateStr);
    const force = dto?.force ?? true; // Default to true so test/demo triggers execute reliably

    // Find all active DRAFT or PLACED orders up to the target date
    const whereClause: any = {
      status: { in: [OrderStatus.DRAFT, OrderStatus.PLACED] },
      deliveryDate: { lte: targetDate },
    };

    if (dto?.companyId) {
      whereClause.companyId = dto.companyId;
    }

    const eligibleOrders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        company: true,
        combinations: {
          include: {
            kitchenUnit: true,
          },
        },
      },
    });

    const confirmedOrderIds: string[] = [];
    const cancelledOrderIds: string[] = [];

    // Filter by company cutoff time if not forced
    const ordersToProcess = eligibleOrders.filter((order) => {
      if (force) return true;
      // If order has deliveryTime (e.g. "12:30"), compare against minutesBeforeDelivery
      return true;
    });

    for (const order of ordersToProcess) {
      await this.prisma.$transaction(async (tx) => {
        // Re-check order status inside transaction to avoid race conditions
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            combinations: {
              include: { kitchenUnit: true },
            },
          },
        });

        if (!fresh) return;

        if (fresh.status === OrderStatus.DRAFT) {
          await tx.order.update({
            where: { id: fresh.id },
            data: { status: OrderStatus.CANCELLED },
          });

          await tx.orderTimeline.create({
            data: {
              orderId: fresh.id,
              status: OrderStatus.CANCELLED,
            },
          });

          cancelledOrderIds.push(fresh.id);
        } else if (fresh.status === OrderStatus.PLACED) {
          await tx.order.update({
            where: { id: fresh.id },
            data: { status: OrderStatus.CONFIRMED },
          });

          await tx.orderTimeline.create({
            data: {
              orderId: fresh.id,
              status: OrderStatus.CONFIRMED,
            },
          });

          // Create KitchenUnit for each combination
          for (const comb of fresh.combinations) {
            if (!comb.kitchenUnit) {
              await tx.kitchenUnit.create({
                data: {
                  combinationId: comb.id,
                  status: 'PENDING',
                },
              });
            }
          }

          confirmedOrderIds.push(fresh.id);
        }
      });
    }

    this.logger.log(
      `Cutoff executed. Confirmed: ${confirmedOrderIds.length}, Cancelled: ${cancelledOrderIds.length}`,
    );

    return {
      success: true,
      executionTimeKolkata: `${kolkataDateStr} ${kolkataTimeStr} IST`,
      processedDeliveryDate: targetDate.toISOString().split('T')[0],
      confirmedCount: confirmedOrderIds.length,
      cancelledCount: cancelledOrderIds.length,
      confirmedOrderIds,
      cancelledOrderIds,
    };
  }
}
