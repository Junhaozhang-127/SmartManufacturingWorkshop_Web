import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertDictionaryDto {
  @IsString()
  @IsNotEmpty()
  dictCode!: string;

  @IsString()
  @IsNotEmpty()
  dictName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  statusCode!: string;
}
