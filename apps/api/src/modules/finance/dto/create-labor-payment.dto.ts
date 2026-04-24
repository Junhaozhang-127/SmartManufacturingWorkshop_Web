import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLaborPaymentDto {
  @IsString()
  @MaxLength(32)
  laborType!: string;

  @IsString()
  targetUserId!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsArray()
  attachmentFileIds?: string[];
}

