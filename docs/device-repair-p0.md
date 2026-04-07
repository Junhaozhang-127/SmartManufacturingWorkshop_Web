# 设备台账与维修报修 P0

## 本次范围

- DEV-01 设备台账页
- DEV-03 维修报修工单页
- 轻量设备详情抽屉
- `asset_device`
- `asset_device_repair`
- 报修工单接入统一审批中心
- 首页聚合异常设备与待处理报修数量

## 状态设计

### 设备状态

- `IDLE`
- `IN_USE`
- `REPAIRING`
- `SCRAP_PENDING`
- `SCRAPPED`

### 维修工单状态

- `DRAFT`
- `IN_APPROVAL`
- `REJECTED`
- `PROCESSING`
- `RESOLVED`
- `CONFIRMED`
- `CANCELLED`

## P0 闭环

1. 在设备台账页查看设备、责任人、状态和维修历史。
2. 从设备详情或台账列表发起报修。
3. 报修工单写入 `asset_device_repair`，并调用审批中心创建 `REPAIR_ORDER` 审批实例。
4. 审批通过后工单进入 `PROCESSING`。
5. 处理人提交维修结果，工单进入 `RESOLVED`。
6. 报修人确认结果，工单进入 `CONFIRMED`，设备状态恢复。

## 留痕策略

- 设备状态变化写入 `asset_device.status_logs`
- 工单状态变化写入 `asset_device_repair.status_logs`
- 审批动作继续复用 `wf_approval_node_log`
- 每次状态变化同时更新 `status_changed_at`

## 接口

- `GET /api/devices`
- `GET /api/devices/:id`
- `GET /api/device-repairs`
- `GET /api/device-repairs/:id`
- `POST /api/device-repairs`
- `POST /api/device-repairs/:id/assign`
- `POST /api/device-repairs/:id/resolve`
- `POST /api/device-repairs/:id/confirm`
- `GET /api/dashboard/device-summary`

## 权限

- `DEVICE:VIEW`
- `DEVICE:CREATE`
- `DEVICE:UPDATE`
- `DEVICE_REPAIR:VIEW`
- `DEVICE_REPAIR:CREATE`
- `DEVICE_REPAIR:UPDATE`
- `DEVICE_REPAIR:APPROVE`

## 扩展预留

- 工单费用字段预留 `requested_amount / cost_estimate / actual_cost / fund_link_code`
- 详情中保留状态恢复申请与报废申请扩展位
- 设备详情保留维修历史展示位
