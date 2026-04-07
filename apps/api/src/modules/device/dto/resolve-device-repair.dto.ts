import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ResolveDeviceRepairDto {
  @IsString()
  @MaxLength(1000)
  resolutionSummary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  handlerComment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualCost?: number;
}
