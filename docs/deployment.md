# 部署说明

## 运行前提

- Node.js >= 22
- pnpm 10
- MySQL 8.x
- 可选：Redis、MinIO

## 环境准备

1. 复制 `.env.example` 为 `.env`
2. 配置数据库、前端 API 地址、JWT 密钥、对象存储参数
3. 执行 `pnpm db:generate`
4. 执行 `pnpm db:migrate:dev` 或发布环境执行 `pnpm db:migrate:deploy`
5. 执行 `pnpm db:seed`

## 本地开发

```bash
corepack pnpm install
corepack pnpm dev
```

根命令会并行启动 `packages/shared`、`packages/ui`、`apps/api`、`apps/web`。

## 发布构建

```bash
corepack pnpm build
```

构建产物：

- API: `apps/api/dist`
- Web: `apps/web/dist`

## 发布建议

- 先执行 `pnpm typecheck`、`pnpm test`
- 浏览器冒烟可执行 `pnpm test:web:e2e`
- 数据库迁移建议先在预发环境验证
- 若启用 MinIO，请确认桶和访问密钥已初始化

## 回滚建议

- 代码回滚以 git 版本为准
- 数据库变更需按 Prisma migration 回滚策略处理，避免手工删表
- 如仅配置异常，优先回滚 `.env` 或部署平台环境变量
