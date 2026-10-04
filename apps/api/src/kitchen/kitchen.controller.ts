import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KitchenStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @RequirePermissions('kitchen.read')
  @Get('kitchen/stations')
  async getStations() {
    return this.kitchenService.findAllStations();
  }

  @RequirePermissions('kitchen.read')
  @Get('kitchen/queue')
  async getQueue(
    @Query('status') status?: KitchenStatus,
    @Query('stationId') stationId?: string,
  ) {
    return this.kitchenService.getQueue({ status, stationId });
  }

  @RequirePermissions('kitchen.update')
  @Post('kitchen/units/:id/start')
  async startUnit(@Param('id') id: string) {
    return this.kitchenService.startUnit(id);
  }

  @RequirePermissions('kitchen.update')
  @Post('kitchen/units/:id/done')
  async completeUnit(@Param('id') id: string) {
    return this.kitchenService.completeUnit(id);
  }

  @RequirePermissions('kitchen.update')
  @Post('kitchen/orders/:id/force-complete')
  async forceCompleteOrderKitchen(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.kitchenService.forceCompleteOrder(id, user);
  }

  @RequirePermissions('kitchen.update')
  @Post('orders/:id/force-complete')
  async forceCompleteOrderDirect(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.kitchenService.forceCompleteOrder(id, user);
  }
}
