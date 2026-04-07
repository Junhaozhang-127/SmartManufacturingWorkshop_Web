import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishPromotionResultDto {
  @IsDateString()
  publicNoticeStartDate!: string;

  @IsDateString()
  publicNoticeEndDate!: string;

  @IsBoolean()
  appointmentPassed!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicNoticeResult?: string;
}
