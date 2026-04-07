import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateStageEvaluationDto {
  @IsString()
  @MaxLength(32)
  stageCode!: string;

  @IsString()
  @MaxLength(500)
  summary!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsString()
  @MaxLength(32)
  resultCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAction?: string;
}
