import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertDictionaryItemDto {
  @IsString()
  @IsNotEmpty()
  itemCode!: string;

  @IsString()
  @IsNotEmpty()
  itemLabel!: string;

  @IsString()
  @IsNotEmpty()
  itemValue!: string;

  @IsInt()
  sortNo!: number;

  @IsString()
  @IsNotEmpty()
  statusCode!: string;

  @IsOptional()
  @IsObject()
  extData?: Record<string, unknown>;
}
