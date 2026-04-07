export class UpsertApprovalTemplateNodeDto {
  nodeKey!: string;
  nodeName!: string;
  sortNo!: number;
  approverRoleCode!: string;
}

export class UpsertApprovalTemplateDto {
  templateCode!: string;
  templateName!: string;
  statusCode!: string;
  nodes!: UpsertApprovalTemplateNodeDto[];
}
