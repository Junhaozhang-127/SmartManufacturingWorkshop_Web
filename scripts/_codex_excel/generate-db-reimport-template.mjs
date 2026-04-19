import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const repoRoot = path.resolve(__dirname, "..", "..");
const prismaSchemaPath = path.join(repoRoot, "prisma", "schema.prisma");
const outputPath = path.join(repoRoot, "docs", "db-reimport-template.xlsx");

const SCALAR_TYPES = new Set([
  "String",
  "Int",
  "BigInt",
  "Boolean",
  "DateTime",
  "Float",
  "Decimal",
  "Json",
  "Bytes",
]);

function excelColumnName(index0) {
  let n = index0 + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function normalizeLine(line) {
  const commentIndex = line.indexOf("//");
  const cleaned = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  return cleaned.trim();
}

function parseModels(schemaText) {
  const lines = schemaText.split(/\r?\n/);
  const modelNames = [];
  for (const line of lines) {
    const match = /^\s*model\s+(\w+)\s*\{/.exec(line);
    if (match) modelNames.push(match[1]);
  }
  const modelNameSet = new Set(modelNames);

  const models = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const startMatch = /^\s*model\s+(\w+)\s*\{/.exec(lines[i]);
    if (!startMatch) continue;
    const modelName = startMatch[1];
    const blockLines = [];
    i += 1;
    while (i < lines.length && !/^\s*\}\s*$/.test(lines[i])) {
      blockLines.push(lines[i]);
      i += 1;
    }

    let tableName = modelName;
    for (const raw of blockLines) {
      const line = normalizeLine(raw);
      const mapMatch = /@@map\("([^"]+)"\)/.exec(line);
      if (mapMatch) tableName = mapMatch[1];
    }

    const fields = [];
    for (const raw of blockLines) {
      const line = normalizeLine(raw);
      if (!line) continue;
      if (line.startsWith("@@")) continue;
      if (line.startsWith("}")) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const [fieldName, typeToken] = parts;

      if (!/^[A-Za-z_]\w*$/.test(fieldName)) continue;
      if (typeToken.endsWith("[]")) continue;
      if (line.includes("@ignore")) continue;
      if (line.includes("@relation")) continue;

      const isOptional = typeToken.endsWith("?");
      const baseType = typeToken.replace(/\?$/, "");

      const isScalar = SCALAR_TYPES.has(baseType) || !modelNameSet.has(baseType);
      if (!isScalar) continue;

      const mapMatch = /@map\("([^"]+)"\)/.exec(line);
      const dbColumn = mapMatch ? mapMatch[1] : fieldName;

      const dbTypeMatch = /@db\.([A-Za-z0-9_]+(?:\([^)]+\))?)/.exec(line);
      const dbType = dbTypeMatch ? dbTypeMatch[1] : baseType;

      const isId = /\s@id\b/.test(line);
      const isUpdatedAt = /\s@updatedAt\b/.test(line);
      const defaultMatch = /@default\(([^)]+)\)/.exec(line);
      const defaultValue = defaultMatch ? defaultMatch[1] : "";

      const notes = [];
      if (isId) notes.push("主键");
      if (defaultValue) notes.push(`默认: ${defaultValue}`);
      if (isUpdatedAt) notes.push("自动更新时间");
      if (/\s@unique\b/.test(line)) notes.push("唯一");

      fields.push({
        fieldName,
        dbColumn,
        prismaType: baseType,
        dbType,
        required: isOptional ? "N" : "Y",
        notes: notes.join("；"),
      });
    }

    models.set(modelName, { modelName, tableName, fields });
  }

  return { modelNames, models };
}

function addTitleBand(sheet, title, endColLetter = "H") {
  const titleRange = sheet.getRange(`A1:${endColLetter}1`);
  titleRange.merge();
  titleRange.values = [[title]];
  titleRange.format.fill = { type: "solid", color: "#1F4E79" };
  titleRange.format.font = { color: "#FFFFFF", bold: true, size: 14 };
  titleRange.format.horizontalAlignment = "center";
  titleRange.format.rowHeight = 24;
}

function styleHeader(sheet, rangeA1) {
  const header = sheet.getRange(rangeA1);
  header.format.fill = { type: "solid", color: "#DBEAFE" };
  header.format.font = { bold: true, color: "#1E3A8A" };
  header.format.borders = { preset: "outside", style: "thin", color: "#94A3B8" };
  header.format.horizontalAlignment = "center";
  header.format.wrapText = true;
  header.format.rowHeight = 20;
}

function styleMetaRow(sheet, rangeA1) {
  const meta = sheet.getRange(rangeA1);
  meta.format.fill = { type: "solid", color: "#F1F5F9" };
  meta.format.font = { color: "#334155" };
  meta.format.wrapText = true;
  meta.format.rowHeight = 34;
  meta.format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
}

async function main() {
  const schemaText = await fs.readFile(prismaSchemaPath, "utf8");
  const { modelNames, models } = parseModels(schemaText);

  const workbook = Workbook.create();

  // README
  const readme = workbook.worksheets.add("README");
  addTitleBand(readme, "数据库数据重新导入 - Excel 模板", "I");
  readme.getRange("A2:I2").values = [
    [
      "用法：按需打开对应 Sheet（每个 Sheet 对应一个表），从第 6 行开始逐行填写要导入的数据；第 1-5 行为说明与字段信息，请勿删除。",
    ],
  ];
  readme.getRange("A2:I2").merge();
  readme.getRange("A2:I2").format.wrapText = true;
  readme.getRange("A2:I2").format.rowHeight = 40;
  readme.getRange("A2:I2").format.fill = { type: "solid", color: "#F8FAFC" };
  readme.getRange("A2:I2").format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };

  const seedOrder = [
    "SysUser",
    "SysRole",
    "OrgUnit",
    "SysUserRole",
    "MemberProfile",
    "SysDictType",
    "SysDictItem",
    "SysConfigItem",
    "WfApprovalTemplate",
    "WfApprovalTemplateNode",
    "CompCompetition",
    "CompTeam",
    "AchvAchievement",
    "AchvContributor",
    "AchvPaper",
    "IpAsset",
    "EvalScheme",
    "GovRewardPenalty",
    "AssetDevice",
    "AssetDeviceRepair",
    "FundAccount",
    "FundApplication",
    "InvConsumable",
    "InvInventoryTxn",
    "InvConsumableRequest",
    "MemberGrowthRecord",
    "MemberStageEvaluation",
    "MemberRegularization",
    "MemberOperationLog",
    "PromApplication",
    "PromAppointment",
    "SysNotification",
  ];

  const orderRows = [
    ["建议导入顺序（存在外键/依赖时更安全）："],
    ...seedOrder.map((name, idx) => [`${idx + 1}. ${name}`]),
  ];
  readme.getRange(`A4:C${3 + orderRows.length}`).values = orderRows.map((r) => [r[0], null, null]);
  readme.getRange("A4:C4").merge();
  readme.getRange("A4:C4").format.font = { bold: true };
  readme.getRange(`A4:C${3 + orderRows.length}`).format.wrapText = true;
  readme.getRange(`A4:C${3 + orderRows.length}`).format.borders = {
    preset: "outside",
    style: "thin",
    color: "#CBD5E1",
  };
  readme.getRange("A4:C4").format.fill = { type: "solid", color: "#E2E8F0" };

  readme.getRange("E4:I10").values = [
    ["字段说明：", "", "", "", ""],
    ["第 4 行", "DB 列名（导入时使用）", "", "", ""],
    ["第 5 行", "字段信息（Prisma 字段名 / 类型 / 是否必填 / 备注）", "", "", ""],
    ["第 6 行开始", "数据区（每行一条记录）", "", "", ""],
    ["提示", "自增主键（id）一般可留空；外键字段需对应已存在的记录。", "", "", ""],
    ["提示", "日期建议用 yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss。", "", "", ""],
    ["提示", "JSON 字段可直接填 JSON 字符串。", "", "", ""],
  ];
  readme.getRange("E4:I4").merge();
  readme.getRange("E4:I4").format.fill = { type: "solid", color: "#E2E8F0" };
  readme.getRange("E4:I4").format.font = { bold: true };
  readme.getRange("E4:I10").format.wrapText = true;
  readme.getRange("E4:I10").format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
  readme.getRange("A1:I20").format.autofitColumns();

  // Data sheets
  for (const modelName of modelNames) {
    const model = models.get(modelName);
    if (!model) continue;
    const { tableName, fields } = model;

    const sheetName = modelName.length > 31 ? modelName.slice(0, 31) : modelName;
    const sheet = workbook.worksheets.add(sheetName);

    const endColLetter = fields.length > 0 ? excelColumnName(fields.length - 1) : "H";
    addTitleBand(sheet, `${modelName}（表：${tableName}）`, endColLetter);

    sheet.getRange(`A2:${endColLetter}2`).values = [
      ["从第 6 行开始填写数据；第 4-5 行是字段说明，请勿删除。"],
    ];
    sheet.getRange(`A2:${endColLetter}2`).merge();
    sheet.getRange(`A2:${endColLetter}2`).format.fill = { type: "solid", color: "#F8FAFC" };
    sheet.getRange(`A2:${endColLetter}2`).format.borders = {
      preset: "outside",
      style: "thin",
      color: "#CBD5E1",
    };
    sheet.getRange(`A2:${endColLetter}2`).format.wrapText = true;
    sheet.getRange(`A2:${endColLetter}2`).format.rowHeight = 28;

    if (fields.length === 0) {
      sheet.getRange("A4:D6").values = [["未解析到可导入字段（可能是纯关系模型）。", "", "", ""]];
      continue;
    }

    // Row 4: DB columns
    const headerRow = fields.map((f) => f.dbColumn);
    sheet.getRange(`A4:${endColLetter}4`).values = [headerRow];
    styleHeader(sheet, `A4:${endColLetter}4`);

    // Row 5: meta (field/type/required/notes)
    const metaRow = fields.map((f) => {
      const required = f.required === "Y" ? "必填" : "可空";
      const notes = f.notes ? `；${f.notes}` : "";
      return `${f.fieldName} / ${f.prismaType}（${f.dbType}）/ ${required}${notes}`;
    });
    sheet.getRange(`A5:${endColLetter}5`).values = [metaRow];
    styleMetaRow(sheet, `A5:${endColLetter}5`);

    // Column widths
    for (let col = 0; col < fields.length; col += 1) {
      const colLetter = excelColumnName(col);
      const width = Math.min(36, Math.max(14, Math.round((metaRow[col].length / 6) * 10) / 10));
      sheet.getRange(`${colLetter}:${colLetter}`).format.columnWidth = width;
    }

    sheet.freezePanes.freezeRows(5);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  // Compact verification
  await workbook.inspect({ sheetName: "README", range: "A1:I12" });

  process.stdout.write(`Wrote: ${outputPath}\n`);
}

await main();
