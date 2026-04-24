import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateLaborApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  laborType?: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsArray()
  attachmentFileIds?: string[];
}

