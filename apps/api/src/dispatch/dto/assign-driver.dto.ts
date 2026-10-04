import { IsOptional, IsString } from 'class-validator';

export class AssignDriverDto {
  @IsString()
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsOptional()
  driverUserId?: string;
}
