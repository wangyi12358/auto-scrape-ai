# 任务 02：领域类型与跨上下文消息协议

## 目标

用 TypeScript **固定**三类数据与一类消息的契约，供 Options、DevTools、Sidepanel、AI 层共用。

## 范围

### 1. 配置模型（对应 Options，字段可分期实现）

- API Key / Model（占位类型即可，具体 UI 在任务 04）。
- **Filter**：`includeDomains`（字符串或「当前 tab 域名」占位）、`excludeExtensions`、`methods`。
- **Sampling**：`responseBodyLimit`、`arrayTruncationCount`（或等价命名）。
- **Analysis Presets**：`targetLanguage`、`schemaType`。

### 2. 捕获与精炼

- `CapturedRequest`：从 DevTools HAR 能拿到的最小有用集合（url、method、status、mimeType、headers、body 文本或二进制标记等）。
- `RefinedRequest`：经过 Refiner 后、**准备拼进 Prompt** 的结构（脱敏、截断后的 headers/body 摘要）。

### 3. 消息协议（DevTools ↔ Background ↔ Sidepanel）

- 枚举事件名，例如：`RECORDING_TOGGLED`、`REQUEST_CAPTURED`、`SETTINGS_UPDATED`、`ANALYSIS_STREAM_CHUNK`（具体命名与任务 07 对齐）。
- 每条消息的 `payload` 类型定义；区分**单向通知**与**需应答**的 RPC（尽量少用 RPC）。

## 不在此任务内

- 不实现 Refiner 逻辑（任务 03）。
- 不实现任何 `chrome.*` 调用（仅类型与常量）。

## 验收清单

- [x] 所有类型集中在 `lib/types`（或等价路径），无循环依赖。
- [x] 消息类型与 `CapturedRequest` / `RefinedRequest` 可互相引用且能通过 `tsc`。
- [x] 有一份简短的「字段含义」注释（中英文均可），便于后续写 Prompt。

## 依赖

- [01-project-baseline.md](./01-project-baseline.md)

## 产出物

- `lib/types*.ts`（或拆分多文件）+ 可选 `lib/messages.ts`。
