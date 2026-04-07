import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignDeviceRepairDto {
  @IsString()
  handlerUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
