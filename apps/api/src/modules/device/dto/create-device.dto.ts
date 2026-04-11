import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const DEVICE_STATUS_CODES = ['IDLE', 'IN_USE', 'REPAIRING', 'SCRAP_PENDING', 'SCRAPPED'] as const;

export class CreateDeviceDto {
  @IsString()
  @MaxLength(64)
  deviceCode!: string;

  @IsString()
  @MaxLength(128)
  deviceName!: string;

  @IsString()
  @MaxLength(64)
  categoryName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  locationLabel?: string;

  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  @IsIn(DEVICE_STATUS_CODES)
  statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseAmount?: number;

  @IsOptional()
  @IsString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  warrantyUntil?: string;
}

