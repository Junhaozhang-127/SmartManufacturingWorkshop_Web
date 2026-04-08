import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertConfigItemDto {
  @IsString()
  @IsNotEmpty()
  configCategory!: string;

  @IsString()
  @IsNotEmpty()
  configKey!: string;

  @IsString()
  @IsNotEmpty()
  configName!: string;

  @IsString()
  @IsNotEmpty()
  configValue!: string;

  @IsString()
  @IsNotEmpty()
  valueType!: string;

  @IsString()
  @IsNotEmpty()
  statusCode!: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsBoolean()
  editable!: boolean;
}
