# 实验室管理系统一期工程基线

当前仓库提供实验室管理系统一期的工程骨架与权限底座，优先沉淀后续业务模块可复用的能力：前后端 monorepo、统一鉴权、RBAC、数据范围控制、最小组织模型、测试与 CI。

## 技术栈

- Web: Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus
- API: NestJS + Prisma + MySQL
- Reserved: Redis、MinIO

## 目录

```text
apps/
  api/        NestJS API
  web/        Vue 管理后台
packages/
  shared/     共享常量、DTO、响应结构、权限与鉴权类型
  ui/         UI token 与轻量导航类型
prisma/
  schema.prisma
  seed.ts
docs/
  development-conventions.md
  inventory-p0.md
  rbac-data-scope-foundation.md
```

## 启动

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

默认地址：

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000/api](http://localhost:3000/api)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 默认账号

- `teacher01 / 123456`
- `leader01 / 123456`
- `minister01 / 123456`
- `hybrid01 / 123456`
- `member01 / 123456`

说明：

- 登录需输入账号、密码、验证码。
- `member01` 为首次登录示例账号，登录后会被强制修改密码。
- `hybrid01` 同时拥有 `MINISTER` 与 `GROUP_LEADER` 角色，可用于验证角色切换、菜单变化与数据范围差异。

## 当前已实现能力

- 登录接口、当前用户接口、角色切换、修改密码接口
- 开发期简化验证码
- RBAC 权限守卫
- 数据范围注入与示例列表过滤
- 耗材库存、申领与出入库 P0
- 考核评分、晋升资格看板、晋升申请与评审 P0
- 动态菜单、路由守卫、角色化首页驾驶舱空壳

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
```
