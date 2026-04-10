import { IsOptional, IsString } from 'class-validator';

export class UpdateOrgLeaderDto {
  @IsOptional()
  @IsString()
  leaderUserId?: string;
}

