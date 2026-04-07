export class UpsertConfigItemDto {
  configCategory!: string;
  configKey!: string;
  configName!: string;
  configValue!: string;
  valueType!: string;
  statusCode!: string;
  remark?: string;
  editable!: boolean;
}
