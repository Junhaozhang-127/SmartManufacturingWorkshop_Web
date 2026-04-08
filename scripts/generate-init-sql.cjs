const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { Prisma } = require('@prisma/client');

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'prisma', 'sql');
const outputFile = path.join(outputDir, 'web12345_init.sql');
const targetDb = 'web12345';

const models = Prisma.dmmf.datamodel.models;
const modelByName = new Map(models.map((model) => [model.name, model]));

const tableOrder = [
  'SysUser',
  'SysRole',
  'OrgUnit',
  'SysUserRole',
  'MemberProfile',
  'SysDictType',
  'SysDictItem',
  'SysConfigItem',
  'WfApprovalTemplate',
  'WfApprovalTemplateNode',
  'CompCompetition',
  'CompTeam',
  'AchvAchievement',
  'AchvContributor',
  'AchvPaper',
  'IpAsset',
  'EvalScheme',
  'GovRewardPenalty',
  'AssetDevice',
  'AssetDeviceRepair',
  'FundAccount',
  'FundApplication',
  'InvConsumable',
  'InvInventoryTxn',
  'InvConsumableRequest',
  'MemberGrowthRecord',
  'MemberStageEvaluation',
  'MemberRegularization',
  'MemberOperationLog',
  'PromApplication',
  'PromAppointment',
  'SysNotification',
];

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function deepClone(value) {
  if (typeof value === 'bigint') {
    return BigInt(value.toString());
  }

  if (value instanceof Date) {
    return new Date(value.toISOString());
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepClone(entry));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepClone(entry)]),
    );
  }

  return value;
}

function valuesEqual(left, right) {
  if (typeof left === 'bigint' || typeof right === 'bigint') {
    return left != null && right != null && BigInt(left) === BigInt(right);
  }

  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
  }

  return left === right;
}

function matchesWhere(record, where) {
  return Object.entries(where).every(([key, value]) => {
    if (isPlainObject(value) && Array.isArray(value.in)) {
      return value.in.some((item) => valuesEqual(record[key], item));
    }

    if (isPlainObject(value)) {
      return matchesWhere(record[key] ?? {}, value);
    }

    return valuesEqual(record[key], value);
  });
}

function applyData(record, data) {
  for (const [key, value] of Object.entries(data)) {
    record[key] = deepClone(value);
  }
}

function normalizeForStorage(model, input) {
  const row = {};

  for (const field of model.fields) {
    if (field.kind === 'object') {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(input, field.name)) {
      row[field.name] = deepClone(input[field.name]);
    }
  }

  return row;
}

class FakeModelDelegate {
  constructor(model, database) {
    this.model = model;
    this.database = database;
    this.rows = [];
    this.autoId = 1n;
  }

  nextId() {
    const value = this.autoId;
    this.autoId += 1n;
    return value;
  }

  buildCreateRecord(data) {
    const record = normalizeForStorage(this.model, data);
    const idField = this.model.fields.find((field) => field.isId);

    if (idField && record[idField.name] == null) {
      record[idField.name] = this.nextId();
    }

    for (const field of this.model.fields) {
      if (field.kind === 'object') {
        continue;
      }

      if (record[field.name] == null && field.hasDefaultValue) {
        if (field.default?.name === 'now') {
          record[field.name] = new Date();
        } else if (field.default?.name === 'autoincrement') {
          record[field.name] = this.nextId();
        } else if (Object.prototype.hasOwnProperty.call(field.default ?? {}, 'value')) {
          record[field.name] = deepClone(field.default.value);
        }
      }

      if (record[field.name] == null && field.isUpdatedAt) {
        record[field.name] = record.createdAt instanceof Date ? new Date(record.createdAt.toISOString()) : new Date();
      }
    }

    return record;
  }

  findOne(where) {
    return this.rows.find((row) => matchesWhere(row, where));
  }

  async upsert({ where, create, update }) {
    const existing = this.findOne(where);

    if (existing) {
      applyData(existing, normalizeForStorage(this.model, update));
      const updatedAtField = this.model.fields.find((field) => field.isUpdatedAt);
      if (updatedAtField) {
        existing[updatedAtField.name] = new Date();
      }
      return deepClone(existing);
    }

    const created = this.buildCreateRecord(create);
    this.rows.push(created);
    return deepClone(created);
  }

  async create({ data }) {
    const created = this.buildCreateRecord(data);
    this.rows.push(created);
    return deepClone(created);
  }

  async createMany({ data }) {
    for (const entry of data) {
      const created = this.buildCreateRecord(entry);
      this.rows.push(created);
    }

    return { count: data.length };
  }

  async update({ where, data }) {
    const existing = this.findOne(where);

    if (!existing) {
      throw new Error(`Update failed for ${this.model.name}: record not found`);
    }

    applyData(existing, normalizeForStorage(this.model, data));
    const updatedAtField = this.model.fields.find((field) => field.isUpdatedAt);
    if (updatedAtField) {
      existing[updatedAtField.name] = new Date();
    }
    return deepClone(existing);
  }

  async deleteMany({ where }) {
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => !matchesWhere(row, where ?? {}));
    return { count: before - this.rows.length };
  }

  async findMany(args = {}) {
    let rows = this.rows.filter((row) => matchesWhere(row, args.where ?? {})).map((row) => deepClone(row));

    if (args.orderBy) {
      const orderings = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      rows.sort((left, right) => {
        for (const ordering of orderings) {
          const [field, direction] = Object.entries(ordering)[0];
          const leftValue = left[field];
          const rightValue = right[field];

          if (leftValue === rightValue) {
            continue;
          }

          const result = leftValue > rightValue ? 1 : -1;
          return direction === 'desc' ? -result : result;
        }

        return 0;
      });
    }

    return rows;
  }

  async findFirst(args = {}) {
    const rows = await this.findMany(args);
    return rows[0] ?? null;
  }

  async findUniqueOrThrow({ where }) {
    const existing = this.findOne(where);

    if (!existing) {
      throw new Error(`findUniqueOrThrow failed for ${this.model.name}`);
    }

    return deepClone(existing);
  }

  allRows() {
    return this.rows.map((row) => deepClone(row));
  }
}

class FakePrismaClient {
  constructor() {
    this._delegates = new Map();
    globalThis.__lastFakePrisma = this;

    for (const model of models) {
      const delegate = new FakeModelDelegate(model, this);
      this._delegates.set(model.name, delegate);
      this[model.name.charAt(0).toLowerCase() + model.name.slice(1)] = delegate;
    }
  }

  async $disconnect() {}
}

function sqlQuoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function sqlQuoteString(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}'`;
}

function toSqlLiteral(value) {
  if (value == null) {
    return 'NULL';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return sqlQuoteString(value.toISOString().slice(0, 23).replace('T', ' '));
  }

  if (Array.isArray(value) || isPlainObject(value)) {
    return sqlQuoteString(JSON.stringify(value));
  }

  return sqlQuoteString(value);
}

function buildInsertSql(modelName, rows) {
  if (!rows.length) {
    return '';
  }

  const model = modelByName.get(modelName);
  const scalarFields = model.fields.filter((field) => field.kind !== 'object');
  const columns = scalarFields
    .filter((field) => {
      const dbName = field.dbName ?? field.name;
      return field.name === 'updatedAt' || dbName === 'updated_at' || rows.some((row) => row[field.name] !== undefined);
    })
    .map((field) => ({
      fieldName: field.name,
      columnName: field.dbName ?? field.name,
    }));

  const lines = [
    `-- Data: ${model.dbName ?? model.name}`,
    `INSERT INTO ${sqlQuoteIdentifier(model.dbName ?? model.name)} (${columns
      .map((column) => sqlQuoteIdentifier(column.columnName))
      .join(', ')}) VALUES`,
  ];

  rows.forEach((row, index) => {
    const values = columns.map((column) => {
      let value = row[column.fieldName];

      if (value === undefined && column.columnName === 'updated_at') {
        value = row.createdAt ?? new Date();
      }

      return toSqlLiteral(value);
    });
    lines.push(`  (${values.join(', ')})${index === rows.length - 1 ? ';' : ','}`);
  });
  lines.push('');

  return lines.join('\n');
}

async function runSeedInMemory() {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request) {
    if (request === '@prisma/client') {
      return { PrismaClient: FakePrismaClient, Prisma };
    }

    return originalLoad.apply(this, arguments);
  };

  try {
    require(path.join(rootDir, 'prisma', 'seed.ts'));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    Module._load = originalLoad;
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  await runSeedInMemory();

  const fakeClient = globalThis.__lastFakePrisma;
  if (!fakeClient) {
    throw new Error('Seed script did not expose prisma client');
  }

  const statements = [
    '-- SmartManufacturingWorkshop full init SQL',
    `CREATE DATABASE IF NOT EXISTS ${sqlQuoteIdentifier(targetDb)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE ${sqlQuoteIdentifier(targetDb)};`,
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  const migrations = fs.readdirSync(path.join(rootDir, 'prisma', 'migrations')).sort();
  for (const migration of migrations) {
    const sql = fs.readFileSync(path.join(rootDir, 'prisma', 'migrations', migration, 'migration.sql'), 'utf8');
    statements.push(`-- Migration: ${migration}`);
    statements.push(sql.trim());
    statements.push('');
  }

  statements.push('-- Seed data');
  for (const modelName of tableOrder) {
    const delegate = fakeClient[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
    if (!delegate) {
      continue;
    }

    const sql = buildInsertSql(modelName, delegate.allRows());
    if (sql) {
      statements.push(sql);
    }
  }

  statements.push('SET FOREIGN_KEY_CHECKS = 1;');
  statements.push('');

  fs.writeFileSync(outputFile, statements.join('\n'), 'utf8');
  console.log(outputFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
