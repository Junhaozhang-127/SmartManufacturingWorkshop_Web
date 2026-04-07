# RBAC 与数据范围底座说明

## 职责边界

- RBAC：判断“能不能做”，即角色是否拥有某个资源动作权限。
- 数据范围：判断“能看到哪些数据”，即在已具备权限前提下可命中的记录集合。

## 共享枚举

共享定义位于 `packages/shared`：

- `RoleCode`
- `ResourceCode`
- `ActionCode`
- `PermissionCode`
- `DataScope`
- `CurrentUserProfile`
- `DataScopeContext`

## 后端实现

- `AuthGuard`：解析 Bearer Token，挂载当前用户上下文。
- `PermissionGuard`：校验权限码，并在首次登录未改密时阻止访问业务接口。
- `DataScopeGuard`：将当前角色对应的数据范围上下文注入请求。
- `RequirePermissions(...)`：声明接口所需 RBAC 权限。
- `RequireDataScope()`：声明接口需要数据范围上下文。

## 数据范围

当前支持四类范围：

- `ALL`
- `DEPT_PROJECT`
- `GROUP_PROJECT`
- `SELF_PARTICIPATE`

本次先在 `examples/members` 上验证，后续业务模块只需要将 `DataScopeContext` 映射为各自查询条件即可。

## 前端实现

- `useAuthz()`：权限判断 composable
- `v-permission`：权限指令
- 路由 `meta.permissions`：页面访问约束
- 菜单过滤：只用于展示层，不替代后端授权
