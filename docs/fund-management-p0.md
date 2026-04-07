# 经费管理 P0

## 范围

- `FIN-01 经费总览页`
- `FIN-02 费用申请 / 报销页`
- 轻量 `项目详情页` 中的关联经费视图
- `fund_account`
- `fund_application`
- 统一审批中心接入 `FUND_REQUEST`

## 核心规则

- 经费申请创建时先校验 `可用余额 = total_budget - reserved_amount - used_amount`。
- 提交审批后立即预占预算，写入 `fund_account.reserved_amount`。
- 审批通过后从预占转入已用，申请进入 `APPROVED + PENDING_PAYMENT` 语义。
- 审批驳回 / 撤回时释放预占预算。
- 财务支付确认后仅推进支付状态与 `paid_amount`，不再次扣减预算。

## 数据表

### `fund_account`

- 经费账户主表
- 保存总预算、预占、已用、已支付、可用余额所需字段
- 支持项目、组织、负责人关联

### `fund_application`

- 费用申请 / 报销单
- 支持采购、报销、差旅、维修、比赛报名费、维护等费用类型
- 记录附件、审批实例、支付状态、项目关联、业务关联、状态留痕

## 接口

- `GET /api/funds/overview`
- `GET /api/funds/accounts`
- `GET /api/funds/applications`
- `GET /api/funds/applications/:id`
- `POST /api/funds/applications`
- `POST /api/funds/applications/:id/pay`
- `GET /api/funds/projects/:projectId`
- `POST /api/files/upload`
- `GET /api/files/download`

## 联动点

### 与设备维修

- 维修工单保留 `fund_link_code`
- 经费申请支持 `related_business_type = REPAIR_ORDER`
- 项目经费详情页展示关联维修记录

### 与项目预算

- 经费账户、经费申请均保留 `project_id / project_name`
- 项目详情页按 `projectId` 聚合预算卡片与费用申请
- 审批详情快照中返回项目信息，便于审批中心与项目视图互跳

## 附件链路

- P0 采用独立文件模块提供上传 / 下载接口
- 申请单仅保存结构化附件元数据，不在业务表中存二进制
