# 环境变量说明

以下变量以 `.env.example` 为准，部署时至少需要确认这些值：

## API / 应用基础

- `PORT`: API 服务端口
- `API_PREFIX`: API 前缀
- `JWT_SECRET`: 访问令牌签名密钥
- `JWT_EXPIRES_IN`: 访问令牌有效期

## 数据库

- `DATABASE_URL`: Prisma / MySQL 连接串

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

- `REDIS_URL`: 当前为预留项，未作为一期主流程强依赖

## 建议

- 本地开发可直接使用 `.env.example`
- 生产环境不要复用默认 `JWT_SECRET`
- MinIO 未接入时，文件模块仅能使用占位或本地链路
