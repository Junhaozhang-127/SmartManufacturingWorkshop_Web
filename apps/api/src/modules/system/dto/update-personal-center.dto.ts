import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePersonalCenterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  studentNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  avatarStorageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  avatarFileName?: string;
}
