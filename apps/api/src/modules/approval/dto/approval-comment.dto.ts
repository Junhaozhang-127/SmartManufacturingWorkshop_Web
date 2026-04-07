import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovalCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
