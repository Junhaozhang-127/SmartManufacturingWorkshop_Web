# 实验室管理系统一期工程基线

当前仓库只实现一期开发的项目基线与工程骨架，不包含项目、成果、经费、审批中心等具体业务模块。基线目标是把后续阶段会反复复用的工程能力一次搭好：monorepo、前后端框架、统一配置、共享协议、最小数据库模型、联通验证页面、测试与 CI。

## 技术栈

- 前端：Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus
- 后端：NestJS + Prisma + MySQL
- 预留能力：Redis、MinIO
- 工程：pnpm workspace、ESLint、Prettier、Husky、lint-staged、GitHub Actions

## 目录结构

```text
.
├─ apps/
│  ├─ api/                  # NestJS API
│  └─ web/                  # Vue 管理后台
├─ packages/
│  ├─ shared/               # 状态码、分页 DTO、响应结构、权限码、字典 key
│  └─ ui/                   # 前端 UI token 与轻量导航类型
├─ prisma/
│  ├─ schema.prisma         # 统一 Prisma schema
│  └─ seed.ts               # 最小种子数据
├─ docs/
│  └─ development-conventions.md
└─ .github/workflows/ci.yml
```

## 启动方式

1. 启用 `pnpm`

```bash
corepack enable
```

2. 安装依赖

```bash
pnpm install
```

3. 复制环境变量

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. 配置 MySQL 后执行 Prisma

```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
```

5. 启动开发环境

```bash
pnpm dev
```

默认访问地址：

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000/api](http://localhost:3000/api)
- 健康检查: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 环境变量说明

根目录 `.env.example` 已统一列出所有基线变量，按职责分为：

- 运行参数：`APP_PORT`、`API_PREFIX`、`WEB_PORT`
- Web：`VITE_APP_TITLE`、`VITE_API_BASE_URL`
- 数据库：`DATABASE_URL`
- Redis 预留：`REDIS_*`
- MinIO 预留：`MINIO_*`
- 假登录默认密码：`MOCK_LOGIN_PASSWORD`

## 当前内置验证页面

- 假登录页：验证前后端接口、角色与权限返回结构。
- 系统健康检查页：验证应用、数据库、Redis 预留、MinIO 预留。
- 示例列表页：验证 Prisma 最小模型、分页响应和后台右侧抽屉容器。

默认种子账号：

- `teacher01 / 123456`
- `leader01 / 123456`
- `member01 / 123456`

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

## 后续阶段复用约定

- 新业务模块必须先补齐 `packages/shared` 的权限码、字典 key、DTO 与响应模型。
- 审批型业务统一接入审批中心，禁止模块内自行发明流程表。
- 权限统一采用“角色 + 资源 + 动作 + 数据范围”四元模型，不用前端菜单显隐替代后端授权。
- 业务主表默认保留状态字段、审计字段、逻辑删除标记。
- 页面模板优先复用当前布局、面包屑、抽屉容器和统一列表页结构。
