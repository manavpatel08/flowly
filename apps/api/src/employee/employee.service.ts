import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    companyId?: string;
    isActive?: boolean | string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.EmployeeWhereInput = {};

    if (query.companyId && query.companyId.trim()) {
      where.companyId = query.companyId.trim();
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === true || query.isActive === 'true';
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: { id: true, name: true },
          },
          allergens: {
            include: { allergen: true },
          },
          dietaryTags: {
            include: { dietaryTag: true },
          },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: employees,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true },
        },
        allergens: {
          include: { allergen: true },
        },
        dietaryTags: {
          include: { dietaryTag: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    // 1. Validate Company
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${dto.companyId}" not found`);
    }

    // 2. Validate Email uniqueness
    const existing = await this.prisma.employee.findFirst({
      where: { email: { equals: dto.email.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`An employee with email "${dto.email}" already exists`);
    }

    // 3. Validate Allergens if provided
    if (dto.allergenIds && dto.allergenIds.length > 0) {
      const distinctAllergenIds = [...new Set(dto.allergenIds)];
      const foundAllergens = await this.prisma.allergen.findMany({
        where: { id: { in: distinctAllergenIds } },
      });
      if (foundAllergens.length !== distinctAllergenIds.length) {
        throw new NotFoundException('One or more selected allergens do not exist');
      }
    }

    // 4. Validate Dietary Tags if provided
    if (dto.dietaryTagIds && dto.dietaryTagIds.length > 0) {
      const distinctTagIds = [...new Set(dto.dietaryTagIds)];
      const foundTags = await this.prisma.dietaryTag.findMany({
        where: { id: { in: distinctTagIds } },
      });
      if (foundTags.length !== distinctTagIds.length) {
        throw new NotFoundException('One or more selected dietary tags do not exist');
      }
    }

    // 5. Transaction to create employee with allergens & tags
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          companyId: dto.companyId,
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          canChooseAddress: dto.canChooseAddress ?? false,
          canChangeDeliveryTime: dto.canChangeDeliveryTime ?? false,
          canChangePackaging: dto.canChangePackaging ?? false,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.allergenIds && dto.allergenIds.length > 0) {
        const distinctAllergenIds = [...new Set(dto.allergenIds)];
        await tx.employeeAllergen.createMany({
          data: distinctAllergenIds.map((allergenId) => ({
            employeeId: employee.id,
            allergenId,
          })),
        });
      }

      if (dto.dietaryTagIds && dto.dietaryTagIds.length > 0) {
        const distinctTagIds = [...new Set(dto.dietaryTagIds)];
        await tx.employeeDietaryTag.createMany({
          data: distinctTagIds.map((dietaryTagId) => ({
            employeeId: employee.id,
            dietaryTagId,
          })),
        });
      }

      return tx.employee.findUnique({
        where: { id: employee.id },
        include: {
          company: { select: { id: true, name: true } },
          allergens: { include: { allergen: true } },
          dietaryTags: { include: { dietaryTag: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    if (dto.companyId && dto.companyId !== existing.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID "${dto.companyId}" not found`);
      }
    }

    if (dto.email && dto.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const duplicate = await this.prisma.employee.findFirst({
        where: {
          email: { equals: dto.email.trim(), mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`An employee with email "${dto.email}" already exists`);
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

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.EmployeeUpdateInput = {};

      if (dto.name !== undefined) updateData.name = dto.name.trim();
      if (dto.email !== undefined) updateData.email = dto.email.trim().toLowerCase();
      if (dto.companyId !== undefined) {
        updateData.company = { connect: { id: dto.companyId } };
      }
      if (dto.canChooseAddress !== undefined) updateData.canChooseAddress = dto.canChooseAddress;
      if (dto.canChangeDeliveryTime !== undefined) updateData.canChangeDeliveryTime = dto.canChangeDeliveryTime;
      if (dto.canChangePackaging !== undefined) updateData.canChangePackaging = dto.canChangePackaging;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      await tx.employee.update({
        where: { id },
        data: updateData,
      });

      if (dto.allergenIds !== undefined) {
        await tx.employeeAllergen.deleteMany({
          where: { employeeId: id },
        });

        if (dto.allergenIds.length > 0) {
          const distinctAllergenIds = [...new Set(dto.allergenIds)];
          await tx.employeeAllergen.createMany({
            data: distinctAllergenIds.map((allergenId) => ({
              employeeId: id,
              allergenId,
            })),
          });
        }
      }

      if (dto.dietaryTagIds !== undefined) {
        await tx.employeeDietaryTag.deleteMany({
          where: { employeeId: id },
        });

        if (dto.dietaryTagIds.length > 0) {
          const distinctTagIds = [...new Set(dto.dietaryTagIds)];
          await tx.employeeDietaryTag.createMany({
            data: distinctTagIds.map((dietaryTagId) => ({
              employeeId: id,
              dietaryTagId,
            })),
          });
        }
      }

      return tx.employee.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true } },
          allergens: { include: { allergen: true } },
          dietaryTags: { include: { dietaryTag: true } },
        },
      });
    });
  }
}
