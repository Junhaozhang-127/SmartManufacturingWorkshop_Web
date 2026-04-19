const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnvFile(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail =
      typeof body === 'string'
        ? body
        : JSON.stringify(body, (_, value) => (typeof value === 'bigint' ? value.toString() : value));
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${detail}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  loadEnvFile(path.join(rootDir, '.env'));

  const apiBaseUrl = process.env.SMOKE_API_BASE_URL ?? `http://127.0.0.1:${process.env.APP_PORT ?? '3000'}/api`;
  const prisma = new PrismaClient();
  const suffix = Date.now();
  const configKey = `CODEX_SMOKE_${suffix}`;
  const configName = `Codex Smoke ${suffix}`;
  const configValue1 = `value-${suffix}`;
  const configValue2 = `value-updated-${suffix}`;

  try {
    console.log(`[1/7] Health check: ${apiBaseUrl}/health`);
    const health = await requestJson(`${apiBaseUrl}/health`);
    assert(health?.code === 0, 'Health response code is not success');
    assert(health?.data?.dependencies?.database?.status === 'up', 'Database dependency is not up');
    console.log(`  database=${health.data.dependencies.database.status}`);

    const smokeUsername = process.env.SMOKE_LOGIN_USERNAME;
    const smokePassword = process.env.SMOKE_LOGIN_PASSWORD;
    assert(smokeUsername && smokeUsername.trim(), 'SMOKE_LOGIN_USERNAME is required for smoke login');
    assert(smokePassword && smokePassword.trim(), 'SMOKE_LOGIN_PASSWORD is required for smoke login');

    console.log('[2/7] Login with provided smoke credentials');
    const login = await requestJson(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: smokeUsername.trim(), password: smokePassword }),
    });
    const token = login?.data?.token;
    assert(token, 'Login did not return token');
    console.log('  login=ok');

    const authHeaders = {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    };

    console.log('[3/7] Read system configuration');
    const beforeConfig = await requestJson(`${apiBaseUrl}/system/configuration`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert(beforeConfig?.code === 0, 'System configuration query failed');
    const beforeExists = beforeConfig.data.configs.some((item) => item.configKey === configKey);
    assert(!beforeExists, `Smoke config key ${configKey} already exists`);
    console.log(`  existing_test_config=${beforeExists}`);

    console.log('[4/7] Create config item');
    const created = await requestJson(`${apiBaseUrl}/system/configuration/config-items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        configCategory: 'SMOKE_TEST',
        configKey,
        configName,
        configValue: configValue1,
        valueType: 'TEXT',
        statusCode: 'ACTIVE',
        remark: 'Created by smoke test',
        editable: true,
      }),
    });
    const createdItem = created.data.configs.find((item) => item.configKey === configKey);
    assert(createdItem, 'Created config item not returned by API');
    assert(createdItem.configValue === configValue1, 'Created config value mismatch');
    console.log(`  create=ok key=${configKey}`);

    console.log('[5/7] Update config item');
    const updated = await requestJson(`${apiBaseUrl}/system/configuration/config-items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        configCategory: 'SMOKE_TEST',
        configKey,
        configName,
        configValue: configValue2,
        valueType: 'TEXT',
        statusCode: 'ACTIVE',
        remark: 'Updated by smoke test',
        editable: false,
      }),
    });
    const updatedItem = updated.data.configs.find((item) => item.configKey === configKey);
    assert(updatedItem, 'Updated config item not returned by API');
    assert(updatedItem.configValue === configValue2, 'Updated config value mismatch');
    assert(updatedItem.editable === false, 'Updated editable flag mismatch');
    console.log(`  update=ok value=${updatedItem.configValue}`);

    console.log('[6/7] Update notification state');
    const notifications = await requestJson(`${apiBaseUrl}/notifications?page=1&pageSize=5`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert(notifications?.code === 0, 'Notification list query failed');
    const unreadBefore = notifications.data.meta.unreadCount;
    const markAll = await requestJson(`${apiBaseUrl}/notifications/read-all`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    assert(markAll?.code === 0, 'Mark-all notifications failed');
    console.log(`  notifications_unread_before=${unreadBefore}, updated=${markAll.data.updatedCount}`);

    console.log('[7/7] Delete smoke config item through Prisma cleanup');
    const deleted = await prisma.sysConfigItem.deleteMany({
      where: {
        configKey,
      },
    });
    assert(deleted.count === 1, `Expected 1 row deleted, got ${deleted.count}`);
    const remaining = await prisma.sysConfigItem.findUnique({ where: { configKey } });
    assert(!remaining, 'Smoke config item still exists after delete');
    console.log('  delete=ok');

    console.log('SMOKE_OK');
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((error) => {
  console.error('SMOKE_ERR');
  console.error(error && (error.stack || error.message || String(error)));
  process.exitCode = 1;
});
