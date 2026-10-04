import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyAddressDto } from './dto/create-company-address.dto';
import { UpdateCompanyAddressDto } from './dto/update-company-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @RequirePermissions('company.read')
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.companyService.findAll({ page, pageSize, search, isActive });
  }

  @RequirePermissions('company.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @RequirePermissions('company.write')
  @Post()
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  @RequirePermissions('company.write')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, updateCompanyDto);
  }

  // ==========================================
  // ADDRESSES
  // ==========================================

  @RequirePermissions('company.read')
  @Get(':companyId/addresses')
  async findAddresses(@Param('companyId') companyId: string) {
    return this.companyService.findAddresses(companyId);
  }

  @RequirePermissions('company.write')
  @Post(':companyId/addresses')
  async createAddress(
    @Param('companyId') companyId: string,
    @Body() createAddressDto: CreateCompanyAddressDto,
  ) {
    return this.companyService.createAddress(companyId, createAddressDto);
  }

  @RequirePermissions('company.write')
  @Patch(':companyId/addresses/:addressId')
  async updateAddress(
    @Param('companyId') companyId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateCompanyAddressDto,
  ) {
    return this.companyService.updateAddress(
      companyId,
      addressId,
      updateAddressDto,
    );
  }
}
