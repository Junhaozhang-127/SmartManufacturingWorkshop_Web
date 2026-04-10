import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrgUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unitCode?: string;

  @IsString()
  @MaxLength(128)
  unitName!: string;

  @IsOptional()
  @IsString()
  leaderUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberProfileIds?: string[];
}

