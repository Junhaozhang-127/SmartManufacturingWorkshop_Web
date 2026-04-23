import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertCompetitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  competitionLevel!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  involvedField!: string;

  @IsOptional()
  @IsDateString()
  registrationStartDate?: string;

  @IsOptional()
  @IsDateString()
  registrationEndDate?: string;

  @IsOptional()
  @IsDateString()
  eventStartDate?: string;

  @IsOptional()
  @IsDateString()
  eventEndDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
