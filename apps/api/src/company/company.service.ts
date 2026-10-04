import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyAddressDto } from './dto/create-company-address.dto';
import { UpdateCompanyAddressDto } from './dto/update-company-address.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean | string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.CompanyWhereInput = {};

    if (query.search && query.search.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === true || query.isActive === 'true';
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          addresses: true,
          priceTier: {
            select: { id: true, name: true },
          },
          _count: {
            select: { employees: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: companies,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        addresses: true,
        priceTier: true,
        workingDays: {
          orderBy: { dayOfWeek: 'asc' },
        },
        holidays: {
          orderBy: { date: 'asc' },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    return company;
  }

  async create(dto: CreateCompanyDto) {
    if (dto.priceTierId) {
      const priceTier = await this.prisma.priceTier.findUnique({
        where: { id: dto.priceTierId },
      });
      if (!priceTier) {
        throw new NotFoundException(`Price tier with ID "${dto.priceTierId}" not found`);
      }
    }

    if (dto.defaultDriverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
        include: { role: true },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID "${dto.defaultDriverId}" not found`);
      }
      if (driver.role.name !== 'DRIVER') {
        throw new BadRequestException('Assigned default driver must have the DRIVER role');
      }
      if (!driver.isActive) {
        throw new BadRequestException('Assigned default driver account is inactive');
      }
    }

    if (dto.ownerEmployeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.ownerEmployeeId },
      });
      if (!employee) {
        throw new NotFoundException(`Owner employee with ID "${dto.ownerEmployeeId}" not found`);
      }
    }

    return this.prisma.company.create({
      data: {
        name: dto.name,
        billingContact: dto.billingContact,
        priceTierId: dto.priceTierId,
        ownerEmployeeId: dto.ownerEmployeeId,
        defaultDeliveryTime: dto.defaultDeliveryTime,
        minutesBeforeDelivery: dto.minutesBeforeDelivery ?? 60,
        defaultPackaging: dto.defaultPackaging,
        driverInstructions: dto.driverInstructions,
        defaultDriverId: dto.defaultDriverId,
        isActive: dto.isActive ?? true,
      },
      include: {
        addresses: true,
        priceTier: true,
        _count: { select: { employees: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    if (dto.priceTierId !== undefined) {
      if (dto.priceTierId !== null) {
        const priceTier = await this.prisma.priceTier.findUnique({
          where: { id: dto.priceTierId },
        });
        if (!priceTier) {
          throw new NotFoundException(`Price tier with ID "${dto.priceTierId}" not found`);
        }
      }
    }

    if (dto.ownerEmployeeId !== undefined && dto.ownerEmployeeId !== null) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.ownerEmployeeId },
      });
      if (!employee) {
        throw new NotFoundException(`Owner employee with ID "${dto.ownerEmployeeId}" not found`);
      }
      if (employee.companyId !== id) {
        throw new BadRequestException('Owner employee must belong to this company');
      }
    }

    if (dto.defaultDriverId !== undefined && dto.defaultDriverId !== null) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
        include: { role: true },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID "${dto.defaultDriverId}" not found`);
      }
      if (driver.role.name !== 'DRIVER') {
        throw new BadRequestException('Assigned default driver must have the DRIVER role');
      }
      if (!driver.isActive) {
        throw new BadRequestException('Assigned default driver account is inactive');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: dto,
      include: {
        addresses: true,
        priceTier: true,
        _count: { select: { employees: true } },
      },
    });
  }

  // ==========================================
  // ADDRESSES
  // ==========================================

  async findAddresses(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    return this.prisma.companyAddress.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });
  }

  async createAddress(companyId: string, dto: CreateCompanyAddressDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const isDefault = dto.isDefault ?? false;

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.companyAddress.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });

        return tx.companyAddress.create({
          data: {
            companyId,
            label: dto.label,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            city: dto.city,
            pincode: dto.pincode,
            isDefault: true,
          },
        });
      });
    }

    return this.prisma.companyAddress.create({
      data: {
        companyId,
        label: dto.label,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        pincode: dto.pincode,
        isDefault: false,
      },
    });
  }

  async updateAddress(
    companyId: string,
    addressId: string,
    dto: UpdateCompanyAddressDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const address = await this.prisma.companyAddress.findUnique({
      where: { id: addressId },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID "${addressId}" not found`);
    }

    if (address.companyId !== companyId) {
      throw new BadRequestException('Address does not belong to the specified company');
    }

    if (dto.isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.companyAddress.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });

        return tx.companyAddress.update({
          where: { id: addressId },
          data: {
            ...dto,
            isDefault: true,
          },
        });
      });
    }

    return this.prisma.companyAddress.update({
      where: { id: addressId },
      data: dto,
    });
  }
}
