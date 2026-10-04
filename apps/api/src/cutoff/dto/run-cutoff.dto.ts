import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RunCutoffDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
