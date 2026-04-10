import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertTeacherFundAccountDto {
  @IsString()
  @MaxLength(64)
  accountCode!: string;

  @IsString()
  @MaxLength(128)
  accountName!: string;

  @IsString()
  @MaxLength(64)
  categoryName!: string;

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
  ownerOrgUnitId?: string;

  @IsOptional()
  @IsString()
  managerUserId?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  totalBudget!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  statusCode?: string;
}

