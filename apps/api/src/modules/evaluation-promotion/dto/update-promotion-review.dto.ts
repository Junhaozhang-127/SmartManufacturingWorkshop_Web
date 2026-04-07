import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePromotionReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teamEvaluation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  departmentReview?: string;
}
