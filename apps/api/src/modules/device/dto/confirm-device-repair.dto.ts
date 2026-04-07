import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmDeviceRepairDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
