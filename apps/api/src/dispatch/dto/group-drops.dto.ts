import { IsArray, IsOptional, IsString } from 'class-validator';

export class GroupDropsDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderIds?: string[];
}
