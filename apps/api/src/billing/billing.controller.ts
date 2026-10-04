import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @RequirePermissions('billing.read')
  @Get('invoices/eligible-orders')
  async getEligibleOrders(@Query('companyId') companyId?: string) {
    return this.billingService.findEligibleOrders(companyId);
  }

  @RequirePermissions('billing.read')
  @Get('billing/eligible-orders')
  async getEligibleOrdersBilling(@Query('companyId') companyId?: string) {
    return this.billingService.findEligibleOrders(companyId);
  }

  @RequirePermissions('billing.read')
  @Get('invoices')
  async findAllInvoices(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.billingService.findAllInvoices({ page, pageSize });
  }

  @RequirePermissions('billing.read')
  @Get('billing/invoices')
  async findAllInvoicesBilling(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.billingService.findAllInvoices({ page, pageSize });
  }

  @RequirePermissions('billing.read')
  @Get('invoices/:id')
  async findOneInvoice(@Param('id') id: string) {
    return this.billingService.findOneInvoice(id);
  }

  @RequirePermissions('billing.read')
  @Get('billing/invoices/:id')
  async findOneInvoiceBilling(@Param('id') id: string) {
    return this.billingService.findOneInvoice(id);
  }

  @RequirePermissions('billing.write')
  @Post('invoices')
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(dto);
  }

  @RequirePermissions('billing.write')
  @Post('billing/invoices')
  async createInvoiceBilling(@Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(dto);
  }

  @RequirePermissions('billing.write')
  @Post('billing/invoices/generate')
  async generateInvoice(@Body() dto: any) {
    return this.billingService.generateInvoiceForCompany(dto);
  }
}
