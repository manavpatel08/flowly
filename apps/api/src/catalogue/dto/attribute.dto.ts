import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePortionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePortionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateAllergenDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateAllergenDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateDietaryTagDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateDietaryTagDto {
  @IsString()
  @IsOptional()
  name?: string;
}
