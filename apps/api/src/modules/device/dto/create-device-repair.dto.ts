import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class AttachmentDto {
  @IsString()
  @MaxLength(255)
  url!: string;
}

export class CreateDeviceRepairDto {
  @IsString()
  deviceId!: string;

  @IsString()
  @MaxLength(2000)
  faultDescription!: string;

  @IsString()
  severity!: string;

  @IsOptional()
  @IsString()
  handlerUserId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  requestedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costEstimate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fundLinkCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsArray()
  attachmentFileIds?: string[];
}
