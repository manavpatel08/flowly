import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { CompleteDropDto } from './dto/complete-drop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('driver')
export class DriverController {
  constructor(private readonly dispatchService: DispatchService) {}

  @RequirePermissions('delivery.read')
  @Get('drops/today')
  async getTodayDrops(@CurrentUser() user: any) {
    const driverId = user.sub || user.id;
    return this.dispatchService.getDriverDropsToday(driverId);
  }

  @RequirePermissions('delivery.read')
  @Get('deliveries')
  async getDeliveries(@CurrentUser() user: any) {
    const driverId = user.sub || user.id;
    return this.dispatchService.getDriverDropsToday(driverId);
  }

  @RequirePermissions('delivery.update')
  @Post('drops/:id/delivered')
  async markMyDropDelivered(
    @Param('id') id: string,
    @Body() dto: CompleteDropDto,
    @CurrentUser() user: any,
  ) {
    const driverId = user.role === 'DRIVER' ? (user.sub || user.id) : undefined;
    return this.dispatchService.markDelivered(id, dto, driverId);
  }

  @RequirePermissions('delivery.update')
  @Post('deliveries/:id/pod')
  async submitPod(
    @Param('id') id: string,
    @Body() dto: CompleteDropDto,
    @CurrentUser() user: any,
  ) {
    const driverId = user.role === 'DRIVER' ? (user.sub || user.id) : undefined;
    return this.dispatchService.markDelivered(id, dto, driverId);
  }

  @RequirePermissions('delivery.update')
  @Post('deliveries/:id/delivered')
  async markDeliveryDelivered(
    @Param('id') id: string,
    @Body() dto: CompleteDropDto,
    @CurrentUser() user: any,
  ) {
    const driverId = user.role === 'DRIVER' ? (user.sub || user.id) : undefined;
    return this.dispatchService.markDelivered(id, dto, driverId);
  }
}
