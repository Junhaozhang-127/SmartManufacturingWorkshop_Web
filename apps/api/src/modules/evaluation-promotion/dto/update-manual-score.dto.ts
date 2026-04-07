import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateManualScoreDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-30)
  @Max(30)
  manualScore!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  manualComment?: string;
}
