import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateDishPriceDto {
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @IsInt()
  @Min(0)
  priceInPaise!: number;
}

export class UpdateDishPriceDto {
  @IsInt()
  @Min(0)
  priceInPaise!: number;
}
