# P0/P1 收尾：角色化首页、个人中心、通知消息、系统配置

## 本次范围

- `PUB-02` 角色化首页驾驶舱
- `PUB-05` 个人中心
- 通知消息已读/未读与关联业务跳转
- `SYS-01` 字典与基础配置页

## 设计原则

- 首页聚合由后端统一提供 `GET /dashboard/home`，前端不再拼装审批、库存、成果等指标。
- 权限继续沿用 `角色 + 资源 + 动作 + 数据范围`，系统配置仅开放给高权限角色。
- 审批流配置仍复用 `wf_approval_template` / `wf_approval_template_node`，不新增模块私有审批表。
- 通知消息统一落 `sys_notification`，审批动作会自动产生通知。

## 新增数据模型

- `sys_notification`
  - 用户级通知消息，支持已读/未读、业务关联、页面跳转参数。
- `sys_dict_type`
  - 字典类型主表。
- `sys_dict_item`
  - 字典项明细表，可配置成果级别、审批角色、通知分类等。
- `sys_config_item`
  - 基础配置项，承载审批 SLA、首页条数、公示默认天数等。

## 新增接口

- `GET /dashboard/home`
- `GET /profile/me`
- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /system/configuration`
- `POST /system/configuration/dictionaries`
- `POST /system/configuration/dictionaries/:dictCode/items`
- `POST /system/configuration/config-items`
- `POST /system/configuration/approval-templates/:businessType`

## 前端页面

- 首页改为后端驱动的角色化仪表盘，展示指标卡、待办、我的申请、通知消息和快捷入口。
- 个人中心整合资料、角色、密码修改、我的申请、我的待办、最近消息。
- 通知消息页支持按已读状态筛选、逐条已读、全部已读和业务跳转。
- 系统配置页支持字典类型、字典项、基础配置、审批流模板的维护。
