import { IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpsertPortalContactConfigDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(128)
  contactEmail?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  contactAddress?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(128)
  publicAccountQrStorageKey?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(128)
  publicAccountQrFileName?: string | null;
}

