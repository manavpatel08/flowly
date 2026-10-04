import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateOptionPriceDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @IsInt()
  @Min(0)
  priceInPaise!: number;
}

export class UpdateOptionPriceDto {
  @IsInt()
  @Min(0)
  priceInPaise!: number;
}
