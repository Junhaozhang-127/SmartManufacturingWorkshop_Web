import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovalTransferDto {
  @IsString()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
