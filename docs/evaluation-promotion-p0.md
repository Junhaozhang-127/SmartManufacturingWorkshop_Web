# 考核评分、晋升资格与晋升申请 P0 说明

## 范围

- 页面：
  - `EVA-02` 考核评分与结果页
  - `PRO-04` 晋升资格看板
  - `PRO-05` 晋升申请与评审页
- 数据模型：
  - `eval_scheme`
  - `eval_score_record`
  - `prom_application`
  - `prom_appointment`
  - `gov_reward_penalty`

## 实现原则

- 首版规则服务使用可配置结构，不引入复杂规则引擎。
- 考核总分明确拆分为 `autoScore` 与 `manualScore`，总分由两者汇总得到。
- 晋升审批统一复用审批中心 `PROMOTION_REQUEST`，不新增私有流程表。
- 资格校验至少读取：
  - 最近考核结果
  - 成果等级/数量
  - 项目经历数量

## 自动汇总口径

- 成果分：读取考核周期内已认定成果，按成果等级/层级与贡献排名换算分值。
- 项目分：汇总成果、竞赛队伍、经费申请中的项目参与痕迹，按项目数折算。
- 奖惩分：读取 `gov_reward_penalty.score_impact` 直接加减。

## 晋升链路

1. `PRO-04` 看板按规则服务输出可申请/未达标名单。
2. `PRO-05` 发起晋升申请，生成 `prom_application` 并进入审批中心。
3. 审批节点意见回写团队评价、部门审核字段。
4. 审批通过后进入公示阶段，结果写入 `prom_appointment` 与 `prom_application.public_notice_result`。
5. 公示通过时同步成员岗位，并按目标角色补齐 `sys_user_role`。

## 成员档案联动

- 成员详情页展示最近一条考核记录。
- 成员详情页展示最近晋升记录。
- 成员详情页补齐项目经历与奖惩记录回看。
