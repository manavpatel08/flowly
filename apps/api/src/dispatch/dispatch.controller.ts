import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CompleteDropDto } from './dto/complete-drop.dto';
import { GroupDropsDto } from './dto/group-drops.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { DropStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('drops')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @RequirePermissions('dispatch.update')
  @Post('group')
  async groupDrops(@Body() dto: GroupDropsDto) {
    return this.dispatchService.groupOrdersIntoDrops(dto);
  }

  @RequirePermissions('dispatch.read')
  @Get()
  async findAllDrops(
    @Query('status') status?: DropStatus,
    @Query('deliveryDate') deliveryDate?: string,
    @Query('companyId') companyId?: string,
    @Query('driverId') driverId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.dispatchService.findAllDrops({
      status,
      deliveryDate,
      companyId,
      driverId,
      page,
      pageSize,
    });
  }

  @RequirePermissions('dispatch.read')
  @Get('drivers')
  async findActiveDrivers() {
    return this.dispatchService.findActiveDrivers();
  }

  @RequirePermissions('dispatch.read')
  @Get(':id')
  async findOneDrop(@Param('id') id: string) {
    return this.dispatchService.findOneDrop(id);
  }

  @RequirePermissions('dispatch.update')
  @Post(':id/assign-driver')
  async assignDriver(
    @Param('id') id: string,
    @Body() dto: AssignDriverDto,
  ) {
    const driverId = dto.driverId || dto.driverUserId;
    return this.dispatchService.assignDriver(id, driverId!);
  }

  @RequirePermissions('dispatch.update')
  @Post(':id/assign')
  async assignDriverAlias(
    @Param('id') id: string,
    @Body() dto: AssignDriverDto,
  ) {
    const driverId = dto.driverId || dto.driverUserId;
    return this.dispatchService.assignDriver(id, driverId!);
  }

  @RequirePermissions('dispatch.update')
  @Post(':id/dispatch-ready')
  async markDispatchReady(@Param('id') id: string) {
    return this.dispatchService.markDispatchReady(id);
  }

  @RequirePermissions('dispatch.update')
  @Post(':id/out-for-delivery')
  async markOutForDelivery(@Param('id') id: string) {
    return this.dispatchService.markOutForDelivery(id);
  }

  @RequirePermissions('dispatch.update')
  @Post(':id/delivered')
  async markDelivered(
    @Param('id') id: string,
    @Body() dto: CompleteDropDto,
  ) {
    return this.dispatchService.markDelivered(id, dto);
  }
}
