# 设备维修报修 P0

## 页面范围

- DEV-02 维修报修工单页

## 目标

- 提供设备报修工单的发起、审批衔接、处理分派、结果回填与确认闭环。
- 通过统一审批中心跟踪维修流程，保留完整状态留痕。

## 页面结构

### 1. 维修报修工单页

- 筛选区：工单号/故障描述/设备关键字、工单状态、紧急程度、处理人。
- 列表区：设备、故障描述、紧急程度、状态、报修人、处理人、当前结果。
- 详情抽屉：
  - 工单信息：设备、设备状态、报修人、处理人、审批实例、费用信息、故障描述、处理结果。
  - 状态留痕：按时间线展示创建、审批、分派、处理、确认等动作。
- 操作：
  - 查看详情
  - 打开审批实例
  - 分派处理人
  - 提交处理结果
  - 报修人确认结果

## 业务流程

1. 用户从业务入口发起设备报修。
2. 报修工单进入统一审批中心。
3. 审批通过后进入处理中，可分派处理人。
4. 处理人提交维修结果与实际费用。
5. 报修人确认结果，工单闭环。

## 接口

- `GET /api/device-repairs`
- `GET /api/device-repairs/:id`
- `POST /api/device-repairs`
- `POST /api/device-repairs/:id/assign`
- `POST /api/device-repairs/:id/resolve`
- `POST /api/device-repairs/:id/confirm`
- `GET /api/dashboard/device-summary`

## 权限

- `DEVICE_REPAIR:VIEW`
- `DEVICE_REPAIR:CREATE`
- `DEVICE_REPAIR:UPDATE`
- `DEVICE_REPAIR:APPROVE`
