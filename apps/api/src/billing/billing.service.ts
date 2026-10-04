import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. CREATE INVOICE
  // ==========================================
  async createInvoice(dto: CreateInvoiceDto) {
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('At least one order ID is required to create an invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch all requested orders
      const orders = await tx.order.findMany({
        where: {
          id: { in: dto.orderIds },
        },
        include: {
          invoiceOrder: true,
          company: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
      });

      if (orders.length !== dto.orderIds.length) {
        throw new NotFoundException('One or more specified orders could not be found');
      }

      // 2. Validate that each order is billable (CONFIRMED or DELIVERED) and not already invoiced
      for (const order of orders) {
        if (
          order.status !== OrderStatus.CONFIRMED &&
          order.status !== OrderStatus.DELIVERED
        ) {
          throw new BadRequestException(
            `Order "${order.id}" is in status "${order.status}". Only CONFIRMED or DELIVERED orders can be invoiced.`,
          );
        }

        if (order.invoiceOrder) {
          throw new ConflictException(
            `Order "${order.id}" is already attached to invoice "${order.invoiceOrder.invoiceId}"`,
          );
        }
      }

      // 3. Server-side total calculation from historical totalInPaise
      const calculatedTotalInPaise = orders.reduce(
        (sum, order) => sum + order.totalInPaise,
        0,
      );

      // 4. Generate unique invoice number
      const timestamp = Date.now();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${timestamp}-${randomSuffix}`;

      // 5. Create Invoice and associate orders
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          totalInPaise: calculatedTotalInPaise,
          invoiceOrders: {
            create: orders.map((o) => ({
              orderId: o.id,
            })),
          },
        },
        include: {
          invoiceOrders: {
            include: {
              order: {
                select: {
                  id: true,
                  status: true,
                  totalInPaise: true,
                  deliveryDate: true,
                  deliveryTime: true,
                  company: { select: { id: true, name: true } },
                  employee: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      return invoice;
    });
  }

  // ==========================================
  // 2. FIND INVOICES
  // ==========================================
  async findAllInvoices(query: { page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { invoiceOrders: true },
          },
          invoiceOrders: {
            include: {
              order: {
                select: {
                  id: true,
                  status: true,
                  totalInPaise: true,
                  company: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.invoice.count(),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOneInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        invoiceOrders: {
          include: {
            order: {
              include: {
                company: true,
                employee: true,
                combinations: {
                  include: {
                    combinationOptions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    return invoice;
  }

  async findEligibleOrders(companyId?: string) {
    const where: any = {
      status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] },
      invoiceOrder: null,
    };
    if (companyId) where.companyId = companyId;

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });
  }

  async generateInvoiceForCompany(dto: {
    companyId?: string;
    periodStart?: string;
    periodEnd?: string;
    orderIds?: string[];
  }) {
    let orderIds = dto.orderIds;
    if (!orderIds || orderIds.length === 0) {
      const eligible = await this.findEligibleOrders(dto.companyId);
      orderIds = eligible.map((o) => o.id);
    }
    if (orderIds.length === 0) {
      throw new BadRequestException('No eligible unbilled orders found');
    }
    return this.createInvoice({ orderIds });
  }
}
