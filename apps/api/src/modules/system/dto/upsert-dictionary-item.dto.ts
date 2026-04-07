export class UpsertDictionaryItemDto {
  itemCode!: string;
  itemLabel!: string;
  itemValue!: string;
  sortNo!: number;
  statusCode!: string;
  extData?: Record<string, unknown>;
}
