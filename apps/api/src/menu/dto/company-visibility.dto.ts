import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleVisibilityDto {
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}
