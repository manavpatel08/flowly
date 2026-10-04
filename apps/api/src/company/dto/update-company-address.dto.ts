import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCompanyAddressDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
