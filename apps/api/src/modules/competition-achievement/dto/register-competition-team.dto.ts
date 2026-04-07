import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

class TeamMemberDto {
  @IsString()
  userId!: string;
}

export class RegisterCompetitionTeamDto {
  @IsString()
  teamName!: string;

  @IsString()
  teamLeaderUserId!: string;

  @IsOptional()
  @IsString()
  advisorUserId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members!: TeamMemberDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  projectName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  applicationReason?: string;
}
