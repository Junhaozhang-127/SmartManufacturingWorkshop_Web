import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConsumableDto {
  @IsString()
  @MaxLength(128)
  consumableName!: string;

  @IsString()
  @MaxLength(64)
  categoryName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specification?: string;

  @IsString()
  @MaxLength(32)
  unitName!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  warningThreshold!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  defaultLocation?: string;
}
