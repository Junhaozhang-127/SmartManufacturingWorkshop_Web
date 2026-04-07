# 开发约定

## 基线边界

- 一期先建设基础设施与通用能力，不提前落项目、成果、经费、审批中心等具体业务模块。
- 所有业务模块未来都复用统一的响应结构、分页协议、RBAC + 数据范围权限模型、审批中心和审计字段。
- 页面模板统一按 `列表页 = 搜索区 + 操作栏 + 表格 + 分页`、`详情页 = 基础信息 + 标签页 + 侧栏动作`、`审批页 = 申请信息 + 附件 + 轨迹 + 审批表单` 组织。

## Monorepo 约定

- `apps/web`：Vue 3 管理后台。
- `apps/api`：NestJS API。
- `packages/shared`：跨端常量、DTO、响应协议、权限码、字典键。
- `packages/ui`：跨前端可复用的 UI token 与轻量类型。
- `prisma`：统一 schema、migrations、seed。
- `docs`：架构与研发约定。

## 命名与别名

- Web 端别名：`@web/*`。
- API 端别名：`@api/*`。
- 共享包：`@smw/shared`、`@smw/ui`。
- 路由命名使用 `模块.动作`，例如 `system.health`、`system.examples`。
- 权限码命名使用 `RESOURCE:ACTION` 风格，数据范围单独建模，不和菜单显隐混用。

## 后续模块接入规范

- 新业务模块必须先补齐 `shared` 常量、接口 DTO、权限码与字典 key。
- 后端实体默认保留 `status_code`、`created_at`、`updated_at`、`created_by`、`is_deleted`。
- 审批型模块禁止自建流程表，统一复用审批中心与通用审批实例表。
- 对象存储只保存附件元数据与访问路径，业务表不保存大文件二进制。
- 所有新增页面必须补最少一条单元测试或接口测试，并更新 README 或 docs。
