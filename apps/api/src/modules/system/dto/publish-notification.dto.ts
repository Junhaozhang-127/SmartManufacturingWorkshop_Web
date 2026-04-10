import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishNotificationDto {
  @IsString()
  @MaxLength(128)
  title!: string;

  @IsString()
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsString()
  @IsIn(['GENERAL', 'SYSTEM', 'APPROVAL', 'ORG', 'FUND', 'DEVICE', 'CONTENT'])
  categoryCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['INFO', 'WARN', 'ERROR'])
  levelCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['GLOBAL', 'DEPARTMENT'])
  scope?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  routePath?: string;
}

