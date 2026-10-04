import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddCategoryDishDto {
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCategoryDishDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
