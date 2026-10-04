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
import { CatalogueService } from './catalogue.service';
import {
  CreateStationDto,
  UpdateStationDto,
} from './dto/station.dto';
import {
  CreatePortionDto,
  UpdatePortionDto,
  CreateAllergenDto,
  UpdateAllergenDto,
  CreateDietaryTagDto,
  UpdateDietaryTagDto,
} from './dto/attribute.dto';
import {
  CreateOptionDto,
  UpdateOptionDto,
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
} from './dto/option.dto';
import {
  CreateDishDto,
  UpdateDishDto,
} from './dto/dish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  // ==========================================
  // STATIONS
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('stations')
  async findAllStations() {
    return this.catalogueService.findAllStations();
  }

  @RequirePermissions('catalogue.write')
  @Post('stations')
  async createStation(@Body() dto: CreateStationDto) {
    return this.catalogueService.createStation(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('stations/:id')
  async updateStation(
    @Param('id') id: string,
    @Body() dto: UpdateStationDto,
  ) {
    return this.catalogueService.updateStation(id, dto);
  }

  // ==========================================
  // PORTIONS
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('portions')
  async findAllPortions() {
    return this.catalogueService.findAllPortions();
  }

  @RequirePermissions('catalogue.write')
  @Post('portions')
  async createPortion(@Body() dto: CreatePortionDto) {
    return this.catalogueService.createPortion(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('portions/:id')
  async updatePortion(
    @Param('id') id: string,
    @Body() dto: UpdatePortionDto,
  ) {
    return this.catalogueService.updatePortion(id, dto);
  }

  // ==========================================
  // ALLERGENS
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('allergens')
  async findAllAllergens() {
    return this.catalogueService.findAllAllergens();
  }

  @RequirePermissions('catalogue.write')
  @Post('allergens')
  async createAllergen(@Body() dto: CreateAllergenDto) {
    return this.catalogueService.createAllergen(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('allergens/:id')
  async updateAllergen(
    @Param('id') id: string,
    @Body() dto: UpdateAllergenDto,
  ) {
    return this.catalogueService.updateAllergen(id, dto);
  }

  // ==========================================
  // DIETARY TAGS
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('dietary-tags')
  async findAllDietaryTags() {
    return this.catalogueService.findAllDietaryTags();
  }

  @RequirePermissions('catalogue.write')
  @Post('dietary-tags')
  async createDietaryTag(@Body() dto: CreateDietaryTagDto) {
    return this.catalogueService.createDietaryTag(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('dietary-tags/:id')
  async updateDietaryTag(
    @Param('id') id: string,
    @Body() dto: UpdateDietaryTagDto,
  ) {
    return this.catalogueService.updateDietaryTag(id, dto);
  }

  // ==========================================
  // OPTIONS
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('options')
  async findAllOptions(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.catalogueService.findAllOptions({ search, isActive });
  }

  @RequirePermissions('catalogue.read')
  @Get('options/:id')
  async findOneOption(@Param('id') id: string) {
    return this.catalogueService.findOneOption(id);
  }

  @RequirePermissions('catalogue.write')
  @Post('options')
  async createOption(@Body() dto: CreateOptionDto) {
    return this.catalogueService.createOption(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('options/:id')
  async updateOption(
    @Param('id') id: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.catalogueService.updateOption(id, dto);
  }

  // ==========================================
  // OPTION GROUPS
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('option-groups')
  async findAllOptionGroups() {
    return this.catalogueService.findAllOptionGroups();
  }

  @RequirePermissions('catalogue.read')
  @Get('option-groups/:id')
  async findOneOptionGroup(@Param('id') id: string) {
    return this.catalogueService.findOneOptionGroup(id);
  }

  @RequirePermissions('catalogue.write')
  @Post('option-groups')
  async createOptionGroup(@Body() dto: CreateOptionGroupDto) {
    return this.catalogueService.createOptionGroup(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('option-groups/:id')
  async updateOptionGroup(
    @Param('id') id: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.catalogueService.updateOptionGroup(id, dto);
  }

  // ==========================================
  // DISHES
  // ==========================================

  @RequirePermissions('catalogue.read')
  @Get('dishes')
  async findAllDishes(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('stationId') stationId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.catalogueService.findAllDishes({
      page,
      pageSize,
      search,
      stationId,
      isActive,
    });
  }

  @RequirePermissions('catalogue.read')
  @Get('dishes/:id')
  async findOneDish(@Param('id') id: string) {
    return this.catalogueService.findOneDish(id);
  }

  @RequirePermissions('catalogue.write')
  @Post('dishes')
  async createDish(@Body() dto: CreateDishDto) {
    return this.catalogueService.createDish(dto);
  }

  @RequirePermissions('catalogue.write')
  @Patch('dishes/:id')
  async updateDish(
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
  ) {
    return this.catalogueService.updateDish(id, dto);
  }
}
