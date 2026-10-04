import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  billingContact?: string;

  @IsString()
  @IsOptional()
  priceTierId?: string;

  @IsString()
  @IsOptional()
  ownerEmployeeId?: string;

  @IsString()
  @IsOptional()
  defaultDeliveryTime?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  minutesBeforeDelivery?: number;

  @IsString()
  @IsOptional()
  defaultPackaging?: string;

  @IsString()
  @IsOptional()
  driverInstructions?: string;

  @IsString()
  @IsOptional()
  defaultDriverId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
