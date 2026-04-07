import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConsumableRequestDto {
  @IsString()
  consumableId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @IsString()
  @MaxLength(500)
  purpose!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  projectName?: string;
}
