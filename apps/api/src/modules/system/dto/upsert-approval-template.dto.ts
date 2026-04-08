import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class UpsertApprovalTemplateNodeDto {
  @IsString()
  @IsNotEmpty()
  nodeKey!: string;

  @IsString()
  @IsNotEmpty()
  nodeName!: string;

  @IsInt()
  sortNo!: number;

  @IsString()
  @IsNotEmpty()
  approverRoleCode!: string;
}

export class UpsertApprovalTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateCode!: string;

  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @IsString()
  @IsNotEmpty()
  statusCode!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => UpsertApprovalTemplateNodeDto)
  nodes!: UpsertApprovalTemplateNodeDto[];
}
