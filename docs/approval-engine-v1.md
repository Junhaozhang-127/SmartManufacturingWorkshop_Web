# 通用审批引擎 V1

## 本次范围

- 新增审批模板、审批实例、审批日志三类核心表。
- 建立 `businessType + businessId` 的统一业务映射。
- 提供统一审批服务，支持发起、通过、驳回、转交、补充说明、撤回、轨迹查询。
- 前端新增统一审批中心和测试审批单页面。
- 首页驾驶舱接入“我的待办 / 我的审批 / 退回记录”聚合数据。

## 数据模型

### 核心表

- `wf_approval_template`
  - 审批模板头，按 `business_type` 唯一定位。
- `wf_approval_template_node`
  - 模板节点，定义节点顺序、节点名称、审批角色。
- `wf_approval_instance`
  - 通用审批实例，保存业务类型、业务主键、当前节点、当前处理角色/用户、状态、表单快照。
- `wf_approval_node_log`
  - 审批动作日志，记录所有动作留痕。

### 演示业务表

- `demo_approval_form`
  - 首版演示单据，用于验证流程引擎端到端可复用。

## 统一服务职责

- `ApprovalService.startApproval`
  - 读取模板，生成审批实例和首节点日志。
- `ApprovalService.approve`
  - 写入通过日志；若有后续节点则推进流程，否则结束实例。
- `ApprovalService.reject`
  - 写入驳回日志并结束实例。
- `ApprovalService.transfer`
  - 校验目标用户角色，写入转交日志并更新当前处理人。
- `ApprovalService.comment`
  - 写入补充说明日志。
- `ApprovalService.withdraw`
  - 申请人撤回并结束实例。
- `ApprovalService.getApprovalDetail`
  - 返回业务快照、轨迹日志、可执行动作。

## 页面与接口

### 页面

- `PUB-04 统一审批中心`
  - 待审批
  - 已审批
  - 退回记录
  - 详情抽屉
  - 审批意见 / 转交人选择 / 轨迹时间线
- `测试审批单`
  - 发起演示审批
  - 查看本人已发起单据
- `驾驶舱`
  - 展示我的待办、我的审批、退回记录聚合数据

### 主要接口

- `GET /api/approval-center`
- `GET /api/approval-center/:id`
- `GET /api/approval-center/:id/transfer-candidates`
- `POST /api/approval-center/:id/approve`
- `POST /api/approval-center/:id/reject`
- `POST /api/approval-center/:id/transfer`
- `POST /api/approval-center/:id/comment`
- `POST /api/approval-center/:id/withdraw`
- `GET /api/dashboard/approval-summary`
- `POST /api/approval-demo-forms`
- `GET /api/approval-demo-forms/mine`

## 权限模型

- 资源：`APPROVAL`
- 动作：
  - `VIEW`
  - `CREATE`
  - `APPROVE`
- 数据范围：
  - 待审批按“当前审批角色 / 当前转交用户”判定
  - 退回记录按申请人本人判定
  - 已审批按本人审批日志判定

## 后续业务模块接入方式

任一业务模块接入审批引擎时，按以下步骤执行：

1. 业务表自身落业务字段，不再重复建设审批表。
2. 在 `wf_approval_template` / `wf_approval_template_node` 中配置对应 `businessType` 模板。
3. 业务单据创建后，调用 `ApprovalService.startApproval`，传入：
   - `businessType`
   - `businessId`
   - `title`
   - `applicantUserId`
   - `applicantRoleCode`
   - `formData`
4. 在 `ApprovalService.loadBusinessSnapshot` / `syncBusinessStatus` 增加该业务类型映射。
5. 前端业务详情页跳转统一审批中心查看轨迹，不再重复开发审批组件。

### 业务示例

- 成员转正：`MEMBER_REGULARIZATION + regularization_id`
- 报修：`REPAIR_ORDER + repair_id`
- 经费：`FUND_REQUEST + fund_request_id`
- 晋升：`PROMOTION_REQUEST + promotion_id`

这些业务后续只补业务表、模板配置和业务状态映射，不再新增独立审批流程表。
