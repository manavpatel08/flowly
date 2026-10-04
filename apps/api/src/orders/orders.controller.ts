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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrderStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RequirePermissions('order.create')
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @RequirePermissions('order.read')
  @Get()
  async findAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('companyId') companyId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('deliveryDate') deliveryDate?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.ordersService.findAllOrders({
      status,
      companyId,
      employeeId,
      deliveryDate,
      page,
      pageSize,
    });
  }

  @RequirePermissions('order.read')
  @Get(':id')
  async findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOneOrder(id);
  }

  @RequirePermissions('order.update')
  @Patch(':id')
  async updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.updateOrder(id, dto);
  }

  @RequirePermissions('order.update')
  @Post(':id/place')
  async placeOrder(@Param('id') id: string) {
    return this.ordersService.placeOrder(id);
  }

  @RequirePermissions('order.update')
  @Post(':id/confirm')
  async confirmOrder(@Param('id') id: string) {
    return this.ordersService.confirmOrder(id);
  }

  @RequirePermissions('order.cancel')
  @Post(':id/cancel')
  async cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}
