# 任务 04：Options 配置页与 Storage

## 目标

用户可在独立 **Options** 页完成全部爬虫相关参数与 AI 基础参数的配置，并持久化到 `browser.storage`（`sync` 或 `local` 二选一并说明理由）。

## 范围

### UI 字段（与任务 02 类型对齐）

- API Key、Model 选择（可先文本框 + 下拉占位）。
- **Include Domains**（多行或逗号分隔 + 正则说明）。
- **Exclude Extensions**（默认列表可编辑）。
- **Methods**（多选）。
- **Response Body Limit**、**Array Truncation**。
- **Target Language**、**Schema Type**。

### 行为

- 加载时从 storage 读取；保存时校验（例如 limit 为正整数）。
- 保存成功后广播 `SETTINGS_UPDATED`（若任务 07 已存在则接入，否则先留 TODO 与类型）。

## 不在此任务内

- Sidepanel 内嵌完整设置页（可选后期；本任务以独立 Options 为主）。
- AI 真实调用（任务 10）。

## 验收清单

- [ ] WXT `options` 入口可打开，表单与 storage 双向同步。
- [ ] 有**默认值**（与产品文档一致：如默认静态后缀列表、默认 GET+POST）。
- [ ] 刷新 Options 页后数据仍在。

## 依赖

- [02-domain-types-and-messages.md](./02-domain-types-and-messages.md)

## 产出物

- `entrypoints/options.*` + 小型 `lib/settings-storage.ts`（读写封装）。
