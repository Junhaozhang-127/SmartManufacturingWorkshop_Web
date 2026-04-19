# 初始化数据（生产建议）

## 初始化步骤

```bash
corepack pnpm db:generate
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
```

## 首次管理员账号

本项目不提供任何默认账号/默认密码。首次管理员账号由 `db:seed` 通过环境变量创建：

- `SEED_ADMIN_USERNAME`：必填
- `SEED_ADMIN_PASSWORD`：必填（至少 12 位）
- `SEED_ADMIN_DISPLAY_NAME`：可选
- `SEED_ADMIN_FORCE_PASSWORD_CHANGE`：可选（默认 `true`，首次登录强制改密）

建议在生产环境通过密钥管理系统注入上述变量，不要写入仓库或镜像层。
