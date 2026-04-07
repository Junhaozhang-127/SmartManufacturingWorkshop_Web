import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRegularizationDto {
  @IsString()
  memberProfileId!: string;

  @IsDateString()
  internshipStartDate!: string;

  @IsDateString()
  plannedRegularDate!: string;

  @IsString()
  @MaxLength(1000)
  applicationReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  selfAssessment?: string;
}
