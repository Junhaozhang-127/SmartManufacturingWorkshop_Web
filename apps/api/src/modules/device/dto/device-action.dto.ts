import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeviceActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

