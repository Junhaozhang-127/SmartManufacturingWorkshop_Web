# 实验室管理系统一期工程基线

当前仓库用于实验室管理系统一期 P0/P1 的单仓开发与联调。现阶段已落地的重点能力包括：统一登录鉴权、角色切换、RBAC + 数据范围控制、审批中心、成员转正、成果录入、设备报修、耗材申领、经费申请、考核与晋升，以及角色化首页、通知与系统配置。

## 技术栈

- Web: Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus
- API: NestJS + Prisma + MySQL
- 预留集成: Redis、MinIO

## 仓库结构

```text
apps/
  api/        NestJS API
  web/        Vue 管理后台
packages/
  shared/     共享常量、DTO、接口契约、权限与导航定义
  ui/         UI token 与轻量共享组件
prisma/
  schema.prisma
  seed.ts
docs/
  *.md        需求收尾说明、部署、环境变量、初始化数据、技术债、验收清单
```

## 快速启动

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
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:migrate:dev
corepack pnpm db:seed
corepack pnpm dev
```

默认地址：

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000/api](http://localhost:3000/api)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:web:e2e
pnpm build
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
pnpm db:clear
pnpm db:reset
```

## 默认测试账号

详见 [docs/init-data.md](docs/init-data.md)。

## 交付文档

- [部署说明](docs/deployment.md)
- [环境变量说明](docs/environment.md)
- [初始化数据与权限账号](docs/init-data.md)
- [一期验收清单](docs/acceptance-p0.md)
- [技术债清单](docs/tech-debt.md)

## 说明

- 当前工作区未包含原始 `.docx` 需求文档，本仓交付以 `docs/` 下的同语义 Markdown 为实施基线。
- “项目立项”在一期代码中仍是 `projectId/projectName` 占位关联，尚未形成独立业务模块，已在技术债与验收清单中单列。
