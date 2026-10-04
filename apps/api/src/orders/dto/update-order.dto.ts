import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  packaging?: string;

  @IsOptional()
  @IsString()
  driverInstructions?: string;

  @IsOptional()
  @IsString()
  companyAddressId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
