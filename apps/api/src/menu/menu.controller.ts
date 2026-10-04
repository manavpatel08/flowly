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
import { MenuService } from './menu.service';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
} from './dto/menu-category.dto';
import {
  AddCategoryDishDto,
  UpdateCategoryDishDto,
} from './dto/category-dish.dto';
import { ToggleVisibilityDto } from './dto/company-visibility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ==========================================
  // 1. BASE MENU
  // ==========================================

  @RequirePermissions('menu.read')
  @Get('menus')
  async findAllMenus(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.menuService.findAllMenus({ page, pageSize, search });
  }

  @RequirePermissions('menu.read')
  @Get('menus/:id')
  async findOneMenu(@Param('id') id: string) {
    return this.menuService.findOneMenu(id);
  }

  @RequirePermissions('menu.write')
  @Post('menus')
  async createMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.createMenu(dto);
  }

  @RequirePermissions('menu.write')
  @Patch('menus/:id')
  async updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.updateMenu(id, dto);
  }

  // ==========================================
  // 2. MENU CATEGORIES
  // ==========================================

  @RequirePermissions('menu.read')
  @Get('menus/:menuId/categories')
  async findCategories(@Param('menuId') menuId: string) {
    return this.menuService.findCategories(menuId);
  }

  @RequirePermissions('menu.write')
  @Post('menus/:menuId/categories')
  async createCategory(
    @Param('menuId') menuId: string,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.menuService.createCategory(menuId, dto);
  }

  @RequirePermissions('menu.write')
  @Patch('menus/:menuId/categories/:categoryId')
  async updateCategory(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.menuService.updateCategory(menuId, categoryId, dto);
  }

  // ==========================================
  // 3. CATEGORY DISHES
  // ==========================================

  @RequirePermissions('menu.read')
  @Get('menus/:menuId/categories/:categoryId/dishes')
  async findCategoryDishes(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.menuService.findCategoryDishes(menuId, categoryId);
  }

  @RequirePermissions('menu.write')
  @Post('menus/:menuId/categories/:categoryId/dishes')
  async addCategoryDish(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: AddCategoryDishDto,
  ) {
    return this.menuService.addCategoryDish(menuId, categoryId, dto);
  }

  @RequirePermissions('menu.write')
  @Patch('menus/:menuId/categories/:categoryId/dishes/:dishId')
  async updateCategoryDish(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Param('dishId') dishId: string,
    @Body() dto: UpdateCategoryDishDto,
  ) {
    return this.menuService.updateCategoryDish(
      menuId,
      categoryId,
      dishId,
      dto,
    );
  }

  // ==========================================
  // 4. COMPANY-SPECIFIC MENU VISIBILITY & RESOLUTION
  // ==========================================

  @RequirePermissions('menu.read')
  @Get('companies/:companyId/menu')
  async resolveCompanyMenu(@Param('companyId') companyId: string) {
    return this.menuService.resolveCompanyMenu(companyId);
  }

  @RequirePermissions('menu.read')
  @Get('companies/:companyId/menu/categories')
  async findCompanyCategoriesVisibility(
    @Param('companyId') companyId: string,
  ) {
    return this.menuService.findCompanyCategoriesVisibility(companyId);
  }

  @RequirePermissions('menu.write')
  @Post('companies/:companyId/menu/categories/:categoryId')
  async setCompanyCategoryVisibilityPost(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.menuService.setCompanyCategoryVisibility(
      companyId,
      categoryId,
      dto,
    );
  }

  @RequirePermissions('menu.write')
  @Patch('companies/:companyId/menu/categories/:categoryId')
  async setCompanyCategoryVisibilityPatch(
    @Param('companyId') companyId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.menuService.setCompanyCategoryVisibility(
      companyId,
      categoryId,
      dto,
    );
  }

  @RequirePermissions('menu.read')
  @Get('companies/:companyId/menu/dishes')
  async findCompanyDishesVisibility(@Param('companyId') companyId: string) {
    return this.menuService.findCompanyDishesVisibility(companyId);
  }

  @RequirePermissions('menu.write')
  @Post('companies/:companyId/menu/dishes/:dishId')
  async setCompanyDishVisibilityPost(
    @Param('companyId') companyId: string,
    @Param('dishId') dishId: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.menuService.setCompanyDishVisibility(companyId, dishId, dto);
  }

  @RequirePermissions('menu.write')
  @Patch('companies/:companyId/menu/dishes/:dishId')
  async setCompanyDishVisibilityPatch(
    @Param('companyId') companyId: string,
    @Param('dishId') dishId: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.menuService.setCompanyDishVisibility(companyId, dishId, dto);
  }

  // ==========================================
  // 5. EMPLOYEE MENU RESOLUTION
  // ==========================================

  @RequirePermissions('menu.read')
  @Get('employees/:employeeId/menu')
  async resolveEmployeeMenu(@Param('employeeId') employeeId: string) {
    return this.menuService.resolveEmployeeMenu(employeeId);
  }
}
