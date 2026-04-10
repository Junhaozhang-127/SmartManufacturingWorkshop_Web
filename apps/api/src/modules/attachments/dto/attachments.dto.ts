import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class AttachmentListQueryDto {
  @IsString()
  @MaxLength(64)
  businessType!: string;

  @IsString()
  @MaxLength(64)
  businessId!: string;

  @IsString()
  @MaxLength(64)
  usageType!: string;
}

export class BindAttachmentsDto {
  @IsString()
  @MaxLength(64)
  businessType!: string;

  @IsString()
  @MaxLength(64)
  businessId!: string;

  @IsString()
  @MaxLength(64)
  usageType!: string;

  @IsArray()
  fileIds!: string[];
}

export class UnbindAttachmentDto {
  @IsString()
  @MaxLength(64)
  businessType!: string;

  @IsString()
  @MaxLength(64)
  businessId!: string;

  @IsString()
  @MaxLength(64)
  usageType!: string;

  @IsString()
  fileId!: string;
}

export class TempAttachmentListQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}

