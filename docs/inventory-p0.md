# 耗材库存、申领与出入库 P0

## 本次范围

- `INV-01` 耗材库存页
- `INV-02` 耗材申领与出入库页
- `inv_consumable`
- `inv_inventory_txn`
- `inv_consumable_request`
- 低库存预警与补货触发时间
- 申领审批接入统一审批中心
- 库存流水与申领状态留痕

## P0 闭环

1. 在耗材库存页查看台账、库存余量、预警阈值与补货触发状态。
2. 在申领页发起耗材申领，填写数量、用途与可选项目关联。
3. 申领单写入 `inv_consumable_request`，并调用审批中心创建 `CONSUMABLE_REQUEST` 审批实例。
4. 审批通过后自动执行 `REQUEST_OUTBOUND` 出库流水，扣减 `inv_consumable.current_stock`。
5. 手工入库、手工出库统一写入 `inv_inventory_txn`，形成库存审计轨迹。

## 库存实现策略

- P0 采用“冗余字段 + 流水审计”：
  - `inv_consumable.current_stock` 作为实时余量，便于列表筛选、预警与审批出库校验。
  - `inv_consumable.inventory_status` / `warning_flag` 冗余保存当前库存态势，避免运行时跨字段比较。
  - `inv_inventory_txn` 保存完整交易流水，支持库存审计与问题追溯。
- 后续若需要盘点报表，再在流水基础上扩展聚合口径，不影响当前 P0 闭环。

## 留痕策略

- 申领审批动作：复用 `wf_approval_node_log`
- 申领状态留痕：写入 `inv_consumable_request.status_logs`
- 库存变化留痕：写入 `inv_inventory_txn`
- 低库存补货触发：写入 `inv_consumable.replenishment_triggered_at`

## 接口

- `GET /api/inventory/consumables`
- `GET /api/inventory/consumables/:id`
- `POST /api/inventory/consumables`
- `GET /api/inventory/requests`
- `GET /api/inventory/requests/:id`
- `POST /api/inventory/requests`
- `GET /api/inventory/transactions`
- `POST /api/inventory/transactions/inbound`
- `POST /api/inventory/transactions/outbound`

## 权限

- `INVENTORY:VIEW`
- `INVENTORY:CREATE`
- `INVENTORY:UPDATE`
- `INVENTORY:APPROVE`

说明：

- 页面访问和业务接口统一走 RBAC + 数据范围。
- 审批动作仍由统一审批中心权限控制，不在库存模块重复造审批接口。
