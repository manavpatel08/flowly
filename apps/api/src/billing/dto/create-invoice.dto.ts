import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderIds: string[];
}
