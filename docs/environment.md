# 环境变量说明

以下变量以 `.env.example` 为准，部署时至少需要确认这些值：

## API / 应用基础

- `APP_PORT`: API 服务端口
- `API_PREFIX`: API 前缀
- `AUTH_TOKEN_SECRET`: 访问令牌签名密钥
- `AUTH_TOKEN_TTL_SECONDS`: 访问令牌有效期（秒）
- `CORS_ALLOWED_ORIGINS`: 允许跨域的来源列表（逗号分隔）
- `CORS_ALLOW_CREDENTIALS`: 是否允许携带凭证（`true`/`false`）
- `HEALTH_EXPOSE_DETAILS`: 健康检查是否暴露详细错误（`true`/`false`，生产环境禁止开启）

## 数据库

- `DATABASE_URL`: Prisma / MySQL 连接串（注意：`.env.example` 中是占位符，必须替换 `<user>/<password>/<database>`）

## 前端

- `VITE_API_BASE_URL`: 前端访问 API 的基础路径

## 文件与对象存储

- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`

## 可选集成

- `REDIS_HOST`: 当前为预留项，未作为一期主流程强依赖

## 建议

- 本地开发请复制 `.env.example` 到 `.env`，并至少补全 `DATABASE_URL` 与 `AUTH_TOKEN_SECRET`
- 生产环境不要复用默认 `AUTH_TOKEN_SECRET`
- MinIO 未接入时，文件模块仅能使用占位或本地链路
