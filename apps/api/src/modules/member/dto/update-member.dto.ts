import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  positionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillTags?: string[];
}
