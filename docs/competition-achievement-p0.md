# 竞赛管理与成果管理 P0 说明

## 本次范围

- 页面：
  - `COM-01` 赛事库与报名页
  - `ACH-01` 成果列表
  - `ACH-02` 成果录入/编辑页
- 数据模型：
  - `comp_competition`
  - `comp_team`
  - `achv_achievement`
  - `achv_paper`
  - `ip_asset`
  - `achv_contributor`
- 审批接入：
  - `COMPETITION_REGISTRATION`
  - `ACHIEVEMENT_RECOGNITION`

## 实现约束

- 沿用现有 `Vue 3 + Vite + TypeScript + Element Plus`、`NestJS + Prisma` 单仓结构。
- 权限按 `资源 + 动作` 建模，数据范围复用现有 `DataScopeGuard`。
- 审批复用统一审批中心与 `wf_approval_*` 表，不新增私有流程表。
- 成果认定规则先提供 service 层占位逻辑，产出 `recognized_grade` 与 `score_mapping` 的可扩展 placeholder。

## 关键设计

- 赛事是独立生命周期对象，不挂靠在项目备注字段。
- 报名申请以 `comp_team` 为业务主体进入审批中心。
- 成果主表统一承载论文、竞赛成果、软著三类成果，明细分别进入 `achv_paper`、`ip_asset`。
- 贡献成员统一进入 `achv_contributor`，保留 `user_id + contributor_name + contributor_role + contribution_rank`，便于后续考核/晋升回流。
- 数据范围按“申请人/创建人/贡献成员/关联队伍成员命中可见用户集合”落地。

## 当前假设

- 当前仓库未包含用户提及的 7 份原始 `.docx` 需求文档，因此字段 key 与必填规则以现有仓库约定、页面目标和通用业务字段进行近似实现。
- 由于项目模块尚未落库，P0 先使用 `projectId/projectName` 字段保存项目关联占位信息。
- `comp_team` 未额外新增 team member 明细表，P0 以 `member_user_ids + member_names` 存储组队成员快照；若后续需要队伍成员级别审计，再拆 `comp_team_member`。
