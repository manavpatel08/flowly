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
import { PricingService } from './pricing.service';
import {
  CreatePriceTierDto,
  UpdatePriceTierDto,
} from './dto/price-tier.dto';
import {
  CreateDishPriceDto,
  UpdateDishPriceDto,
} from './dto/dish-price.dto';
import {
  CreateOptionPriceDto,
  UpdateOptionPriceDto,
} from './dto/option-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ==========================================
  // PRICE TIERS
  // ==========================================

  @RequirePermissions('pricing.read')
  @Get('tiers')
  async findAllTiers() {
    return this.pricingService.findAllTiers();
  }

  @RequirePermissions('pricing.read')
  @Get('tiers/:id')
  async findOneTier(@Param('id') id: string) {
    return this.pricingService.findOneTier(id);
  }

  @RequirePermissions('pricing.write')
  @Post('tiers')
  async createTier(@Body() dto: CreatePriceTierDto) {
    return this.pricingService.createTier(dto);
  }

  @RequirePermissions('pricing.write')
  @Patch('tiers/:id')
  async updateTier(
    @Param('id') id: string,
    @Body() dto: UpdatePriceTierDto,
  ) {
    return this.pricingService.updateTier(id, dto);
  }

  // ==========================================
  // DISH PRICING
  // ==========================================

  @RequirePermissions('pricing.read')
  @Get('tiers/:tierId/dishes')
  async findDishPrices(
    @Param('tierId') tierId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.pricingService.findDishPrices(tierId, {
      page,
      pageSize,
      search,
    });
  }

  @RequirePermissions('pricing.write')
  @Post('tiers/:tierId/dishes')
  async setDishPrice(
    @Param('tierId') tierId: string,
    @Body() dto: CreateDishPriceDto,
  ) {
    return this.pricingService.setDishPrice(tierId, dto);
  }

  @RequirePermissions('pricing.write')
  @Patch('tiers/:tierId/dishes/:dishId')
  async updateDishPrice(
    @Param('tierId') tierId: string,
    @Param('dishId') dishId: string,
    @Body() dto: UpdateDishPriceDto,
  ) {
    return this.pricingService.updateDishPrice(tierId, dishId, dto);
  }

  // ==========================================
  // OPTION PRICING
  // ==========================================

  @RequirePermissions('pricing.read')
  @Get('tiers/:tierId/options')
  async findOptionPrices(@Param('tierId') tierId: string) {
    return this.pricingService.findOptionPrices(tierId);
  }

  @RequirePermissions('pricing.write')
  @Post('tiers/:tierId/options')
  async setOptionPrice(
    @Param('tierId') tierId: string,
    @Body() dto: CreateOptionPriceDto,
  ) {
    return this.pricingService.setOptionPrice(tierId, dto);
  }

  @RequirePermissions('pricing.write')
  @Patch('tiers/:tierId/options/:optionId')
  async updateOptionPrice(
    @Param('tierId') tierId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateOptionPriceDto,
  ) {
    return this.pricingService.updateOptionPrice(tierId, optionId, dto);
  }
}
